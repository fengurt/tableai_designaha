import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataPath = join(root, "data/library/organizations.json");
const simpleIconsVersion = "latest";
const simpleIconsBase = `https://cdn.jsdelivr.net/npm/simple-icons@${simpleIconsVersion}/icons`;
// jsDelivr exposes both the catalog and SVG files through the same package alias,
// so a future refresh can re-check the registry without trusting guessed URLs.
const catalogUrl = "https://cdn.jsdelivr.net/npm/simple-icons@latest/_data/simple-icons.json";
const write = process.argv.includes("--write");

// Aliases are deliberately conservative. A missing logo becomes a clear monogram;
// an approximate match must never silently become a brand asset.
const aliases = new Map([
  ["facebook", "meta"],
  ["meta platforms", "meta"],
  ["procter & gamble", "procterandgamble"],
  ["p&g", "procterandgamble"],
]);

function iconSlug(value = "") {
  return value.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function cleanSource(value = "") {
  return /^https?:\/\//i.test(value) ? value : "";
}

async function available(url) {
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(6000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function mapLimit(items, limit, mapper) {
  const result = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      result[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return result;
}

const organizations = JSON.parse(await readFile(dataPath, "utf8"));
const catalog = await fetch(catalogUrl, { signal: AbortSignal.timeout(15000) }).then((response) => {
  if (!response.ok) throw new Error(`Simple Icons catalog failed: ${response.status}`);
  return response.json();
});
const catalogTitles = new Set(catalog.map((item) => iconSlug(item.title)));
const catalogBySlug = new Map(catalog.map((item) => [iconSlug(item.title), item]));
const checkedAt = new Date().toISOString();

const next = await mapLimit(organizations, 12, async (organization) => {
  if (organization.logoUrl && organization.logoSource !== "simple-icons" && organization.logoStatus !== "pending") {
    return {
      ...organization,
      logoSource: organization.logoSource || "official",
      logoQuality: organization.logoQuality || "verified",
      logoStatus: organization.logoStatus || "verified",
      logoCheckedAt: organization.logoCheckedAt || checkedAt,
    };
  }

  const alias = aliases.get(organization.name.trim().toLowerCase());
  const candidate = alias || iconSlug(organization.name);
  const metadata = catalogBySlug.get(candidate);
  const logoUrl = catalogTitles.has(candidate) ? `${simpleIconsBase}/${candidate}.svg` : "";
  const fallbackLogoUrl = cleanSource(organization.fallbackLogoUrl || organization.logoSourceUrl);

  if (metadata && logoUrl && await available(logoUrl)) {
    return {
      ...organization,
      logoUrl,
      logoSourceUrl: logoUrl,
      logoSource: "simple-icons",
      logoProvider: "Simple Icons",
      logoQuality: "vector",
      logoStatus: "verified",
      logoProvenanceUrl: metadata.source || organization.officialWebsite || "",
      fallbackLogoUrl,
      logoCheckedAt: checkedAt,
    };
  }

  return {
    ...organization,
    logoUrl: "",
    logoSourceUrl: "",
    logoSource: "monogram",
    logoProvider: "",
    logoQuality: "fallback",
    logoStatus: "pending",
    logoProvenanceUrl: cleanSource(organization.officialWebsite) || cleanSource(organization.sourceUrl),
    fallbackLogoUrl,
    logoCheckedAt: checkedAt,
  };
});

const verified = next.filter((item) => item.logoStatus === "verified").length;
const pending = next.length - verified;
if (write) await writeFile(dataPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`${write ? "Updated" : "Dry run:"} ${next.length} organization logos: ${verified} verified vector, ${pending} pending monograms.`);
if (!write) {
  console.log("Use --write to persist the manifest. Pending records keep their official favicon as fallbackLogoUrl only.");
  console.log(next.filter((item) => item.logoStatus === "verified").slice(0, 12).map((item) => `${item.name} -> ${item.logoUrl}`).join("\n"));
}
