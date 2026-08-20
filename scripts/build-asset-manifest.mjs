import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(root, "data", "assets");
const brands = JSON.parse(await readFile(join(root, "config", "brands.json"), "utf8"));
const mediaBase = process.env.MEDIA_BASE_URL || "https://media.apuch.art";
const extensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg", ".ai", ".psd", ".pdf"]);
const privateExtensions = new Set([".ai", ".psd", ".pdf"]);
const mimeTypes = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml", ".ai": "application/illustrator", ".psd": "application/vnd.adobe.photoshop", ".pdf": "application/pdf" };
const previousManifest = existsSync(join(outputDir, "manifest.json"))
  ? JSON.parse(await readFile(join(outputDir, "manifest.json"), "utf8"))
  : { items: [] };
const previousBySource = new Map(previousManifest.items.map((item) => [item.sourcePath, item]));

async function walk(folder) {
  if (!existsSync(folder)) return [];
  const files = [];
  for (const name of await readdir(folder)) {
    if (name === ".DS_Store" || name.endsWith(".zip")) continue;
    const path = join(folder, name);
    const info = await stat(path);
    if (info.isDirectory()) files.push(...await walk(path));
    else if (extensions.has(extname(name).toLowerCase())) files.push(path);
  }
  return files;
}

function jpegDimensions(buffer) {
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2 || offset + length + 2 > buffer.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    offset += length + 2;
  }
  return {};
}

function dimensions(buffer, extension) {
  if (extension === ".png" && buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if ([".jpg", ".jpeg"].includes(extension)) return jpegDimensions(buffer);
  return {};
}

function pngHasAlpha(buffer, extension) {
  return extension === ".png" && buffer.length >= 26 && ([4, 6].includes(buffer[25]) || buffer.includes(Buffer.from("tRNS")));
}

function slug(value) {
  return String(value).normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "asset";
}

function roleFor(path) {
  const text = path.toLowerCase();
  if (text.includes("brand-hero")) return "hero";
  if (text.includes("logo")) return "logo";
  if (privateExtensions.has(extname(path).toLowerCase())) return "source";
  if (text.includes("contact")) return "contact";
  return "image";
}

function formatSize(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  const unit = Math.min(Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** unit)).toFixed(unit && bytes / (1024 ** unit) < 10 ? 2 : unit ? 1 : 0)} ${units[unit]}`;
}

async function legacyAliases() {
  const map = new Map();
  for (const brand of brands) {
    const path = join(root, "site", "api", "brands", `${brand.slug}.json`);
    if (!existsSync(path)) continue;
    const payload = JSON.parse(await readFile(path, "utf8"));
    for (const image of payload.images || []) {
      if (image.path && image.sitePath && !/^https?:/i.test(image.sitePath)) map.set(image.path, `/${String(image.sitePath).replace(/^\//, "")}`);
    }
    for (const adobe of payload.adobeAssets || []) {
      if (adobe.source?.path && adobe.source?.sitePath) map.set(adobe.source.path, `/${String(adobe.source.sitePath).replace(/^\//, "")}`);
    }
  }
  map.set("assets/contact/wecom-qr.png", "/assets/contact/wecom-qr.png");
  return map;
}

const aliases = await legacyAliases();
const candidates = [];
for (const brand of brands) {
  for (const path of await walk(join(root, brand.folder))) candidates.push({ path, ownerId: brand.slug });
}
for (const path of await walk(join(root, "assets", "contact"))) candidates.push({ path, ownerId: "iptrust" });

const seen = new Set();
const items = [];
for (const candidate of candidates.sort((a, b) => a.path.localeCompare(b.path))) {
  const sourcePath = relative(root, candidate.path).replaceAll("\\", "/");
  if (seen.has(sourcePath)) continue;
  seen.add(sourcePath);
  const extensionWithDot = extname(sourcePath).toLowerCase();
  const extension = extensionWithDot.slice(1) === "jpeg" ? "jpg" : extensionWithDot.slice(1);
  const buffer = await readFile(candidate.path);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const role = roleFor(sourcePath);
  const access = privateExtensions.has(extensionWithDot) ? "private" : "public";
  const stem = sourcePath.split("/").at(-1).replace(/\.[^.]+$/, "");
  const id = `${candidate.ownerId}-${role}-${slug(stem).slice(0, 36)}-${sha256.slice(0, 12)}`;
  const objectKey = access === "private"
    ? `private/${candidate.ownerId}/${id}/${sha256}/source.${extension}`
    : `public/${candidate.ownerId}/${id}/${sha256}/original.${extension}`;
  const info = dimensions(buffer, extensionWithDot);
  const legacy = aliases.get(sourcePath);
  const previous = previousBySource.get(sourcePath);
  const backgroundTransparent = pngHasAlpha(buffer, extensionWithDot);
  const documentLogo = role === "logo" && backgroundTransparent && buffer.length <= 512 * 1024 && Math.max(info.width || 0, info.height || 0) <= 1280;
  items.push({
    id,
    ownerType: "owned-ip",
    ownerId: candidate.ownerId,
    role,
    title: stem.replace(/[-_]+/g, " "),
    access,
    sourcePath,
    sourceFilename: sourcePath.split("/").at(-1),
    sha256,
    mimeType: mimeTypes[extensionWithDot] || "application/octet-stream",
    extension,
    bytes: buffer.length,
    size: formatSize(buffer.length),
    width: info.width || null,
    height: info.height || null,
    dimensions: info.width && info.height ? `${info.width} x ${info.height} px` : "",
    backgroundTransparent,
    documentLogo,
    objectKey,
    mediaUrl: `${mediaBase}/${objectKey}`,
    legacyUrls: previous?.legacyUrls || (legacy ? [legacy] : []),
    status: access === "public" ? "ready" : "processing",
    version: 1,
    ...(previous?.metadata ? { metadata: previous.metadata } : {}),
  });
}

for (const item of previousManifest.items) {
  if (!seen.has(item.sourcePath)) items.push(item);
}
items.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));

const totalBytes = items.reduce((sum, item) => sum + item.bytes, 0);
const manifest = { schemaVersion: 2, generatedAt: new Date().toISOString(), mediaBase, count: items.length, totalBytes, sourceCount: items.length, items };
await mkdir(join(outputDir, "brands"), { recursive: true });
await writeFile(join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
for (const brand of brands) {
  const brandItems = items.filter((item) => item.ownerId === brand.slug);
  await writeFile(join(outputDir, "brands", `${brand.slug}.json`), `${JSON.stringify({ schemaVersion: 2, slug: brand.slug, count: brandItems.length, items: brandItems }, null, 2)}\n`);
}

if (manifest.count < seen.size || manifest.sourceCount !== manifest.count) throw new Error(`asset_inventory_mismatch:${manifest.count}:${manifest.sourceCount}:${seen.size}`);
console.log(JSON.stringify({ ok: true, count: manifest.count, bytes: manifest.totalBytes, mb: Number((manifest.totalBytes / 1e6).toFixed(2)), public: items.filter((item) => item.access === "public").length, private: items.filter((item) => item.access === "private").length }, null, 2));
