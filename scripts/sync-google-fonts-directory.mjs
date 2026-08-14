import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(root, "data", "google-fonts-directory.json");
const metadataUrl = "https://fonts.google.com/metadata/fonts";
const treeUrl = "https://api.github.com/repos/google/fonts/git/trees/main?recursive=1";

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "IPTrust-font-directory" },
  });
  if (!response.ok) throw new Error(`font_directory_fetch:${response.status}:${url}`);
  return response.json();
}

function familySlug(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function categoryKey(font) {
  if (font.category === "Monospace" || font.classifications?.includes("Monospace")) return "mono";
  if (font.category === "Serif") return "serif";
  if (font.category === "Handwriting") return "handwriting";
  if (font.category === "Display") return "display";
  return "sans";
}

function languageGroups(font, category) {
  const groups = [];
  if (font.subsets?.some((subset) => subset.startsWith("chinese-"))) groups.push("zh");
  if (font.subsets?.includes("latin")) groups.push("en");
  if (category === "mono") groups.push("mono");
  return [...new Set(groups)];
}

const [metadata, tree] = await Promise.all([fetchJson(metadataUrl), fetchJson(treeUrl)]);
if (!Array.isArray(metadata.familyMetadataList) || !Array.isArray(tree.tree) || tree.truncated) {
  throw new Error("font_directory_source_incomplete");
}

const licenseByDirectory = new Map();
for (const entry of tree.tree) {
  const match = entry.path.match(/^(ofl|apache|ufl)\/([^/]+)\/(OFL\.txt|LICENSE\.txt|UFL\.txt)$/);
  if (!match) continue;
  const [, directory, familyDirectory, filename] = match;
  const details = directory === "ofl"
    ? { spdx: "OFL-1.1", name: "SIL Open Font License 1.1" }
    : directory === "apache"
      ? { spdx: "Apache-2.0", name: "Apache License 2.0" }
      : { spdx: "UFL-1.0", name: "Ubuntu Font Licence 1.0" };
  licenseByDirectory.set(familyDirectory, {
    ...details,
    path: entry.path,
    url: `https://github.com/google/fonts/blob/main/${entry.path}`,
    directory,
    filename,
  });
}

const excluded = [];
const families = [];
for (const font of metadata.familyMetadataList) {
  if (!font.isOpenSource) continue;
  const directorySlug = familySlug(font.family);
  const license = licenseByDirectory.get(directorySlug);
  if (!license) {
    excluded.push({ family: font.family, reason: "license_path_unresolved" });
    continue;
  }
  const category = categoryKey(font);
  const groups = languageGroups(font, category);
  families.push({
    id: directorySlug,
    family: font.family,
    displayName: font.displayName || "",
    category,
    groups,
    subsets: (font.subsets || []).filter((subset) => subset !== "menu"),
    primaryScript: font.primaryScript || "",
    primaryLanguage: font.primaryLanguage || "",
    designers: font.designers || [],
    styles: Object.keys(font.fonts || {}).length,
    variableAxes: (font.axes || []).map((axis) => ({ tag: axis.tag, min: axis.min, max: axis.max, defaultValue: axis.defaultValue })),
    popularity: font.popularity,
    dateAdded: font.dateAdded,
    lastModified: font.lastModified,
    license: { spdx: license.spdx, name: license.name, url: license.url },
    source: {
      publisher: "Google Fonts",
      projectUrl: `https://fonts.google.com/specimen/${encodeURIComponent(font.family).replaceAll("%20", "+")}`,
      repositoryUrl: `https://github.com/google/fonts/tree/main/${license.directory}/${directorySlug}`,
      metadataUrl,
    },
  });
}

families.sort((a, b) => (a.popularity ?? Number.MAX_SAFE_INTEGER) - (b.popularity ?? Number.MAX_SAFE_INTEGER) || a.family.localeCompare(b.family));

const payload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  verifiedAt: new Date().toISOString().slice(0, 10),
  name: "Google Fonts Official Directory for IPTrust",
  description: {
    zh: "来自 Google Fonts 官方元数据与官方源码仓库许可证路径的可检索字体目录。",
    en: "Searchable directory built from official Google Fonts metadata and per-family license paths in the official source repository.",
  },
  source: { metadataUrl, repositoryUrl: "https://github.com/google/fonts", treeSha: tree.sha },
  stats: {
    officialFamilies: metadata.familyMetadataList.length,
    verifiedFamilies: families.length,
    excludedFamilies: excluded.length,
    chineseFamilies: families.filter((font) => font.groups.includes("zh")).length,
    latinFamilies: families.filter((font) => font.groups.includes("en")).length,
    monospaceFamilies: families.filter((font) => font.groups.includes("mono")).length,
  },
  families,
  excluded,
};

await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload.stats, null, 2));
