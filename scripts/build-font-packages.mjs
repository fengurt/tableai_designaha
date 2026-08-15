import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const catalogPath = join(root, "data", "fonts.json");
const sourceDir = join(root, ".tmp", "font-library", "source");
const packageDir = join(root, ".tmp", "font-library", "packages");
const mediaBase = process.env.MEDIA_BASE_URL || "https://media.apuch.art";
const upload = process.argv.includes("--upload");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = (value >>> 8) ^ crcTable[(value ^ byte) & 0xff];
  return (value ^ 0xffffffff) >>> 0;
}

function zipArchive(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const dosTime = 0;
  const dosDate = 0x2821;
  for (const entry of entries) {
    const name = Buffer.from(entry.name.replaceAll("\\", "/"), "utf8");
    const source = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const compressed = deflateRawSync(source, { level: 9 });
    const checksum = crc32(source);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(source.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(source.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + compressed.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function run(command, args) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = spawnSync(command, args, { cwd: root, stdio: "inherit", env: process.env });
    if (result.status === 0) return;
    if (attempt < 3) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 750 * (2 ** (attempt - 1)));
  }
  throw new Error(`command_failed:${command}:${args.join(" ")}`);
}

async function remoteObjectMatches(url, bytes, filename) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    const totalBytes = Number(response.headers.get("content-length"));
    const disposition = response.headers.get("content-disposition") || "";
    return response.ok
      && totalBytes === bytes
      && (response.headers.get("content-type") || "").startsWith("application/zip")
      && disposition.includes(filename);
  } catch {
    return false;
  }
}

function packageReadme(font) {
  return `# ${font.name} / ${font.nameZh || font.name}

This package is a version-pinned IPTrust backup of an open-source font family.

- Font ID: ${font.id}
- Publisher: ${font.source.publisher}
- Official project: ${font.source.projectUrl}
- Source revision: ${font.source.revision}
- License: ${font.license.name} (${font.license.spdx})
- Verified: ${catalog.verifiedAt}

## Contents

- fonts/: original font files from the pinned source revision
- LICENSE.txt: original license text
- PROVENANCE.md: source URLs and SHA-256 audit record
- manifest.json: machine-readable package metadata

Commercial use, embedding, modification and redistribution must follow LICENSE.txt.
字体版权归原作者所有；商业使用、嵌入、修改与再分发须遵守 LICENSE.txt。
`;
}

await rm(packageDir, { recursive: true, force: true });
await mkdir(packageDir, { recursive: true });

let totalPackageBytes = 0;
for (const font of catalog.fonts) {
  if (!font.license?.archive?.licensePath || !font.license?.archive?.provenancePath) throw new Error(`font_package_license:${font.id}`);
  const packageManifest = {
    schemaVersion: 1,
    id: font.id,
    name: font.name,
    nameZh: font.nameZh,
    family: font.family,
    verifiedAt: catalog.verifiedAt,
    source: font.source,
    license: {
      spdx: font.license.spdx,
      name: font.license.name,
      originalUrl: font.license.url,
      pinnedSourceUrl: font.license.archive.pinnedSourceUrl,
      sha256: font.license.archive.licenseSha256,
    },
    files: font.assets.map((asset) => ({
      filename: asset.sourceFilename,
      mimeType: asset.sourceMimeType,
      bytes: asset.sourceBytes,
      sha256: asset.sourceSha256,
      sourceUrl: asset.sourceUrl,
    })),
  };
  const entries = [];
  for (const [index, asset] of font.assets.entries()) {
    const sourcePath = join(sourceDir, `${font.id}-${index}${extname(asset.sourceFilename)}`);
    const source = await readFile(sourcePath);
    if (source.length !== asset.sourceBytes || sha256(source) !== asset.sourceSha256) throw new Error(`font_package_source:${font.id}:${asset.id}`);
    entries.push({ name: `fonts/${asset.sourceFilename}`, data: source });
  }
  entries.push(
    { name: "LICENSE.txt", data: await readFile(join(root, font.license.archive.licensePath)) },
    { name: "PROVENANCE.md", data: await readFile(join(root, font.license.archive.provenancePath)) },
    { name: "README.md", data: packageReadme(font) },
    { name: "manifest.json", data: `${JSON.stringify(packageManifest, null, 2)}\n` },
  );
  const archive = zipArchive(entries);
  const digest = sha256(archive);
  const filename = `${font.id}-font-package.zip`;
  const objectKey = `public/iptrust/font-package-${font.id}/${digest}/${filename}`;
  const mediaUrl = `${mediaBase}/${objectKey}`;
  const packagePath = join(packageDir, filename);
  await writeFile(packagePath, archive);
  font.package = {
    filename,
    mimeType: "application/zip",
    bytes: archive.length,
    sha256: digest,
    objectKey,
    mediaUrl,
    contents: entries.map((entry) => entry.name),
  };
  totalPackageBytes += archive.length;
  if (upload && !(await remoteObjectMatches(mediaUrl, archive.length, filename))) {
    run("npx", ["wrangler", "r2", "object", "put", `iptrust-media-preview/${objectKey}`, "--remote", "--config", "edge/wrangler.toml", "--file", packagePath, "--content-type", "application/zip", "--content-disposition", `attachment; filename=\"${filename}\"`, "--cache-control", "public, max-age=31536000, immutable", "--force"]);
  }
}

catalog.performance.totalPackageBytes = totalPackageBytes;
catalog.performance.packageDelivery = "family-zip-with-license-and-provenance";
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, upload, packages: catalog.fonts.length, totalPackageBytes, packageDir }, null, 2));
