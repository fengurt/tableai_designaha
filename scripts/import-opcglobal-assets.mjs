import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRoot = process.env.OPCGLOBAL_BRANDKIT || "/Users/af/Public/APUCH/IPTrust/Brandkit/OPC之家kit";
const upload = process.argv.includes("--upload");
const applyD1 = process.argv.includes("--apply-d1");
const apiUpload = process.argv.includes("--api-upload");
const timestamp = new Date().toISOString();
const mediaBase = "https://media.apuch.art";

const definitions = [
  { file: "logo-svg.svg", key: "vector", title: "OPC Global vector logo", role: "logo", access: "public", mimeType: "image/svg+xml", extension: "svg", colorway: "monochrome" },
  { file: "源文件.ai", key: "master-ai", title: "OPC Global master artwork", role: "source", access: "private", mimeType: "application/illustrator", extension: "ai", colorway: "source" },
  { file: "白色/白色.jpg", key: "white-jpg", title: "OPC Global white logo", role: "logo", access: "public", mimeType: "image/jpeg", extension: "jpg", colorway: "white" },
  { file: "白色/白色透明.png", key: "white-transparent", title: "OPC Global white transparent logo", role: "logo", access: "public", mimeType: "image/png", extension: "png", colorway: "white" },
  { file: "蓝色/蓝色.png", key: "primary-blue", title: "OPC Global primary blue logo", role: "hero", access: "public", mimeType: "image/png", extension: "png", colorway: "blue", primary: true },
  { file: "蓝色/蓝色蓝色_白色透明.jpg", key: "blue-jpg", title: "OPC Global blue logo", role: "logo", access: "public", mimeType: "image/jpeg", extension: "jpg", colorway: "blue" },
  { file: "黄色/黄色.png", key: "yellow-transparent", title: "OPC Global yellow transparent logo", role: "logo", access: "public", mimeType: "image/png", extension: "png", colorway: "yellow" },
  { file: "黄色/黄色白色透明.jpg", key: "yellow-jpg", title: "OPC Global yellow logo", role: "logo", access: "public", mimeType: "image/jpeg", extension: "jpg", colorway: "yellow" },
  { file: "黑色/黑色.jpg", key: "black-jpg", title: "OPC Global black logo", role: "logo", access: "public", mimeType: "image/jpeg", extension: "jpg", colorway: "black" },
  { file: "黑色/黑色透明.png", key: "black-transparent", title: "OPC Global black transparent logo", role: "logo", access: "public", mimeType: "image/png", extension: "png", colorway: "black" },
];

function formatSize(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  const unit = Math.min(Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** unit);
  return `${value.toFixed(unit === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unit]}`;
}

function dimensions(buffer, extension) {
  if (extension === "png" && buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (extension === "jpg" && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 8 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2 || offset + length + 2 > buffer.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += length + 2;
    }
  }
  if (extension === "svg") {
    const match = buffer.toString("utf8").match(/viewBox=["'][^"']*?(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)["']/i);
    if (match) return { width: Math.round(Number(match[1])), height: Math.round(Number(match[2])) };
  }
  return {};
}

function verifySignature(buffer, definition) {
  const valid = definition.extension === "png"
    ? buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : definition.extension === "jpg"
      ? buffer[0] === 0xff && buffer[1] === 0xd8
      : definition.extension === "svg"
        ? /<svg[\s>]/i.test(buffer.toString("utf8", 0, Math.min(buffer.length, 4096)))
        : definition.extension === "ai"
          ? buffer.subarray(0, 5).toString("ascii") === "%PDF-" || buffer.toString("ascii", 0, 32).includes("%!PS-Adobe")
          : false;
  if (!valid) throw new Error(`signature_mismatch:${definition.file}:${definition.mimeType}`);
}

function wrangler(args) {
  const result = spawnSync("npx", ["wrangler", ...args], { cwd: root, stdio: "inherit", env: process.env });
  if (result.status !== 0) throw new Error(`wrangler_failed:${args.join(" ")}`);
}

function sql(value) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}

async function uploadViaApi(item) {
  const token = process.env.IPTRUST_SERVICE_API_KEY;
  if (!token) throw new Error("IPTRUST_SERVICE_API_KEY is required for --api-upload");
  const api = process.env.IPTRUST_API_URL || "https://apuch.art/api/v2";
  const data = await readFile(item.localSource);
  const baseHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const current = await fetch(`${api}/assets/${item.id}`, { headers: { Authorization: `Bearer ${token}` } });
  if (current.ok) {
    const existing = await current.json();
    if (existing.sha256 === item.sha256 && existing.bytes === item.bytes) return;
  }
  const started = await fetch(`${api}/assets/uploads`, {
    method: "POST",
    headers: { ...baseHeaders, "Idempotency-Key": `opcglobal-start-${item.sha256}` },
    body: JSON.stringify({
      assetId: item.id,
      ownerType: item.ownerType,
      ownerId: item.ownerId,
      role: item.role,
      title: item.title,
      access: item.access,
      filename: `${item.id}.${item.extension}`,
      mimeType: item.mimeType,
      bytes: item.bytes,
      sha256: item.sha256,
      width: item.width,
      height: item.height,
    }),
  });
  if (!started.ok) throw new Error(`api_start_${item.id}_${started.status}:${await started.text()}`);
  const uploadState = (await started.json()).upload;
  const parts = [];
  for (let offset = 0, partNumber = 1; offset < data.length; offset += uploadState.partSize, partNumber += 1) {
    const chunk = data.subarray(offset, Math.min(offset + uploadState.partSize, data.length));
    const partResponse = await fetch(uploadState.partsUrl.replace("{partNumber}", String(partNumber)), {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Length": String(chunk.length) },
      body: chunk,
    });
    if (!partResponse.ok) throw new Error(`api_part_${item.id}_${partNumber}_${partResponse.status}:${await partResponse.text()}`);
    const part = await partResponse.json();
    parts.push({ partNumber: part.partNumber, etag: part.etag });
  }
  const completed = await fetch(uploadState.completeUrl, {
    method: "POST",
    headers: { ...baseHeaders, "Idempotency-Key": `opcglobal-complete-${item.sha256}` },
    body: JSON.stringify({ parts }),
  });
  if (!completed.ok) throw new Error(`api_complete_${item.id}_${completed.status}:${await completed.text()}`);
  if (item.access === "private") {
    const statusResponse = await fetch(`${api}/assets/${item.id}/status`, {
      method: "POST",
      headers: { ...baseHeaders, "Idempotency-Key": `opcglobal-ready-${item.sha256}` },
      body: JSON.stringify({ status: "ready" }),
    });
    if (!statusResponse.ok) throw new Error(`api_status_${item.id}_${statusResponse.status}:${await statusResponse.text()}`);
  }
}

const imported = [];
for (const definition of definitions) {
  const source = join(sourceRoot, definition.file);
  if (!existsSync(source)) throw new Error(`missing_source:${source}`);
  const [buffer, info] = await Promise.all([readFile(source), stat(source)]);
  verifySignature(buffer, definition);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const image = dimensions(buffer, definition.extension);
  const id = `opcglobal-${definition.role}-${definition.key}-${sha256.slice(0, 12)}`;
  const objectKey = definition.access === "private"
    ? `private/opcglobal/${id}/${sha256}/source.${definition.extension}`
    : `public/opcglobal/${id}/${sha256}/original.${definition.extension}`;
  imported.push({
    id,
    ownerType: "owned-ip",
    ownerId: "opcglobal",
    role: definition.role,
    title: definition.title,
    access: definition.access,
    sourcePath: `OPCGLOBAL/assets/${definition.access === "private" ? "source" : "brand-images"}/${definition.key}.${definition.extension}`,
    sourceFilename: definition.file.split("/").at(-1),
    sha256,
    mimeType: definition.mimeType,
    extension: definition.extension,
    bytes: info.size,
    size: formatSize(info.size),
    width: image.width || null,
    height: image.height || null,
    dimensions: image.width && image.height ? `${image.width} x ${image.height} px` : "",
    objectKey,
    mediaUrl: `${mediaBase}/${objectKey}`,
    legacyUrls: [],
    status: "ready",
    version: 1,
    metadata: { importGroup: "opcglobal-official-logo-set", colorway: definition.colorway, primary: Boolean(definition.primary), originalRelativePath: definition.file },
    localSource: source,
  });
}

if (imported.length !== 10 || new Set(imported.map((item) => item.sha256)).size !== 10) {
  throw new Error(`inventory_mismatch:${imported.length}:${new Set(imported.map((item) => item.sha256)).size}`);
}

if (upload) {
  for (const item of imported) {
    const bucket = item.access === "private" ? "iptrust-media" : "iptrust-media-preview";
    wrangler(["r2", "object", "put", `${bucket}/${item.objectKey}`, "--remote", "--config", "edge/wrangler.toml", "--file", item.localSource, "--content-type", item.mimeType]);
  }
}
if (apiUpload) {
  for (const item of imported) await uploadViaApi(item);
}

const manifestPath = join(root, "data", "assets", "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const importedIds = new Set(imported.map((item) => item.id));
const previousImport = new Set(manifest.items.filter((item) => item.metadata?.importGroup === "opcglobal-official-logo-set").map((item) => item.id));
const cleanItems = manifest.items.filter((item) => !previousImport.has(item.id) && !importedIds.has(item.id));
const publicItems = imported.map(({ localSource, ...item }) => item);
const items = [...cleanItems, ...publicItems].sort((a, b) => a.ownerId.localeCompare(b.ownerId) || a.id.localeCompare(b.id));
const nextManifest = {
  ...manifest,
  generatedAt: timestamp,
  count: items.length,
  sourceCount: items.length,
  totalBytes: items.reduce((sum, item) => sum + Number(item.bytes || 0), 0),
  items,
};
await writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);

const brandItems = items.filter((item) => item.ownerId === "opcglobal");
await writeFile(join(root, "data", "assets", "brands", "opcglobal.json"), `${JSON.stringify({ schemaVersion: 2, slug: "opcglobal", count: brandItems.length, items: brandItems }, null, 2)}\n`);

const primary = publicItems.find((item) => item.metadata?.primary);
const source = publicItems.find((item) => item.access === "private");
await mkdir(join(root, "OPCGLOBAL", "assets", "adobe-assets"), { recursive: true });
await writeFile(join(root, "OPCGLOBAL", "assets", "adobe-assets", "opcglobal-logo.json"), `${JSON.stringify({
  id: "opcglobal-logo-source",
  slug: "opcglobal",
  title: "OPC Global master artwork",
  source: { path: source.sourcePath, format: "AI", bytes: source.bytes, size: source.size },
  preview: { path: primary.sourcePath, format: "PNG", bytes: primary.bytes, size: primary.size, width: primary.width, height: primary.height, dimensions: primary.dimensions },
  hero: { path: primary.sourcePath, format: "PNG", bytes: primary.bytes, size: primary.size, width: primary.width, height: primary.height, dimensions: primary.dimensions },
  exports: [],
  generatedAt: timestamp,
  pipeline: "official-source",
}, null, 2)}\n`);

const statements = ["PRAGMA foreign_keys = ON;"];
for (const item of publicItems) {
  const metadata = JSON.stringify(item.metadata);
  statements.push(`INSERT INTO assets(id,owner_type,owner_id,role,title,access,source_object_key,source_filename,sha256,mime_type,extension,bytes,width,height,status,version,metadata_json,created_at,updated_at) VALUES(${[item.id, item.ownerType, item.ownerId, item.role, item.title, item.access, item.objectKey, item.sourceFilename, item.sha256, item.mimeType, item.extension].map(sql).join(",")},${item.bytes},${item.width ?? "NULL"},${item.height ?? "NULL"},'ready',1,${sql(metadata)},${sql(timestamp)},${sql(timestamp)}) ON CONFLICT(id) DO UPDATE SET role=excluded.role,title=excluded.title,access=excluded.access,source_object_key=excluded.source_object_key,source_filename=excluded.source_filename,sha256=excluded.sha256,mime_type=excluded.mime_type,extension=excluded.extension,bytes=excluded.bytes,width=excluded.width,height=excluded.height,status='ready',metadata_json=excluded.metadata_json,updated_at=excluded.updated_at;`);
  statements.push(`INSERT INTO audit_events(id,actor_id,action,resource_type,resource_id,result,after_json,created_at) VALUES(${sql(randomUUID())},'codex-import','asset.import','asset',${sql(item.id)},'success',${sql(JSON.stringify({ ownerId: item.ownerId, sha256: item.sha256, access: item.access }))},${sql(timestamp)});`);
  statements.push(`INSERT INTO outbox(id,event_type,aggregate_type,aggregate_id,aggregate_version,payload_json,status,next_attempt_at,created_at) VALUES(${sql(randomUUID())},'search.index','asset',${sql(item.id)},1,${sql(JSON.stringify({ entityType: "asset", entityId: item.id }))},'pending',${sql(timestamp)},${sql(timestamp)});`);
}
await mkdir(join(root, ".tmp"), { recursive: true });
const seedPath = join(root, ".tmp", "opcglobal-assets-seed.sql");
await writeFile(seedPath, `${statements.join("\n")}\n`);
if (applyD1) wrangler(["d1", "execute", "iptrust-library", "--remote", "--config", "edge/wrangler.toml", "--file", seedPath]);

console.log(JSON.stringify({
  ok: true,
  imported: imported.length,
  public: imported.filter((item) => item.access === "public").length,
  private: imported.filter((item) => item.access === "private").length,
  manifestCount: nextManifest.count,
  opcglobalCount: brandItems.length,
  uploaded: upload,
  apiUploaded: apiUpload,
  d1Applied: applyD1,
  primaryLogo: primary.mediaUrl,
}, null, 2));
