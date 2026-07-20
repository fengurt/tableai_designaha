import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const brands = JSON.parse(await readFile(join(root, "config", "brands.json"), "utf8"));
const ipSystem = JSON.parse(await readFile(join(root, "config", "ip-system.json"), "utf8"));
const assets = JSON.parse(await readFile(join(root, "data", "assets", "manifest.json"), "utf8"));
const libraryNames = ["organizations", "cases", "reports", "datasets"];
const brandsOnly = process.argv.includes("--brands-only");
const q = (value) => `'${String(value ?? "").replaceAll("'", "''")}'`;
const timestamp = new Date().toISOString();
const statements = ["PRAGMA foreign_keys = ON;"];

function outbox(id, eventType, aggregateType, aggregateId, version, payload) {
  statements.push(`INSERT INTO outbox(id,event_type,aggregate_type,aggregate_id,aggregate_version,payload_json,status,next_attempt_at,created_at) VALUES(${q(id)},${q(eventType)},${q(aggregateType)},${q(aggregateId)},${Number(version || 1)},${q(JSON.stringify(payload))},'pending',${q(timestamp)},${q(timestamp)}) ON CONFLICT(id) DO NOTHING;`);
}

function seedRevision(entityType, entityId, snapshot, sourceUrl) {
  statements.push(`INSERT INTO library_revisions(entity_type,entity_id,action,snapshot_json,actor,source_url,created_at) SELECT ${q(entityType)},${q(entityId)},'create',${q(JSON.stringify(snapshot))},'git-sync',${q(sourceUrl)},${q(timestamp)} WHERE NOT EXISTS(SELECT 1 FROM library_revisions WHERE entity_type=${q(entityType)} AND entity_id=${q(entityId)});`);
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

for (const [dimension, terms] of [
  ["industry", ipSystem.taxonomy.industries],
  ["ip_type", ipSystem.taxonomy.ipTypes],
  ["application_type", ipSystem.taxonomy.applicationTypes],
]) {
  for (const [index, term] of terms.entries()) {
    statements.push(`INSERT INTO taxonomy_terms(id,dimension,slug,labels_json,sort_order,active,created_at,updated_at) VALUES(${q(term.id)},${q(dimension)},${q(term.id)},${q(JSON.stringify({ zh: term.zh, en: term.en }))},${index + 1},1,${q(timestamp)},${q(timestamp)}) ON CONFLICT(id) DO UPDATE SET labels_json=excluded.labels_json,sort_order=excluded.sort_order,active=1,updated_at=excluded.updated_at;`);
  }
}

function seedIpRecord({ slug, recordClass, ipType, primaryIndustry, industries, names, mainLanguage, lifecycleStatus = "active", guidelineMode = "independent", sourceUrl = "", sourcePublisher = "", verificationStatus = "internal", payload = {} }) {
  const normalizedIndustries = [...new Set([primaryIndustry, ...(industries || [])])];
  const snapshot = { slug, recordClass, ipType, primaryIndustry, industries: normalizedIndustries, names, mainLanguage, lifecycleStatus, guidelineMode, sourceUrl, sourcePublisher, verificationStatus, payload, version: 1, updatedAt: timestamp };
  statements.push(`INSERT INTO ip_records(slug,record_class,ip_type,primary_industry,names_json,main_language,lifecycle_status,guideline_mode,source_url,source_publisher,verification_status,payload_json,version,created_at,updated_at) VALUES(${q(slug)},${q(recordClass)},${q(ipType)},${q(primaryIndustry)},${q(JSON.stringify(names))},${q(mainLanguage)},${q(lifecycleStatus)},${q(guidelineMode)},${q(sourceUrl)},${q(sourcePublisher)},${q(verificationStatus)},${q(JSON.stringify(payload))},1,${q(timestamp)},${q(timestamp)}) ON CONFLICT(slug) DO UPDATE SET record_class=excluded.record_class,ip_type=CASE WHEN ip_records.version<=1 THEN excluded.ip_type ELSE ip_records.ip_type END,primary_industry=CASE WHEN ip_records.version<=1 THEN excluded.primary_industry ELSE ip_records.primary_industry END,names_json=CASE WHEN ip_records.version<=1 THEN excluded.names_json ELSE ip_records.names_json END,main_language=CASE WHEN ip_records.version<=1 THEN excluded.main_language ELSE ip_records.main_language END,lifecycle_status=CASE WHEN ip_records.version<=1 THEN excluded.lifecycle_status ELSE ip_records.lifecycle_status END,guideline_mode=CASE WHEN ip_records.version<=1 THEN excluded.guideline_mode ELSE ip_records.guideline_mode END,source_url=excluded.source_url,source_publisher=excluded.source_publisher,verification_status=excluded.verification_status,payload_json=CASE WHEN ip_records.version<=1 THEN excluded.payload_json ELSE ip_records.payload_json END,updated_at=excluded.updated_at;`);
  for (const industry of normalizedIndustries) {
    statements.push(`INSERT INTO ip_taxonomy(ip_slug,term_id,is_primary,created_at) VALUES(${q(slug)},${q(industry)},${industry === primaryIndustry ? 1 : 0},${q(timestamp)}) ON CONFLICT(ip_slug,term_id) DO UPDATE SET is_primary=CASE WHEN (SELECT version FROM ip_records WHERE slug=excluded.ip_slug)<=1 THEN excluded.is_primary ELSE ip_taxonomy.is_primary END;`);
  }
  statements.push(`INSERT INTO ip_taxonomy(ip_slug,term_id,is_primary,created_at) VALUES(${q(slug)},${q(ipType)},1,${q(timestamp)}) ON CONFLICT(ip_slug,term_id) DO NOTHING;`);
  seedRevision("ip", slug, snapshot, `https://apuch.art/ip?ip=${slug}`);
  outbox(`seed-search-ip-v1-${slug}`, "search.index", "ip", slug, 1, { entityType: "ip", entityId: slug });
}

for (const brand of brands) {
  const path = join(root, "site", "api", "brands", `${brand.slug}.json`);
  if (!existsSync(path)) throw new Error(`brand_payload_missing:${brand.slug}`);
  const payload = runtimeBrandPayload(JSON.parse(await readFile(path, "utf8")));
  statements.push(`INSERT INTO brand_records(slug,payload_json,version,created_at,updated_at) VALUES(${q(brand.slug)},${q(JSON.stringify(payload))},1,${q(timestamp)},${q(timestamp)}) ON CONFLICT(slug) DO UPDATE SET payload_json=excluded.payload_json,updated_at=excluded.updated_at WHERE brand_records.version<=excluded.version;`);
  const classification = ipSystem.owned[brand.slug];
  if (!classification) throw new Error(`ip_classification_missing:${brand.slug}`);
  seedIpRecord({
    slug: brand.slug,
    recordClass: "owned",
    ipType: classification.ipType,
    primaryIndustry: classification.primaryIndustry,
    industries: classification.industries,
    names: { zh: payload.display?.zh?.name || brand.nativeName || brand.name, en: payload.display?.en?.name || brand.name },
    mainLanguage: brand.mainLanguage || "zh",
    guidelineMode: classification.guidelineMode || "independent",
    payload,
  });
}

for (const reference of ipSystem.references) {
  seedIpRecord({
    slug: reference.slug,
    recordClass: "reference",
    ipType: reference.ipType,
    primaryIndustry: reference.primaryIndustry,
    industries: reference.industries,
    names: reference.names,
    mainLanguage: reference.mainLanguage,
    sourceUrl: reference.sourceUrl,
    sourcePublisher: reference.sourcePublisher,
    verificationStatus: reference.verificationStatus,
    payload: reference,
  });
}

for (const relation of ipSystem.relationships) {
  statements.push(`INSERT INTO ip_relationships(id,parent_ip_slug,child_ip_slug,relation_type,is_primary,metadata_json,version,created_at,updated_at) VALUES(${q(relation.id)},${q(relation.parent)},${q(relation.child)},${q(relation.type)},${relation.primary ? 1 : 0},${q(JSON.stringify(relation.metadata || {}))},1,${q(timestamp)},${q(timestamp)}) ON CONFLICT(id) DO UPDATE SET parent_ip_slug=excluded.parent_ip_slug,child_ip_slug=excluded.child_ip_slug,relation_type=excluded.relation_type,is_primary=excluded.is_primary,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at WHERE ip_relationships.version<=1;`);
  seedRevision("ip-relation", relation.id, { id: relation.id, parent: relation.parent, child: relation.child, type: relation.type, primary: Boolean(relation.primary), metadata: relation.metadata || {}, version: 1 }, "https://apuch.art/directory");
}

for (const application of ipSystem.applications) {
  statements.push(`INSERT INTO ip_applications(slug,application_type,names_json,main_language,lifecycle_status,guideline_mode,description_json,business_json,location_json,overrides_json,official_website,payload_json,version,created_at,updated_at) VALUES(${q(application.slug)},${q(application.applicationType)},${q(JSON.stringify(application.names))},${q(application.mainLanguage || "zh")},${q(application.lifecycleStatus || "active")},${q(application.guidelineMode || "inherit")},${q(JSON.stringify(application.description || {}))},${q(JSON.stringify(application.business || {}))},${q(JSON.stringify(application.location || {}))},${q(JSON.stringify(application.overrides || {}))},${q(application.officialWebsite || "")},${q(JSON.stringify(application))},1,${q(timestamp)},${q(timestamp)}) ON CONFLICT(slug) DO UPDATE SET payload_json=excluded.payload_json,updated_at=excluded.updated_at WHERE ip_applications.version<=1;`);
  for (const link of application.links || []) statements.push(`INSERT INTO application_ip_links(application_slug,ip_slug,role,created_at) VALUES(${q(application.slug)},${q(link.ip)},${q(link.role)},${q(timestamp)}) ON CONFLICT(application_slug,ip_slug,role) DO NOTHING;`);
  seedRevision("ip-application", application.slug, { ...application, version: 1, updatedAt: timestamp }, `https://apuch.art/application?application=${application.slug}`);
  outbox(`seed-search-application-v1-${application.slug}`, "search.index", "application", application.slug, 1, { entityType: "application", entityId: application.slug });
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
