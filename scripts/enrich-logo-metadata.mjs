import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(root, "data", "assets", "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

function hasAlpha(buffer) {
  return buffer.length >= 26 && buffer.toString("ascii", 1, 4) === "PNG"
    && ([4, 6].includes(buffer[25]) || buffer.includes(Buffer.from("tRNS")));
}

for (const item of manifest.items) {
  const isLogo = item.role === "logo" || /logo/i.test(`${item.title} ${item.sourceFilename}`);
  if (!isLogo) continue;
  let buffer;
  if (item.sourcePath && existsSync(join(root, item.sourcePath))) buffer = await readFile(join(root, item.sourcePath));
  else if (item.mimeType === "image/png" && item.mediaUrl) {
    const response = await fetch(item.mediaUrl);
    if (!response.ok) throw new Error(`logo_fetch_failed:${item.id}:${response.status}`);
    buffer = Buffer.from(await response.arrayBuffer());
  }
  item.backgroundTransparent = item.mimeType === "image/png" && Boolean(buffer && hasAlpha(buffer));
  item.documentLogo = item.backgroundTransparent && item.bytes <= 512 * 1024 && Math.max(item.width || 0, item.height || 0) <= 1280;
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
const brandsDir = join(root, "data", "assets", "brands");
await mkdir(brandsDir, { recursive: true });
for (const ownerId of new Set(manifest.items.map((item) => item.ownerId))) {
  const items = manifest.items.filter((item) => item.ownerId === ownerId);
  await writeFile(join(brandsDir, `${ownerId}.json`), `${JSON.stringify({ schemaVersion: manifest.schemaVersion, slug: ownerId, count: items.length, items }, null, 2)}\n`);
}

console.log(JSON.stringify({
  logos: manifest.items.filter((item) => item.role === "logo").length,
  transparent: manifest.items.filter((item) => item.backgroundTransparent).length,
  documentLogos: manifest.items.filter((item) => item.documentLogo).length,
}));
