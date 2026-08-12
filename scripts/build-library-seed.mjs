import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDir = join(root, "data/library");
const output = process.argv[2] || join(root, ".tmp/iptrust-library-seed.sql");

function sql(value) {
  if (value == null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

const [sources, organizations, cases, reports, datasets, relations] = await Promise.all(
  ["sources", "organizations", "cases", "reports", "datasets", "relations"].map(async (name) =>
    JSON.parse(await readFile(join(dataDir, `${name}.json`), "utf8")))
);

const lines = [
  "PRAGMA foreign_keys = ON;",
  "DELETE FROM organization_collections;",
  "DELETE FROM organizations;",
  "DELETE FROM library_sources;",
];

for (const source of sources) {
  lines.push(`INSERT INTO library_sources (id,name,publisher,type,year,source_date,source_url,authority,refresh,fetched_at,metadata_json) VALUES (${[
    source.id, source.name, source.publisher, source.type, source.year, source.sourceDate || null, source.sourceUrl,
    source.authority, source.refresh || null, new Date().toISOString(), JSON.stringify(source.metadata || {}),
  ].map(sql).join(",")});`);
}

for (const org of organizations) {
  const now = org.fetchedAt || new Date().toISOString();
  lines.push(`INSERT INTO organizations (id,slug,name,native_name,main_language,description,official_website,logo_url,logo_source_url,logo_source,logo_provider,logo_quality,logo_status,logo_provenance_url,fallback_logo_url,logo_checked_at,country,headquarters,industry,ticker,verification_status,source_url,source_publisher,source_date,fetched_at,updated_at) VALUES (${[
    org.id, org.slug, org.name, org.nativeName || "", org.mainLanguage || "en", org.description || "", org.officialWebsite || "",
    org.logoUrl || "", org.logoSourceUrl || "", org.logoSource || "monogram", org.logoProvider || "", org.logoQuality || "fallback", org.logoStatus || "pending",
    org.logoProvenanceUrl || "", org.fallbackLogoUrl || "", org.logoCheckedAt || null, org.country || "", org.headquarters || "", org.industry || "", org.ticker || "",
    org.verificationStatus || "source-verified", org.sourceUrl, org.sourcePublisher, org.sourceDate || null, now, now,
  ].map(sql).join(",")});`);
  lines.push(`INSERT INTO organization_collections (organization_id,source_id,rank,year,metadata_json) VALUES (${[
    org.id, org.sourceId, org.rank || null, org.year || null, JSON.stringify(org.metadata || {}),
  ].map(sql).join(",")});`);
}

for (const item of [...cases.map((x) => ({ ...x, type: "case" })), ...reports.map((x) => ({ ...x, type: "report" })), ...datasets.map((x) => ({ ...x, type: "dataset" }))]) {
  const now = item.updatedAt || item.createdAt || new Date().toISOString();
  lines.push(`INSERT INTO library_items (id,slug,type,title_zh,title_en,summary_zh,summary_en,source_url,source_publisher,published_at,access,file_key,external_url,verification_status,metadata_json,created_at,updated_at) VALUES (${[
    item.id, item.slug, item.type, item.title?.zh || item.titleZh || "", item.title?.en || item.titleEn || "",
    item.summary?.zh || item.summaryZh || "", item.summary?.en || item.summaryEn || "", item.sourceUrl || "",
    item.sourcePublisher || "", item.publishedAt || null, item.access || "metadata", item.fileKey || "", item.externalUrl || "",
    item.verificationStatus || "draft", JSON.stringify(item.metadata || {}), item.createdAt || now, now,
  ].map(sql).join(",")}) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,type=excluded.type,title_zh=excluded.title_zh,title_en=excluded.title_en,summary_zh=excluded.summary_zh,summary_en=excluded.summary_en,source_url=excluded.source_url,source_publisher=excluded.source_publisher,published_at=excluded.published_at,access=excluded.access,file_key=excluded.file_key,external_url=excluded.external_url,verification_status=excluded.verification_status,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at;`);
}

for (const relation of relations) {
  lines.push(`INSERT INTO library_relations (id,from_type,from_id,to_type,to_id,relation,note,created_at) VALUES (${[
    relation.id, relation.fromType, relation.fromId, relation.toType, relation.toId, relation.relation,
    relation.note || "", relation.createdAt || new Date().toISOString(),
  ].map(sql).join(",")}) ON CONFLICT(id) DO UPDATE SET from_type=excluded.from_type,from_id=excluded.from_id,to_type=excluded.to_type,to_id=excluded.to_id,relation=excluded.relation,note=excluded.note;`);
}

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${lines.join("\n")}\n`);
console.log(`Wrote ${output} with ${organizations.length} organizations and ${cases.length + reports.length + datasets.length} library items.`);
