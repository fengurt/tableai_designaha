import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const brands = JSON.parse(await readFile(join(root, "config", "brands.json"), "utf8"));
const system = JSON.parse(await readFile(join(root, "config", "ip-system.json"), "utf8"));
const errors = [];
const industryIds = new Set(system.taxonomy.industries.map((item) => item.id));
const typeIds = new Set(system.taxonomy.ipTypes.map((item) => item.id));
const applicationTypeIds = new Set(system.taxonomy.applicationTypes.map((item) => item.id));
const slugs = new Set([...brands.map((item) => item.slug), ...system.references.map((item) => item.slug)]);

for (const brand of brands) {
  const value = system.owned[brand.slug];
  if (!value) { errors.push(`missing_classification:${brand.slug}`); continue; }
  if (!industryIds.has(value.primaryIndustry)) errors.push(`invalid_primary_industry:${brand.slug}:${value.primaryIndustry}`);
  if (!typeIds.has(value.ipType)) errors.push(`invalid_ip_type:${brand.slug}:${value.ipType}`);
  if (!value.industries?.includes(value.primaryIndustry)) errors.push(`primary_industry_not_selected:${brand.slug}`);
  for (const industry of value.industries || []) if (!industryIds.has(industry)) errors.push(`invalid_industry:${brand.slug}:${industry}`);
}

for (const reference of system.references) {
  if (!reference.sourceUrl) errors.push(`reference_source_missing:${reference.slug}`);
  if (!industryIds.has(reference.primaryIndustry)) errors.push(`invalid_reference_industry:${reference.slug}`);
  if (!typeIds.has(reference.ipType)) errors.push(`invalid_reference_type:${reference.slug}`);
}

const primaryParents = new Map();
const children = new Map();
for (const relation of system.relationships) {
  if (!slugs.has(relation.parent) || !slugs.has(relation.child)) errors.push(`relation_node_missing:${relation.id}`);
  if (relation.parent === relation.child) errors.push(`relation_self_cycle:${relation.id}`);
  if (relation.type === "brand_parent" && relation.primary) {
    if (primaryParents.has(relation.child)) errors.push(`multiple_primary_parents:${relation.child}`);
    primaryParents.set(relation.child, relation.parent);
    children.set(relation.parent, [...(children.get(relation.parent) || []), relation.child]);
  }
}

function visit(slug, path = new Set()) {
  if (path.has(slug)) { errors.push(`brand_parent_cycle:${[...path, slug].join("->")}`); return; }
  const next = new Set(path).add(slug);
  for (const child of children.get(slug) || []) visit(child, next);
}
for (const slug of slugs) visit(slug);

for (const application of system.applications) {
  if (!applicationTypeIds.has(application.applicationType)) errors.push(`invalid_application_type:${application.slug}`);
  const primary = (application.links || []).filter((item) => item.role === "primary");
  if (primary.length !== 1) errors.push(`application_primary_count:${application.slug}:${primary.length}`);
  for (const link of application.links || []) if (!slugs.has(link.ip)) errors.push(`application_ip_missing:${application.slug}:${link.ip}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({ valid: true, ownedIps: brands.length, referenceIps: system.references.length, relationships: system.relationships.length, applications: system.applications.length, industries: industryIds.size, ipTypes: typeIds.size }, null, 2));
