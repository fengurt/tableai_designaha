import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const brands = JSON.parse(await readFile(join(root, "config", "brands.json"), "utf8"));
const assets = JSON.parse(await readFile(join(root, "data", "assets", "manifest.json"), "utf8"));
const libraryNames = ["organizations", "cases", "reports", "datasets"];
const brandsOnly = process.argv.includes("--brands-only");
const q = (value) => `'${String(value ?? "").replaceAll("'", "''")}'`;
const timestamp = new Date().toISOString();
const statements = ["PRAGMA foreign_keys = ON;"];

function outbox(id, eventType, aggregateType, aggregateId, version, payload) {
  statements.push(`INSERT INTO outbox(id,event_type,aggregate_type,aggregate_id,aggregate_version,payload_json,status,next_attempt_at,created_at) VALUES(${q(id)},${q(eventType)},${q(aggregateType)},${q(aggregateId)},${Number(version || 1)},${q(JSON.stringify(payload))},'pending',${q(timestamp)},${q(timestamp)}) ON CONFLICT(id) DO NOTHING;`);
}

function runtimeBrandPayload(payload) {
  return {
    ...payload,
    history: (payload.history || []).slice(0, 3).map(({ sourcePaths, ...entry }) => entry),
    guides: (payload.guides || []).map(({ text, html, ...guide }) => guide),
    tokens: (payload.tokens || []).map(({ text, ...token }) => token),
    assetManifest: undefined,
  };
}

for (const brand of brands) {
  const path = join(root, "site", "api", "brands", `${brand.slug}.json`);
  if (!existsSync(path)) throw new Error(`brand_payload_missing:${brand.slug}`);
  const payload = runtimeBrandPayload(JSON.parse(await readFile(path, "utf8")));
  statements.push(`INSERT INTO brand_records(slug,payload_json,version,created_at,updated_at) VALUES(${q(brand.slug)},${q(JSON.stringify(payload))},1,${q(timestamp)},${q(timestamp)}) ON CONFLICT(slug) DO UPDATE SET payload_json=excluded.payload_json,updated_at=excluded.updated_at WHERE brand_records.version<=excluded.version;`);
  outbox(`seed-search-brand-v2-${brand.slug}`, "search.index", "brand", brand.slug, 1, { entityType: "brand", entityId: brand.slug });
}

for (const name of brandsOnly ? [] : libraryNames) {
  const path = join(root, "data", "library", `${name}.json`);
  if (!existsSync(path)) continue;
  const snapshot = JSON.parse(await readFile(path, "utf8"));
  const items = Array.isArray(snapshot) ? snapshot : snapshot.items || [];
  const entityType = name === "organizations" ? "organization" : name.replace(/s$/, "");
  for (const item of items) {
    if (!item.id) continue;
    outbox(`seed-search-${entityType}-${item.id}`, "search.index", entityType, item.id, 1, { entityType, entityId: item.id });
  }
}

for (const asset of brandsOnly ? [] : assets.items) {
  outbox(`seed-search-asset-${asset.id}`, "search.index", "asset", asset.id, 1, { entityType: "asset", entityId: asset.id });
  if (asset.access === "private") outbox(`seed-process-asset-${asset.id}`, "asset.process", "asset", asset.id, 1, { assetId: asset.id, ownerId: asset.ownerId, objectKey: asset.objectKey, access: asset.access, mimeType: asset.mimeType, extension: asset.extension, expectedSha256: asset.sha256 });
}

const tempDir = join(root, ".tmp");
await mkdir(tempDir, { recursive: true });
const seedPrefix = brandsOnly ? "platform-brand-seed" : "platform-seed";
for (const name of await readdir(tempDir)) {
  if (new RegExp(`^${seedPrefix}-\\d+\\.sql$`).test(name)) await rm(join(tempDir, name));
}
const chunks = [];
for (let index = 1; index < statements.length; index += 10) chunks.push(["PRAGMA foreign_keys = ON;", ...statements.slice(index, index + 10)]);
for (const [index, chunk] of chunks.entries()) await writeFile(join(tempDir, `${seedPrefix}-${String(index + 1).padStart(3, "0")}.sql`), `${chunk.join("\n")}\n`);
console.log(JSON.stringify({ mode: brandsOnly ? "brands" : "full", brands: brands.length, assets: brandsOnly ? 0 : assets.count, statements: statements.length, chunks: chunks.length }, null, 2));
