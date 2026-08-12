import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const catalog = JSON.parse(await readFile(join(root, "data", "fonts.json"), "utf8"));

if (catalog.schemaVersion !== 1) throw new Error("font_schema_version");
if (!/^\d{4}-\d{2}-\d{2}$/.test(catalog.verifiedAt || "")) throw new Error("font_verified_at");
if (!Array.isArray(catalog.fonts) || catalog.fonts.length !== 6) throw new Error(`font_count:${catalog.fonts?.length}`);

const ids = new Set();
for (const font of catalog.fonts) {
  if (!font.id || ids.has(font.id)) throw new Error(`font_id:${font.id}`);
  ids.add(font.id);
  if (font.license?.spdx !== "OFL-1.1" || !font.license?.url?.startsWith("https://")) throw new Error(`font_license:${font.id}`);
  if (!font.source?.projectUrl?.startsWith("https://") || !/^[a-f0-9]{40}$/.test(font.source?.revision || "")) throw new Error(`font_source:${font.id}`);
  if (!font.cssStack || !font.sample || !Array.isArray(font.assets) || !font.assets.length) throw new Error(`font_metadata:${font.id}`);
  for (const asset of font.assets) {
    if (asset.mimeType !== "font/woff2" || !/^[a-f0-9]{64}$/.test(asset.sha256 || "")) throw new Error(`font_asset:${font.id}`);
    if (!asset.mediaUrl?.startsWith("https://media.apuch.art/public/iptrust/font-")) throw new Error(`font_media_url:${font.id}`);
  }
}

console.log(JSON.stringify({ ok: true, fonts: catalog.fonts.length, assets: catalog.fonts.flatMap((font) => font.assets).length, verifiedAt: catalog.verifiedAt }, null, 2));
