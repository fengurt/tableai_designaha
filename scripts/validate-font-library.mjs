import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const catalog = JSON.parse(await readFile(join(root, "data", "fonts.json"), "utf8"));
const googleDirectory = JSON.parse(await readFile(join(root, "data", "google-fonts-directory.json"), "utf8"));
const approvedCommercialLicenses = new Set(["OFL-1.1", "Apache-2.0", "UFL-1.0"]);
const approvedProjectHosts = new Set(["fonts.google.com", "github.com"]);
const approvedLicenseHosts = new Set(["github.com", "openfontlicense.org", "www.apache.org", "ubuntu.com"]);

if (catalog.schemaVersion !== 1) throw new Error("font_schema_version");
if (!/^\d{4}-\d{2}-\d{2}$/.test(catalog.verifiedAt || "")) throw new Error("font_verified_at");
if (!Array.isArray(catalog.fonts) || catalog.fonts.length < 20) throw new Error(`font_count:${catalog.fonts?.length}`);
if (!Array.isArray(catalog.directories) || catalog.directories.length < 4) throw new Error(`font_directories:${catalog.directories?.length}`);

const ids = new Set();
const commercialLicenses = new Set((catalog.licenseTypes || []).filter((license) => license.commercial).map((license) => license.spdx));
if (catalog.fonts.length < 50) throw new Error("font_curated_count");
for (const font of catalog.fonts) {
  if (!font.id || ids.has(font.id)) throw new Error(`font_id:${font.id}`);
  ids.add(font.id);
  if (!approvedCommercialLicenses.has(font.license?.spdx) || !commercialLicenses.has(font.license?.spdx)) throw new Error(`font_license:${font.id}`);
  const licenseUrl = new URL(font.license?.url || "https://invalid.local");
  if (licenseUrl.protocol !== "https:" || !approvedLicenseHosts.has(licenseUrl.hostname)) throw new Error(`font_license_source:${font.id}`);
  const projectUrl = new URL(font.source?.projectUrl || "https://invalid.local");
  if (projectUrl.protocol !== "https:" || !approvedProjectHosts.has(projectUrl.hostname) || !/^[a-f0-9]{40}$/.test(font.source?.revision || "")) throw new Error(`font_source:${font.id}`);
  if (!font.cssStack || !font.sample || !font.categoryKey || !Array.isArray(font.assets) || !font.assets.length) throw new Error(`font_metadata:${font.id}`);
  for (const asset of font.assets) {
    if (asset.mimeType !== "font/woff2" || !/^[a-f0-9]{64}$/.test(asset.sha256 || "")) throw new Error(`font_asset:${font.id}`);
    if (!/^[a-f0-9]{64}$/.test(asset.sourceSha256 || "") || !asset.sourceUrl?.startsWith("https://")) throw new Error(`font_asset_source:${font.id}`);
    if (!asset.mediaUrl?.startsWith("https://media.apuch.art/public/iptrust/font-")) throw new Error(`font_media_url:${font.id}`);
  }
}
const fontAssets = catalog.fonts.flatMap((font) => font.assets);
const totalDemoBytes = fontAssets.reduce((sum, asset) => sum + asset.bytes, 0);
const largestDemoBytes = Math.max(...fontAssets.map((asset) => asset.bytes));
if (totalDemoBytes !== catalog.performance?.totalDemoBytes || largestDemoBytes !== catalog.performance?.largestDemoBytes) throw new Error("font_performance_stats");
if (totalDemoBytes > 1_500_000 || largestDemoBytes > 80_000) throw new Error("font_performance_budget");
if (catalog.fonts.filter((font) => font.popularity && font.popularity <= 100).length < 30) throw new Error("font_popular_coverage");

if (googleDirectory.schemaVersion !== 1 || googleDirectory.stats?.verifiedFamilies < 1000) throw new Error("google_font_directory_count");
if (googleDirectory.families.length !== googleDirectory.stats.verifiedFamilies) throw new Error("google_font_directory_stats");
const directoryIds = new Set();
for (const font of googleDirectory.families) {
  if (!font.id || directoryIds.has(font.id)) throw new Error(`google_font_id:${font.id}`);
  directoryIds.add(font.id);
  if (!font.family || !Array.isArray(font.groups) || !Array.isArray(font.subsets)) throw new Error(`google_font_metadata:${font.id}`);
  if (!["OFL-1.1", "Apache-2.0", "UFL-1.0"].includes(font.license?.spdx) || !font.license?.url?.startsWith("https://github.com/google/fonts/")) throw new Error(`google_font_license:${font.id}`);
  if (!font.source?.projectUrl?.startsWith("https://fonts.google.com/specimen/")) throw new Error(`google_font_source:${font.id}`);
}

console.log(JSON.stringify({
  ok: true,
  selfHostedFonts: catalog.fonts.length,
  assets: fontAssets.length,
  totalDemoBytes,
  largestDemoBytes,
  officialIndexedFonts: googleDirectory.stats.verifiedFamilies,
  excludedOfficialFonts: googleDirectory.stats.excludedFamilies,
  verifiedAt: googleDirectory.verifiedAt,
}, null, 2));
