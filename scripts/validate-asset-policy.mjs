import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const forbidden = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".ai", ".psd", ".pdf"]);
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const trackedBinaries = tracked.filter((path) => existsSync(path) && forbidden.has(extname(path).toLowerCase()));
if (trackedBinaries.length) throw new Error(`Design binaries must live in R2:\n${trackedBinaries.join("\n")}`);

const manifest = JSON.parse(readFileSync("data/assets/manifest.json", "utf8"));
if (!Array.isArray(manifest.items) || manifest.items.length < 1) throw new Error("Asset manifest is empty");
const ids = new Set();
const keys = new Set();
for (const item of manifest.items) {
  if (!item.id || !item.sha256 || !item.objectKey || !item.mediaUrl) throw new Error(`Incomplete manifest item: ${item.id || "unknown"}`);
  if (!/^[a-f0-9]{64}$/.test(item.sha256)) throw new Error(`Invalid SHA-256: ${item.id}`);
  if (!item.objectKey.includes(item.sha256)) throw new Error(`Object key is not content-addressed: ${item.id}`);
  if (ids.has(item.id) || keys.has(item.objectKey)) throw new Error(`Duplicate asset identity: ${item.id}`);
  ids.add(item.id);
  keys.add(item.objectKey);
  if (item.documentLogo && (item.mimeType !== "image/png" || !item.backgroundTransparent || item.bytes > 512 * 1024 || Math.max(item.width || 0, item.height || 0) > 1280)) {
    throw new Error(`Invalid document logo: ${item.id}`);
  }
}
if (!manifest.items.some((item) => item.ownerId === "sidera" && item.documentLogo)) throw new Error("Missing tiansight document logo");

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const siteBinaries = walk("site").filter((path) => forbidden.has(extname(path).toLowerCase()));
if (siteBinaries.length) throw new Error(`Built site contains design binaries:\n${siteBinaries.join("\n")}`);
console.log(`Asset policy valid: ${manifest.items.length} content-addressed objects, 0 tracked or built binaries.`);
