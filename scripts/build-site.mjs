import { mkdir, readFile, rm, writeFile, copyFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { marked, Renderer } from "marked";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const siteDir = join(root, "site");
const apiDir = join(siteDir, "api");
const brandApiDir = join(apiDir, "brands");
const historyApiDir = join(apiDir, "history");
const libraryApiDir = join(apiDir, "library");
const assetsDir = join(siteDir, "assets");
const imageDir = join(assetsDir, "brand-images");
const adobeDir = join(assetsDir, "adobe");
const contactDir = join(assetsDir, "contact");
const librarySiteDir = join(siteDir, "library");
const libraryDataDir = join(root, "data", "library");
const assetManifestPath = join(root, "data", "assets", "manifest.json");

const brands = JSON.parse(await readFile(join(root, "config/brands.json"), "utf8"));
const ipSystem = JSON.parse(await readFile(join(root, "config/ip-system.json"), "utf8"));
const assetManifest = existsSync(assetManifestPath)
  ? JSON.parse(await readFile(assetManifestPath, "utf8"))
  : null;
const hubLogoUrl = assetManifest?.items?.find((item) => item.sourcePath === "IPTRUST/assets/brand-images/iptrust-logo-black.png")?.mediaUrl || "assets/brand-images/iptrust-logo-black.png";
const librarySnapshotNames = ["sources", "organizations", "cases", "reports", "datasets", "relations", "sync"];
const librarySnapshots = Object.fromEntries(await Promise.all(librarySnapshotNames.map(async (name) => [
  name,
  JSON.parse(await readFile(join(libraryDataDir, `${name}.json`), "utf8")),
])));
const privateLibraryIds = new Set(["cases", "reports", "datasets"].flatMap((name) => librarySnapshots[name].filter((item) => item.access === "private").map((item) => item.id)));
const relationParentSlugs = new Set(ipSystem.relationships.filter((item) => item.type === "brand_parent").map((item) => item.parent));
const relationChildSlugs = new Set(ipSystem.relationships.filter((item) => item.type === "brand_parent").map((item) => item.child));

function architectureRolesFor(slug, parentCapable = false) {
  const roles = [];
  if (parentCapable || relationParentSlugs.has(slug)) roles.push("parent");
  if (relationChildSlugs.has(slug)) roles.push("child");
  return roles.length ? roles : ["standalone"];
}
const hubName = "岁知社 IPTrust";
const hubNameCn = "岁知社";
const hubNameEn = "IPTrust";
const repository = { owner: "fengurt", repo: "tableai_designaha", branch: "main" };
const hubDescription = "岁知社 IPTrust 是一个面向人和 Agent 的 IP 品牌信任中枢。";
const hubDescriptionEn = "IPTrust is an IP trust hub for people and agents.";

async function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  const files = [];
  for (const entry of entries) {
    if (entry === ".DS_Store") continue;
    const full = join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) {
      files.push(...await walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function isGuide(path) {
  const ext = extname(path).toLowerCase();
  return ext === ".md" || ext === ".html";
}

function isToken(path) {
  return path.includes("/tokens/") && [".json", ".css"].includes(extname(path).toLowerCase());
}

function isBrandImage(path) {
  return path.includes("/assets/brand-images/") && [".png", ".jpg", ".jpeg", ".webp"].includes(extname(path).toLowerCase());
}

function isAdobeManifest(path) {
  return path.includes("/assets/adobe-assets/") && extname(path).toLowerCase() === ".json";
}

function formatFileSize(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes < 1) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** unit);
  const precision = unit === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[unit]}`;
}

function jpegDimensions(buffer) {
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2 || offset + length + 2 > buffer.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += length + 2;
  }
  return {};
}

function webpDimensions(buffer) {
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: 1 + (bits & 0x3fff),
      height: 1 + ((bits >> 14) & 0x3fff),
    };
  }
  return {};
}

async function imageFileMetadata(full, rel) {
  const extension = extname(rel).toLowerCase().slice(1);
  const format = extension === "jpeg" ? "JPG" : extension.toUpperCase();
  const [file, fileStat] = await Promise.all([readFile(full), stat(full)]);
  let dimensions = {};
  if (extension === "png" && file.length >= 24 && file.toString("ascii", 1, 4) === "PNG") {
    dimensions = { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
  } else if (["jpg", "jpeg"].includes(extension) && file.length >= 4) {
    dimensions = jpegDimensions(file);
  } else if (extension === "webp" && file.length >= 30) {
    dimensions = webpDimensions(file);
  }
  const width = dimensions.width || null;
  const height = dimensions.height || null;
  return {
    format,
    bytes: fileStat.size,
    size: formatFileSize(fileStat.size),
    width,
    height,
    dimensions: width && height ? `${width} x ${height} px` : "",
  };
}

function safeAssetStem(value) {
  const safe = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return safe || "image";
}

function brandImageOutputName(brand, rel, usedNames) {
  const ext = extname(rel).toLowerCase();
  const parts = rel.split("/");
  const filename = parts.at(-1) ?? "image";
  const stem = filename.replace(/\.[^.]+$/, "");
  if (brand.slug === "iptrust" && stem === `${brand.slug}-logo-black`) {
    const canonical = `${stem}${ext}`;
    usedNames.add(canonical);
    return canonical;
  }
  if (stem === `${brand.slug}-brand-hero` || stem.endsWith("-brand-hero")) {
    return `${brand.slug}${ext}`;
  }
  const parent = parts.at(-2) ?? "";
  const rawStem = parent === "brand-images" ? stem : `${parent}-${stem}`;
  const base = `${brand.slug}-${safeAssetStem(rawStem)}`;
  let candidate = `${base}${ext}`;
  let index = 2;
  while (usedNames.has(candidate)) {
    candidate = `${base}-${index}${ext}`;
    index += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

function buildAssetScore(image = {}) {
  const text = [image.path, image.sitePath, image.title].filter(Boolean).join(" ").toLowerCase();
  let score = 0;
  if (text.includes("logo")) score += 60;
  if (text.includes("a2a")) score += 35;
  if (text.includes("transparent") || text.includes("clear")) score += 42;
  if (text.includes("wide") || text.includes("wordmark")) score += 25;
  if (text.includes("color") || text.includes("red")) score += 32;
  if (text.includes("black")) score += 10;
  if (text.includes("white")) score -= 18;
  if (String(image.sitePath || "").toLowerCase().endsWith(".png")) score += 10;
  if (String(image.sitePath || "").toLowerCase().endsWith(".jpg")) score -= 4;
  if (text.includes("brand-hero")) score -= 90;
  return score;
}

function buildPreferredBrandImage(images = []) {
  if (!images.length) return null;
  return [...images].sort((a, b) => buildAssetScore(b) - buildAssetScore(a))[0] || images[0];
}

function titleFromPath(path) {
  return path
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function excerpt(text) {
  return text
    .replace(/^---[\s\S]*?---/, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`>|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420);
}

function hasCjk(text = "") {
  return /[\u3400-\u9fff]/.test(text);
}

function zhName(brand) {
  if (hasCjk(brand.name)) return brand.name;
  if (brand.nativeName && hasCjk(brand.nativeName)) return brand.nativeName;
  return brand.name;
}

function enName(brand) {
  if (!hasCjk(brand.name)) return brand.name;
  if (brand.nativeName && /[A-Za-z]/.test(brand.nativeName)) {
    return brand.nativeName.replace(/\s*[·|｜/]\s*[\u3400-\u9fff].*$/, "").trim() || brand.nativeName;
  }
  return brand.name;
}

function mainLanguage(brand) {
  if (["zh", "en"].includes(brand.mainLanguage)) return brand.mainLanguage;
  return hasCjk(brand.name) ? "zh" : "en";
}

function mainName(brand) {
  return mainLanguage(brand) === "zh" ? zhName(brand) : enName(brand);
}

function publicLanguageLabel(value) {
  if (value === "zh" || value === "cn") return "CN";
  if (value === "en") return "EN";
  return value || "";
}

function secondaryName(primary, secondary) {
  return primary && secondary && primary !== secondary ? secondary : "";
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function introLines(text = "") {
  return text
    .replace(/^---[\s\S]*?---/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\n+/)
    .map((line) => line.replace(/^#+\s*/, "").replace(/^[-*]\s*/, "").trim())
    .filter((line) => {
      if (!line) return false;
      if (/^(chinese name|english name|english descriptor):/i.test(line)) return false;
      if (/^(brand role|visual direction|agent notes|overview|purpose)$/i.test(line)) return false;
      if (/^use\s+/i.test(line)) return false;
      if (/[`]|\/|\\/.test(line)) return false;
      if (line.length < 18 && !/[。！？.!?]/.test(line)) return false;
      return true;
    });
}

function cjkRatio(text = "") {
  if (!text.length) return 0;
  return (text.match(/[\u3400-\u9fff]/g) || []).length / text.length;
}

function clipSentence(text = "", max = 170) {
  const clean = text.replace(/[#*_`>|]/g, "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const boundary = clean.slice(0, max).search(/[。！？.!?](?!.*[。！？.!?])/);
  if (boundary > 48) return clean.slice(0, boundary + 1);
  return `${clean.slice(0, max - 1).trim()}…`;
}

function liveIntro(brand, guides, lang) {
  if (Object.prototype.hasOwnProperty.call(brand.intro ?? {}, lang)) {
    return clipSentence(brand.intro[lang] ?? "");
  }
  const primary = guides.find((g) => g.primary) ?? guides[0];
  const lines = introLines(primary?.text || "");
  const fromGuide = lang === "zh"
    ? lines.find((line) => hasCjk(line) && line.length >= 24)
    : lines.find((line) => /[A-Za-z]/.test(line) && line.length >= 44 && cjkRatio(line) < 0.18);
  if (fromGuide && !/placeholder/i.test(fromGuide)) return clipSentence(fromGuide);
  if (lang === "zh") {
    return `${zhName(brand)}的 IP 品牌系统，实时汇总最新规范、颜色、语气、资产与 Agent 可读源文件。`;
  }
  return `${enName(brand)} brand system with live guidelines, colors, voice, assets, and agent-readable source files.`;
}

function profile(brand) {
  return {
    officialWebsite: brand.officialWebsite ?? "",
    mainLanguage: mainLanguage(brand),
    mainLocale: publicLanguageLabel(mainLanguage(brand)),
    intro: {
      zh: brand.intro?.zh ?? "",
      en: brand.intro?.en ?? "",
    },
    business: {
      zh: brand.business?.zh ?? "",
      en: brand.business?.en ?? "",
    },
    notes: {
      zh: brand.notes?.zh ?? "",
      en: brand.notes?.en ?? "",
    },
    classification: {
      tracks: {
        zh: brand.classification?.tracks?.zh ?? [],
        en: brand.classification?.tracks?.en ?? [],
      },
      audiences: {
        zh: brand.classification?.audiences?.zh ?? [],
        en: brand.classification?.audiences?.en ?? [],
      },
      tags: {
        zh: brand.classification?.tags?.zh ?? [],
        en: brand.classification?.tags?.en ?? [],
      },
    },
  };
}

function html(strings, ...values) {
  return String.raw({ raw: strings }, ...values);
}

function escapeBuildHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function markdownSlug(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

function renderMarkdownDocument(markdown = "", prefix = "document") {
  const renderer = new Renderer();
  const seen = new Map();
  renderer.heading = function ({ tokens, depth, text }) {
    const base = `${prefix}-${markdownSlug(text)}`;
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    const id = count ? `${base}-${count + 1}` : base;
    return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
  };
  return marked.parse(markdown, { gfm: true, renderer });
}

function markdownToc(markdown = "", prefix = "document") {
  return marked.lexer(markdown)
    .filter((token) => token.type === "heading" && token.depth === 2)
    .map((token) => `<a href="#${prefix}-${markdownSlug(token.text)}">${escapeBuildHtml(token.text)}</a>`)
    .join("\n");
}

function loadVersions() {
  try {
    const out = execFileSync("git", ["log", "-12", "--date=iso-strict", "--pretty=format:%H%x09%h%x09%cI%x09%s"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    return out.split("\n").filter(Boolean).map((line) => {
      const [hash, shortHash, date, ...messageParts] = line.split("\t");
      return {
        hash,
        shortHash,
        date,
        message: messageParts.join("\t"),
        url: `https://github.com/${repository.owner}/${repository.repo}/commit/${hash}`,
      };
    });
  } catch {
    return [];
  }
}

async function loadPreviousJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

function mergeVersionHistory(current = [], previous = [], limit = 20, options = {}) {
  if (options.preferPreviousWhenShallow && current.length <= 1 && previous.length > 1) {
    return previous.slice(0, limit);
  }
  const merged = [];
  const seen = new Set();
  for (const item of [...current, ...previous]) {
    if (!item?.hash || seen.has(item.hash)) continue;
    seen.add(item.hash);
    merged.push(item);
  }
  return merged.slice(0, limit);
}

function loadBrandVersions(brand) {
  const paths = uniqueValues([
    "config/brands.json",
    brand.folder,
    brand.primaryGuide,
  ]);
  try {
    const out = execFileSync("git", [
      "log",
      "-20",
      "--date=iso-strict",
      "--pretty=format:%H%x09%h%x09%cI%x09%s",
      "--",
      ...paths,
    ], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    return out.split("\n").filter(Boolean).map((line) => {
      const [hash, shortHash, date, ...messageParts] = line.split("\t");
      return {
        hash,
        shortHash,
        date,
        message: messageParts.join("\t"),
        url: `https://github.com/${repository.owner}/${repository.repo}/commit/${hash}`,
        sourcePaths: paths,
      };
    });
  } catch {
    return [];
  }
}

function apiSchemaPayload() {
  return {
    name: "IPTrust IP System API Schema",
    version: "2.0.0",
    description: "IPTrust exposes brands, IP taxonomy, brand architecture, project applications, assets and history through REST and MCP.",
    endpoints: {
      manifest: "api/manifest.json",
      allBrands: "api/brands.json",
      taxonomy: "api/v2/taxonomy",
      ips: "api/v2/ips",
      ip: "api/v2/ips/{slug}",
      ipHistory: "api/v2/ips/{slug}/history",
      ipGraph: "api/v2/ips/{slug}/graph",
      ipRelations: "api/v2/ip-relations",
      applications: "api/v2/applications",
      application: "api/v2/applications/{slug}",
      applicationHistory: "api/v2/applications/{slug}/history",
      search: "api/v2/search",
      organizations: "api/library/organizations",
      cases: "api/library/cases",
      reports: "api/library/reports",
      protectedLibraryItem: "api/v2/library/{collection}/{id}",
      protectedLibraryFile: "api/v2/library/{collection}/{id}/sign",
      datasets: "api/library/datasets",
      relations: "api/library/relations",
      allVersions: "api/versions.json",
      brand: "api/brands/{slug}.json",
      brandHistory: "api/history/{slug}.json",
      ipSystem: "ip_sys.md",
      skill: "skills/iptrust-live-update/SKILL.md",
      llms: "llms.txt",
      remoteMcp: "mcp",
      directory: "directory/",
    },
    brandFields: {
      slug: "Stable IP ID / asset key used by URLs and agent calls.",
      assetKey: "Human-readable alias for slug in asset and agent contexts.",
      folder: "Local source folder.",
      name: "Configured public/English name.",
      nativeName: "Configured native/Chinese or alternate name.",
      mainName: "Name chosen from mainLanguage.",
      mainLanguage: "Main display language: zh or en.",
      mainLocale: "Public label for mainLanguage: CN or EN.",
      officialWebsite: "Official website URL, blank when unknown.",
      description: "Short configured description.",
      display: "Bilingual display names and secondary labels.",
      profile: "Callable business profile fields: officialWebsite, mainLanguage, intro, business, notes, classification.",
      intro: "Live bilingual intro generated from config or primary guideline.",
      business: "Bilingual business/service scope.",
      notes: "Bilingual notes for public context, agent hints, or operational remarks.",
      classification: "Bilingual category arrays: tracks, audiences, and tags.",
      theme: "Brand colors, surface, ink, line, mode, and keywords.",
      url: "Public website brand page.",
      apiUrl: "Per-IP JSON endpoint.",
      historyUrl: "Per-IP Git-backed version endpoint.",
      status: "documented or placeholder.",
      guides: "Guideline metadata and text.",
      tokens: "Token file metadata and text.",
      images: "Image asset metadata and public site paths, including format, bytes, human-readable size, width, height, and dimensions.",
      adobeAssets: "Adobe source files, preview images, page exports, formats, file sizes, and public URLs.",
      logoUrl: "Canonical public URL path for the preferred IP logo, blank when no verified logo asset exists.",
      assetKit: "Unified callable IP asset endpoints, colors, images, and moodboard source.",
      moodboard: "Derived colors, keywords, and image assets for visual direction.",
      editablePaths: "Source files editable from admin flow.",
      source: "GitHub source folder and local folder.",
      sources: "Public provenance records with publisher, URL, verification date, and confidence.",
      version: "Latest build/global version object.",
      history: "Latest per-IP history records.",
      primaryIndustry: "Primary term from the controlled bilingual industry taxonomy.",
      industries: "One or more controlled industry taxonomy terms.",
      ipType: "Controlled single IP type; parent/child status is represented by relationships.",
      recordClass: "owned or reference.",
      lifecycleStatus: "Lifecycle state such as active, draft, archived or retired.",
      guidelineMode: "independent or inherited guideline behavior.",
      parentCapable: "Whether the IP is explicitly available as a mother IP even before children are linked.",
      architectureRoles: "Computed roles; an IP can be parent, child, both, or standalone.",
    },
    architecture: {
      primaryParent: "One optional brand_parent relationship; cycles are rejected.",
      auxiliaryRelations: ["endorsed_by", "operated_by", "licensed_by", "member_of", "co_branded_with"],
      applications: "Stores, properties, deployments, events, content series, digital products and collaborations remain applications rather than independent IPs.",
      inheritance: "An application inherits its primary IP guideline and stores local changes in overrides.",
    },
    versioning: {
      model: "Git-backed history. Source edits flow through repository commits, then build into website JSON.",
      globalHistory: "api/versions.json",
      perBrandHistory: "api/history/{slug}.json",
      currentVersionField: "version",
      trackedPaths: ["config/brands.json", "{brand.folder}", "{brand.primaryGuide}"],
    },
  };
}

function themeColorEntries(theme = {}) {
  return ["primary", "accent", "secondary", "surface", "paper", "ink", "muted"].flatMap((key) => {
    const value = theme?.[key];
    return value ? [{ key, value }] : [];
  });
}

const previousVersions = await loadPreviousJson(join(apiDir, "versions.json"), []);
const previousHistoryBySlug = new Map(await Promise.all(brands.map(async (brand) => {
  const previous = await loadPreviousJson(join(historyApiDir, `${brand.slug}.json`), null);
  return [brand.slug, previous?.versions ?? []];
})));
const versions = mergeVersionHistory(loadVersions(), previousVersions, 20);
const buildFingerprint = createHash("sha256");
for (const inputPath of ["scripts/build-site.mjs", "styles/editorial.css", "config/brands.json", "config/ip-system.json", "package.json", "IP-System/ip_sys.md", "data/library/sync.json", "library/library.css", "library/library.js"]) {
  buildFingerprint.update(await readFile(join(root, inputPath)));
}
const buildVersion = `${versions[0]?.shortHash ?? "dev"}-${buildFingerprint.digest("hex").slice(0, 8)}`;
const siteCssPath = `assets/site-${buildVersion}.css`;
const siteJsPath = `assets/site-${buildVersion}.js`;
const ipSystemMarkdown = await readFile(join(root, "IP-System/ip_sys.md"), "utf8");
const ipSystemDocumentHtml = renderMarkdownDocument(ipSystemMarkdown, "ip-system");
const ipSystemTocHtml = markdownToc(ipSystemMarkdown, "ip-system");

await rm(siteDir, { recursive: true, force: true });
await mkdir(brandApiDir, { recursive: true });
await mkdir(historyApiDir, { recursive: true });
await mkdir(libraryApiDir, { recursive: true });
await mkdir(imageDir, { recursive: true });
await mkdir(adobeDir, { recursive: true });
await mkdir(contactDir, { recursive: true });
await mkdir(librarySiteDir, { recursive: true });
await mkdir(join(siteDir, "skills", "iptrust-live-update"), { recursive: true });
await copyFile(join(root, "styles/editorial.css"), join(assetsDir, "editorial.css"));
if (existsSync(join(root, "skills/iptrust-live-update/SKILL.md"))) {
  await copyFile(join(root, "skills/iptrust-live-update/SKILL.md"), join(siteDir, "skills/iptrust-live-update/SKILL.md"));
}
if (existsSync(join(root, "IP-System/ip_sys.md"))) {
  await copyFile(join(root, "IP-System/ip_sys.md"), join(siteDir, "ip_sys.md"));
}
if (!assetManifest && existsSync(join(root, "assets/contact/wecom-qr.png"))) {
  await copyFile(join(root, "assets/contact/wecom-qr.png"), join(contactDir, "wecom-qr.png"));
}
for (const name of librarySnapshotNames) {
  if (["cases", "reports", "datasets"].includes(name)) {
    await writeFile(join(libraryApiDir, `${name}.json`), JSON.stringify(librarySnapshots[name].filter((item) => item.access !== "private"), null, 2));
  } else if (name === "relations") {
    await writeFile(join(libraryApiDir, `${name}.json`), JSON.stringify(librarySnapshots[name].filter((item) => !privateLibraryIds.has(item.fromId) && !privateLibraryIds.has(item.toId)), null, 2));
  } else {
    await copyFile(join(libraryDataDir, `${name}.json`), join(libraryApiDir, `${name}.json`));
  }
}
await copyFile(join(root, "library/index.html"), join(librarySiteDir, "index.html"));
await copyFile(join(root, "library/library.css"), join(librarySiteDir, "library.css"));
await copyFile(join(root, "library/library.js"), join(librarySiteDir, "library.js"));

const brandPayloads = [];

for (const brand of brands) {
  const folderAbs = join(root, brand.folder);
  const files = await walk(folderAbs);
  const guides = [];
  const tokens = [];
  const manifestAssets = assetManifest?.items?.filter((item) => item.ownerId === brand.slug) || [];
  const images = manifestAssets
    .filter((item) => item.access === "public" && ["hero", "logo", "image"].includes(item.role))
    .map((item) => ({
      assetId: item.id,
      path: item.sourcePath,
      sitePath: item.mediaUrl,
      title: item.title,
      format: item.extension === "jpg" ? "JPG" : item.extension.toUpperCase(),
      bytes: item.bytes,
      size: item.size,
      width: item.width,
      height: item.height,
      dimensions: item.dimensions,
      sha256: item.sha256,
      access: item.access,
    }));
  const adobeManifests = [];
  const usedImageNames = new Set();

  for (const full of files) {
    const rel = relative(root, full).replaceAll("\\", "/");
    if (isGuide(rel)) {
      const text = await readFile(full, "utf8");
      guides.push({
        path: rel,
        title: titleFromPath(rel),
        format: extname(rel).toLowerCase().slice(1),
        primary: rel === brand.primaryGuide,
        excerpt: excerpt(text),
        text,
        html: ["md", "markdown"].includes(extname(rel).toLowerCase().slice(1))
          ? renderMarkdownDocument(text, `${brand.slug}-guide-${guides.length + 1}`)
          : `<p>${escapeBuildHtml(excerpt(text))}</p>`,
      });
    }
    if (isToken(rel)) {
      tokens.push({
        path: rel,
        title: titleFromPath(rel),
        format: extname(rel).toLowerCase().slice(1),
        text: await readFile(full, "utf8"),
      });
    }
    if (!assetManifest && isBrandImage(rel)) {
      const outputName = brandImageOutputName(brand, rel, usedImageNames);
      const metadata = await imageFileMetadata(full, rel);
      await copyFile(full, join(imageDir, outputName));
      images.push({
        path: rel,
        sitePath: `assets/brand-images/${outputName}`,
        title: titleFromPath(rel),
        ...metadata,
      });
    }
    if (isAdobeManifest(rel)) {
      adobeManifests.push(JSON.parse(await readFile(full, "utf8")));
    }
  }

  guides.sort((a, b) => Number(b.primary) - Number(a.primary) || a.path.localeCompare(b.path));
  tokens.sort((a, b) => a.path.localeCompare(b.path));
  images.sort((a, b) => Number(b.path.includes("brand-hero")) - Number(a.path.includes("brand-hero")) || a.path.localeCompare(b.path));
  const adobeAssets = [];
  for (const manifest of adobeManifests) {
    const sourcePath = manifest.source?.path ? join(root, manifest.source.path) : "";
    let source = { ...(manifest.source || {}) };
    const sourceAsset = manifestAssets.find((item) => item.sourcePath === manifest.source?.path);
    if (sourceAsset) {
      source = { ...source, assetId: sourceAsset.id, apiUrl: `api/v2/assets/${sourceAsset.id}`, private: sourceAsset.access === "private", size: sourceAsset.size, bytes: sourceAsset.bytes, sha256: sourceAsset.sha256 };
    } else if (sourcePath && existsSync(sourcePath)) {
      const brandAdobeDir = join(adobeDir, brand.slug);
      await mkdir(brandAdobeDir, { recursive: true });
      const sourceName = sourcePath.split("/").at(-1);
      await copyFile(sourcePath, join(brandAdobeDir, sourceName));
      source = { ...source, sitePath: `assets/adobe/${brand.slug}/${sourceName}` };
    }
    const attachImage = (asset = {}) => {
      const image = images.find((item) => item.path === asset.path);
      return image ? { ...asset, sitePath: image.sitePath, title: image.title } : asset;
    };
    adobeAssets.push({
      ...manifest,
      source,
      preview: attachImage(manifest.preview),
      hero: attachImage(manifest.hero),
      exports: (manifest.exports || []).map((entry) => ({
        ...entry,
        png: entry.png ? attachImage(entry.png) : null,
        jpg: entry.jpg ? attachImage(entry.jpg) : null,
      })),
    });
  }
  const history = mergeVersionHistory(loadBrandVersions(brand), previousHistoryBySlug.get(brand.slug), 20, {
    preferPreviousWhenShallow: true,
  });

  const display = {
    default: { language: mainLanguage(brand), name: mainName(brand) },
    zh: { name: zhName(brand), secondaryName: secondaryName(zhName(brand), enName(brand)) },
    en: { name: enName(brand), secondaryName: secondaryName(enName(brand), zhName(brand)) },
  };
  const intro = {
    zh: liveIntro(brand, guides, "zh"),
    en: liveIntro(brand, guides, "en"),
  };
  const brandProfile = profile(brand);
  const manifestHeroPath = adobeAssets[0]?.hero?.path;
  const logoImage = images.find((image) => image.path === manifestHeroPath) || buildPreferredBrandImage(images);
  const moodboard = {
    colors: themeColorEntries(brand.theme),
    keywords: brand.theme?.keywords ?? [],
    images: images.map((image) => ({ ...image })),
  };
  const assetKit = {
    assetKey: brand.slug,
    endpoints: {
      brand: `api/brands/${brand.slug}.json`,
      logo: logoImage?.sitePath ?? "",
      images: `api/brands/${brand.slug}.json#images`,
      adobe: adobeAssets.length ? `api/brands/${brand.slug}.json#adobeAssets` : "",
      tokens: `api/brands/${brand.slug}.json#tokens`,
      history: `api/history/${brand.slug}.json`,
    },
    moodboard,
  };

  const payload = {
    ...brand,
    assetKey: brand.slug,
    mainName: mainName(brand),
    mainLanguage: mainLanguage(brand),
    mainLocale: publicLanguageLabel(mainLanguage(brand)),
    profile: brandProfile,
    display,
    intro,
    notes: brandProfile.notes,
    recordClass: "owned",
    primaryIndustry: ipSystem.owned[brand.slug]?.primaryIndustry || "business-professional-services",
    industries: ipSystem.owned[brand.slug]?.industries || [],
    ipType: ipSystem.owned[brand.slug]?.ipType || "corporate-brand",
    lifecycleStatus: "active",
    guidelineMode: ipSystem.owned[brand.slug]?.guidelineMode || "independent",
    parentCapable: Boolean(ipSystem.owned[brand.slug]?.parentCapable),
    architectureRoles: architectureRolesFor(brand.slug, ipSystem.owned[brand.slug]?.parentCapable),
    version: versions[0] ?? null,
    historyUrl: `api/history/${brand.slug}.json`,
    history: history.slice(0, 6),
    url: `brand.html?brand=${brand.slug}`,
    apiUrl: `api/brands/${brand.slug}.json`,
    status: guides.length ? "documented" : "placeholder",
    guides,
    tokens,
    images,
    assetManifest: manifestAssets,
    adobeAssets,
    logoUrl: logoImage?.sitePath ?? "",
    assetKit,
    moodboard,
    editablePaths: guides.map((g) => g.path),
    source: {
      github: `https://github.com/${repository.owner}/${repository.repo}/tree/${repository.branch}/${brand.folder}`,
      folder: brand.folder,
    },
  };
  brandPayloads.push(payload);
  await writeFile(join(historyApiDir, `${brand.slug}.json`), JSON.stringify({
    slug: brand.slug,
    name: payload.mainName,
    mainLanguage: payload.mainLanguage,
    apiUrl: payload.apiUrl,
    source: payload.source,
    trackedPaths: uniqueValues(["config/brands.json", brand.folder, brand.primaryGuide]),
    latest: history[0] ?? null,
    versions: history,
  }, null, 2));
  await writeFile(join(brandApiDir, `${brand.slug}.json`), JSON.stringify(payload, null, 2));
}

const indexPayload = brandPayloads.map(({ guides, tokens, images, adobeAssets, history, ...brand }) => ({
  ...brand,
  guideCount: guides.length,
  tokenCount: tokens.length,
  imageCount: images.length,
  adobeAssetCount: adobeAssets.length,
  heroImage: images[0]?.sitePath ?? "",
  primaryGuide: guides.find((g) => g.primary)?.path ?? guides[0]?.path ?? "",
  primaryExcerpt: guides.find((g) => g.primary)?.excerpt ?? guides[0]?.excerpt ?? brand.description,
}));
const brandSearchPayload = brandPayloads.flatMap((brand) => {
  const base = [{
    type: "ip",
    slug: brand.slug,
    title: brand.display?.default?.name ?? brand.name,
    subtitle: uniqueValues([brand.display?.zh?.name, brand.display?.en?.name, brand.nativeName]).join(" · "),
    text: [
      brand.intro?.zh,
      brand.intro?.en,
      brand.profile?.business?.zh,
      brand.profile?.business?.en,
      brand.profile?.notes?.zh,
      brand.profile?.notes?.en,
      brand.profile?.classification?.tracks?.zh?.join(" "),
      brand.profile?.classification?.tracks?.en?.join(" "),
      brand.profile?.classification?.audiences?.zh?.join(" "),
      brand.profile?.classification?.audiences?.en?.join(" "),
      brand.profile?.classification?.tags?.zh?.join(" "),
      brand.profile?.classification?.tags?.en?.join(" "),
      brand.description,
      brand.officialWebsite,
      brand.theme?.keywords?.join(" "),
    ].filter(Boolean).join(" "),
    url: brand.url,
  }];
  const guides = brand.guides.map((guide) => ({
    type: "guide",
    slug: brand.slug,
    title: guide.title,
    subtitle: `${brand.display?.default?.name ?? brand.name} · ${guide.path}`,
    text: guide.excerpt,
    url: `brand.html?brand=${brand.slug}`,
  }));
  return [...base, ...guides];
});
const librarySearchPayload = [
  ...librarySnapshots.organizations.map((organization) => ({
    type: "organization",
    slug: organization.id,
    title: organization.name,
    subtitle: [organization.sourcePublisher, organization.rank ? `#${organization.rank}` : "", organization.industry].filter(Boolean).join(" · "),
    text: [organization.description, organization.country, organization.headquarters, organization.officialWebsite, organization.sourceUrl].filter(Boolean).join(" "),
    url: `library/?type=organizations&q=${encodeURIComponent(organization.name)}`,
  })),
  ...["cases", "reports", "datasets"].flatMap((collection) => librarySnapshots[collection].filter((item) => item.access !== "private").map((item) => ({
    type: item.type || collection.slice(0, -1),
    slug: item.slug || item.id,
    title: item.title?.zh || item.title?.en || item.slug || item.id,
    subtitle: [item.title?.en, item.sourcePublisher].filter(Boolean).join(" · "),
    text: [item.summary?.zh, item.summary?.en, item.sourceUrl, item.externalUrl].filter(Boolean).join(" "),
    url: `library/?type=${collection}&q=${encodeURIComponent(item.title?.zh || item.title?.en || item.slug || item.id)}`,
  }))),
];
const searchPayload = [...brandSearchPayload, ...librarySearchPayload];
await writeFile(join(apiDir, "brands.json"), JSON.stringify(indexPayload, null, 2));
const staticIps = [
  ...indexPayload.map((brand) => ({ slug: brand.slug, recordClass: "owned", ipType: brand.ipType, primaryIndustry: brand.primaryIndustry, industries: brand.industries, names: { zh: brand.display?.zh?.name || brand.name, en: brand.nativeName || (brand.mainLanguage === "en" ? brand.name : "") }, mainLanguage: brand.mainLanguage, lifecycleStatus: brand.lifecycleStatus, guidelineMode: brand.guidelineMode, parentCapable: brand.parentCapable, architectureRoles: brand.architectureRoles, sourceUrl: brand.sources?.[0]?.url || brand.officialWebsite || "", sourcePublisher: brand.sources?.[0]?.publisher || "", verificationStatus: brand.sources?.length ? "source-documented" : "provisional", logoUrl: brand.logoUrl || brand.heroImage || "", url: brand.url })),
  ...ipSystem.references.map((item) => ({ ...item, recordClass: "reference", lifecycleStatus: "active", guidelineMode: "independent", parentCapable: Boolean(item.parentCapable), architectureRoles: architectureRolesFor(item.slug, item.parentCapable), url: `ip?ip=${item.slug}` })),
];
await writeFile(join(apiDir, "taxonomy.json"), JSON.stringify(ipSystem.taxonomy, null, 2));
await writeFile(join(apiDir, "ips.json"), JSON.stringify({ items: staticIps, relationships: ipSystem.relationships, applications: ipSystem.applications }, null, 2));
await writeFile(join(apiDir, "search.json"), JSON.stringify(searchPayload, null, 2));
await writeFile(join(apiDir, "versions.json"), JSON.stringify(versions, null, 2));
await writeFile(join(apiDir, "schema.json"), JSON.stringify(apiSchemaPayload(), null, 2));
await writeFile(join(apiDir, "manifest.json"), JSON.stringify({
  name: hubName,
  description: hubDescription,
  display: {
    cn: { name: hubNameCn, description: hubDescription },
    en: { name: hubNameEn, description: hubDescriptionEn },
  },
  generatedAt: new Date().toISOString(),
  version: versions[0] ?? null,
  brands: indexPayload.map((brand) => ({
    slug: brand.slug,
    name: brand.mainName,
    mainLanguage: brand.mainLanguage,
    mainLocale: brand.mainLocale,
    apiUrl: `api/brands/${brand.slug}.json`,
    historyUrl: `api/history/${brand.slug}.json`,
    guideUrl: `brand.html?brand=${brand.slug}`,
  })),
  mcp: {
    local: "mcp/src/index.ts",
    remote: "mcp",
    transport: "Streamable HTTP",
    protocolVersion: "2025-11-25",
    resources: "api/brands/{slug}.json",
    tools: ["list_brands", "get_brand", "list_ips", "get_ip_graph", "list_ip_children", "list_ip_applications", "get_application", "search_library", "get_library_item", "list_assets", "get_asset", "request_asset_url"],
  },
  schema: {
    apiUrl: "api/schema.json",
    allFieldsCallable: true,
    perBrandHistory: "api/history/{slug}.json",
  },
  ipSystem: {
    name: "Brand IP System v2",
    path: "ip_sys.md",
    description: "Universal closed-loop framework for defining and governing any organization or brand IP.",
    directory: "directory/",
    taxonomy: "api/v2/taxonomy",
    ips: "api/v2/ips",
    relations: "api/v2/ip-relations",
    applications: "api/v2/applications",
  },
  library: {
    page: "library/",
    storage: "Cloudflare D1 with Git snapshots and R2 file objects",
    publicMetadata: true,
    counts: {
      organizations: librarySnapshots.organizations.length,
      cases: librarySnapshots.cases.filter((item) => item.access !== "private").length,
      reports: librarySnapshots.reports.filter((item) => item.access !== "private").length,
      datasets: librarySnapshots.datasets.filter((item) => item.access !== "private").length,
    },
    endpoints: {
      organizations: "api/library/organizations",
      cases: "api/library/cases",
      reports: "api/library/reports",
      datasets: "api/library/datasets",
      relations: "api/library/relations",
    },
    sources: librarySnapshots.sources,
  },
  skills: [{
    name: "iptrust-live-update",
    path: "skills/iptrust-live-update/SKILL.md",
    description: "Agent workflow for refreshing IP introductions from the latest brand source files.",
  }],
  history: {
    apiUrl: "api/versions.json",
    perBrandApiUrl: "api/history/{slug}.json",
    latest: versions[0] ?? null,
  },
  sync: {
    sourceOfTruth: `https://github.com/${repository.owner}/${repository.repo}`,
    githubToWebsite: "GitHub Pages rebuilds site/ on push to main.",
    websiteToGithub: "admin.html commits edits through the GitHub Contents API.",
  },
  locales: {
    default: "CN",
    available: ["CN", "EN"],
    storageKey: "iptrust-locale",
  },
}, null, 2));

await writeFile(join(siteDir, "_headers"), [
  "/*",
  "  X-Content-Type-Options: nosniff",
  "  Referrer-Policy: strict-origin-when-cross-origin",
  "  Permissions-Policy: camera=(), microphone=(), geolocation=()",
  "",
  "/",
  "  Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
  "",
  "/brand",
  "  Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
  "",
  "/directory/*",
  "  Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
  "",
  "/ip/*",
  "  Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
  "",
  "/application/*",
  "  Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
  "",
  "/*.html",
  "  Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
  "",
  "/admin",
  "  Cache-Control: private, no-store",
  "",
  "/admin.html",
  "  Cache-Control: private, no-store",
  "",
  "/ip-evolution",
  "  Content-Type: text/html; charset=utf-8",
  "  Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
  "",
  "/library/*",
  "  Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
  "",
  "/assets/site-*.css",
  "  Cache-Control: public, max-age=31536000, immutable",
  "",
  "/assets/site-*.js",
  "  Cache-Control: public, max-age=31536000, immutable",
  "",
  "/assets/site.css",
  "  Cache-Control: public, max-age=0, must-revalidate",
  "",
  "/assets/site.js",
  "  Cache-Control: public, max-age=0, must-revalidate",
  "",
  "/assets/editorial.css",
  "  Cache-Control: public, max-age=0, must-revalidate",
  "",
  "/assets/brand-images/*",
  "  Cache-Control: public, max-age=86400, stale-while-revalidate=604800",
  "",
  "/assets/adobe/*",
  "  Cache-Control: public, max-age=86400, stale-while-revalidate=604800",
  "",
  "/api/private/*",
  "  Cache-Control: no-store",
  "",
  "/api/*",
  "  Cache-Control: public, max-age=300, stale-while-revalidate=86400",
  "",
  "/llms.txt",
  "  Cache-Control: public, max-age=300, stale-while-revalidate=86400",
  "",
  "/skills/*",
  "  Cache-Control: public, max-age=300, stale-while-revalidate=86400",
  "",
].join("\n"));

await writeFile(join(siteDir, "_redirects"), [
  "/llms  /llms.txt  200",
  "/manifest  /api/manifest.json  200",
  "/schema  /api/schema.json  200",
  "/brands  /api/brands.json  200",
  "/knowledge  /library/index.html  200",
  "/library  /library/index.html  200",
  "/ip-system  /ip_sys.md  200",
  "",
].join("\n"));

await writeFile(join(siteDir, "_routes.json"), JSON.stringify({
  version: 1,
  include: [
    "/api/v2/*",
    "/mcp",
    "/assets/brand-images/*",
    "/assets/adobe/*",
    "/assets/contact/*",
  ],
  exclude: [],
}, null, 2));

await writeFile(join(siteDir, "_worker.js"), `const EDGE_ORIGIN = "https://edge.apuch.art";

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const upstream = new URL(\`${'${incoming.pathname}${incoming.search}'}\`, EDGE_ORIGIN);
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.set("X-IPTrust-Gateway", "pages");
    const response = await fetch(new Request(upstream, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
      redirect: "manual",
    }));
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("X-IPTrust-Edge", "pages-gateway");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
`);

await writeFile(join(siteDir, "llms.txt"), [
  `# ${hubName}`,
  "",
  hubDescription,
  `English name: ${hubNameEn}`,
  `English: ${hubDescriptionEn}`,
  "",
  "Machine-readable entry points:",
  "- /api/manifest.json",
  "- /api/schema.json",
  "- /api/brands.json",
  "- /api/brands/{slug}.json",
  "- /api/history/{slug}.json",
  "- /api/search.json",
  "- /api/versions.json",
  "- /api/library/organizations",
  "- /api/library/cases",
  "- /api/library/reports",
  "- /api/library/datasets",
  "- /api/library/relations",
  "- /library/",
  "- /mcp (MCP Streamable HTTP, protocol 2025-11-25)",
  "- /ip_sys.md",
  "- /skills/iptrust-live-update/SKILL.md",
  "",
  "Brands:",
  ...indexPayload.map((brand) => `- ${brand.mainName} (${brand.slug}): /api/brands/${brand.slug}.json · mainLocale ${brand.mainLocale} · palette ${brand.theme?.primary ?? "n/a"} / ${brand.theme?.accent ?? "n/a"}`),
  "",
  "Admin workflow:",
  "- /admin.html unlocks with the generated admin key.",
  "- Edits are committed back to GitHub via the GitHub Contents API.",
  "- GitHub Pages rebuilds from main after changes land.",
].join("\n"));

await writeFile(join(siteDir, "favicon.svg"), html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="10" fill="#0A1626"/>
  <path d="M16 18h32v28H16z" fill="none" stroke="#A88B52" stroke-width="3"/>
  <path d="M24 26h16M24 34h16M24 42h10" stroke="#FFFFFF" stroke-width="3" stroke-linecap="square"/>
</svg>`);

const topbarIcon = {
  agent: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.75v2.5"/><rect x="5" y="7" width="14" height="10" rx="4"/><path d="M8.5 17.5 7 20"/><path d="M15.5 17.5 17 20"/><path d="M9 11.25h.01"/><path d="M15 11.25h.01"/><path d="M10 14h4"/></svg>`,
  partner: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 7.5a4 4 0 1 1-2.2 5.78L4 22l-2-2 8.72-9.3A4 4 0 0 1 15.5 7.5Z"/><path d="m14 14 2 2"/><path d="m17 11 2 2"/></svg>`,
  collab: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v11H4z"/><path d="m4 7 8 6 8-6"/></svg>`,
  api: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7V3"/><path d="M15 7V3"/><path d="M7 7h10v5a5 5 0 0 1-10 0V7Z"/><path d="M12 17v4"/><path d="M8.5 21h7"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.25 2.4 3.38 5.4 3.38 9S14.25 18.6 12 21"/><path d="M12 3C9.75 5.4 8.62 8.4 8.62 12S9.75 18.6 12 21"/></svg>`,
};

function initialThemeStyle(theme = {}) {
  return Object.entries({
    "--brand-primary": theme.primary,
    "--brand-accent": theme.accent,
    "--brand-secondary": theme.secondary,
    "--brand-surface": theme.surface,
    "--brand-paper": theme.paper,
    "--brand-ink": theme.ink,
  })
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
}

const initialCopyIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="2"></rect><path d="M5 15V7a2 2 0 0 1 2-2h8"></path></svg>`;
const initialHeroIndexHtml = indexPayload.map((brand, idx) => {
  const primaryName = brand.mainName || brand.name;
  const localized = brand.mainLanguage === "zh" ? brand.display?.zh : brand.display?.en;
  const secondary = localized?.secondaryName || "";
  const colors = [brand.theme?.primary, brand.theme?.accent, brand.theme?.secondary].filter(Boolean).slice(0, 3);
  return `<div class="hero-index-row" data-brand="${escapeBuildHtml(brand.slug)}" style="${initialThemeStyle(brand.theme)};--row-index:${idx}">
    <a class="hero-index-link" href="${escapeBuildHtml(brand.url)}">
      <span class="hero-index-title">${escapeBuildHtml(primaryName)}${secondary ? ` <span class="hero-index-secondary">· ${escapeBuildHtml(secondary)}</span>` : ""}</span>
    </a>
    <span class="hero-index-colors" aria-hidden="true">${colors.map((value) => `<span class="color-dot" style="--dot:${escapeBuildHtml(value)}"></span>`).join("")}</span>
    <span class="icon-copy" aria-hidden="true">${initialCopyIcon}</span>
  </div>`;
}).join("");
const publicOrganizationCount = librarySnapshots.organizations.length;
const fortuneCount = librarySnapshots.organizations.filter((item) => item.sourceId === "fortune-global-500-2025").length;
const sasacCount = librarySnapshots.organizations.filter((item) => item.sourceId === "sasac-central-enterprises-2026").length;

await writeFile(join(siteDir, "index.html"), html`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${hubName}</title>
  <meta name="description" content="${hubDescription}">
  <link rel="preconnect" href="https://media.apuch.art" crossorigin>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${siteCssPath}">
  <link rel="stylesheet" href="assets/editorial.css?v=${buildVersion}">
</head>
<body class="hub-home">
  <header class="topbar">
    <a class="brand" href="./" aria-label="${hubNameCn}"><img src="${hubLogoUrl}" alt="${hubNameCn}"></a>
    <div class="topbar-search" role="search">
      <input id="brandSearch" type="search" autocomplete="off" aria-label="Search IP">
      <div class="global-results" id="globalResults" aria-live="polite"></div>
    </div>
    <nav class="top-actions" aria-label="Primary actions">
      <button class="api-link" type="button" id="apiConnectButton" aria-label="API connect"><span class="api-dot"></span>API</button>
      <a href="./#agent-entry" data-i18n="portal.agentNav">Agent</a>
      <a href="./#partner-entry" data-i18n="portal.partnerNav">Partner</a>
      <a href="./#collab-entry" data-i18n="portal.collabNav">Collab</a>
      <button class="lang-toggle" type="button" id="langToggle" aria-label="Switch language"><span class="is-active">CN</span><span class="lang-divider">/</span><span>EN</span></button>
    </nav>
  </header>
  <section class="api-connect-panel hidden" id="apiConnectPanel" aria-live="polite">
    <div class="api-connect-head">
      <div>
        <p class="eyebrow">API</p>
        <h2 data-i18n="api.title">连接 System API</h2>
      </div>
      <button class="icon-copy" type="button" id="apiConnectClose" data-icon-only="true" aria-label="Close">×</button>
    </div>
    <form class="api-connect-form" id="apiConnectForm" autocomplete="on">
      <label><span data-i18n="api.key">System API Key</span><input id="apiAdminKey" name="admin_api_key" type="password" autocomplete="current-password" placeholder="System API Key" spellcheck="false"></label>
      <label class="hidden" id="apiTotpField"><span>Google Authenticator</span><input id="apiTotpCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label>
      <button class="portal-action" type="submit" id="apiConnectSubmit" data-i18n="api.connect">Connect</button>
    </form>
    <p class="portal-status" id="apiConnectStatus"></p>
    <div class="api-ops hidden" id="apiConnectedOps">
      <strong class="connected-pill" data-i18n="api.connected">Connected</strong>
      <p class="muted" id="apiScopeText"></p>
      <div class="portal-links">
        <a href="admin.html" data-i18n="api.openAdmin">Admin</a>
        <a href="api/manifest.json">Manifest</a>
        <a href="api/brands.json">Brands</a>
        <a href="api/search.json">Search</a>
        <a href="api/media/">Media</a>
        <button class="api-copy" type="button" id="apiResourcesButton" data-i18n="api.resources">Resources</button>
        <button class="api-copy" type="button" data-api-copy="manifest" data-i18n="api.copyCurl">Copy cURL</button>
      </div>
      <pre class="api-resource-summary hidden" id="apiResourceSummary"></pre>
    </div>
  </section>
  <main>
    <section class="hub-hero">
      <div class="hero-copy">
        <h1 data-i18n="hub.name">${hubNameCn}</h1>
        <p data-i18n="home.lead">高楼宾客似曾识，日光底下无新事。</p>
      </div>
      <div class="hero-index" id="heroIndex" aria-live="polite">${initialHeroIndexHtml}</div>
    </section>
    <section class="evolution-entry" id="ip-evolution" aria-labelledby="evolutionTitle">
      <a href="ip-evolution" class="evolution-link">
        <div class="evolution-copy">
          <p class="eyebrow" data-i18n="evolution.label">IP进化论</p>
          <h2 id="evolutionTitle" data-i18n="evolution.title">让品牌成为可管理的系统。</h2>
        </div>
        <div class="evolution-path" aria-label="IP Evolution framework">
          <span data-i18n="evolution.architecture">架构</span>
          <span data-i18n="evolution.core">内核</span>
          <span data-i18n="evolution.expression">表达</span>
          <span data-i18n="evolution.assets">资产</span>
          <span data-i18n="evolution.governance">治理</span>
        </div>
        <span class="evolution-open" aria-hidden="true">&#8599;</span>
      </a>
    </section>
    <section class="library-entry" id="knowledge-library" aria-labelledby="libraryTitle">
      <a href="library/" class="library-entry-link">
        <div class="library-entry-copy">
          <p class="eyebrow" data-i18n="library.label">公共知识库</p>
          <h2 id="libraryTitle" data-i18n="library.title">让出处、案例与数据彼此连接。</h2>
        </div>
        <div class="library-entry-stats" aria-label="Library coverage">
          <span><strong>${publicOrganizationCount}</strong><small data-i18n="library.organizations">组织</small></span>
          <span><strong>${fortuneCount}</strong><small>Fortune 500</small></span>
          <span><strong>${sasacCount}</strong><small data-i18n="library.centralEnterprises">中央企业</small></span>
          <span><strong>4</strong><small data-i18n="library.modules">关联模块</small></span>
        </div>
        <span class="library-entry-open" aria-hidden="true">&#8599;</span>
      </a>
    </section>
    <section class="entry-portals" aria-label="IPTrust entries">
      <article class="portal" id="agent-entry">
        <p class="eyebrow">Agent</p>
        <h3 data-i18n="portal.agentTitle">我是 Agent</h3>
        <p data-i18n="portal.agentBody">复制 Skill。</p>
        <button class="portal-action" type="button" data-portal-action="agent" data-portal-href="skills/iptrust-live-update/SKILL.md" data-i18n="portal.agentAction">Skill</button>
        <p class="portal-status" data-portal-status="agent" aria-live="polite"></p>
      </article>
      <article class="portal" id="partner-entry">
        <p class="eyebrow">Partner</p>
        <h3 data-i18n="portal.partnerTitle">我是合伙人</h3>
        <p data-i18n="portal.partnerBody">Key first.</p>
        <button class="portal-action" type="button" data-portal-action="partner" data-portal-href="admin.html" data-i18n="portal.partnerAction">Key first</button>
        <p class="portal-status" data-portal-status="partner" aria-live="polite"></p>
      </article>
      <article class="portal" id="collab-entry">
        <p class="eyebrow">Collab</p>
        <h3 data-i18n="portal.collabTitle">我想合作</h3>
        <p data-i18n="portal.collabBody">Email</p>
        <button class="portal-action" type="button" data-portal-action="collab" data-portal-href="mailto:hi@tableai.ai" data-i18n="portal.collabAction">Email</button>
        <p class="portal-status" data-portal-status="collab" aria-live="polite"></p>
      </article>
    </section>
    <section class="section-head">
      <div>
        <h2 data-i18n="home.sectionTitle">IP</h2>
      </div>
      <div class="section-actions"><a class="directory-shortcut" href="directory">筛选 / Filter</a><span id="brandCount" class="count-pill"></span></div>
    </section>
    <section class="ip-grid" id="brandGrid" aria-live="polite"></section>
  </main>
  <script src="${siteJsPath}" type="module"></script>
</body>
</html>`);

await writeFile(join(siteDir, "ip-evolution"), html`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="./">
  <title>IP进化论 | ${hubName}</title>
  <meta name="description" content="IP进化论把品牌架构、内核、表达、资产与治理连接成可持续更新的系统。">
  <link rel="preconnect" href="https://media.apuch.art" crossorigin>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${siteCssPath}">
  <link rel="stylesheet" href="assets/editorial.css?v=${buildVersion}">
</head>
<body class="ip-system-page">
  <header class="topbar">
    <a class="brand" href="./" aria-label="${hubNameCn}"><img src="${hubLogoUrl}" alt="${hubNameCn}"></a>
    <div class="topbar-search" role="search">
      <input id="brandSearch" type="search" autocomplete="off" aria-label="Search IP">
      <div class="global-results" id="globalResults" aria-live="polite"></div>
    </div>
    <nav class="top-actions" aria-label="Primary actions">
      <button class="api-link" type="button" id="apiConnectButton" aria-label="API connect"><span class="api-dot"></span>API</button>
      <a href="./#agent-entry" data-i18n="portal.agentNav">Agent</a>
      <a href="./#partner-entry" data-i18n="portal.partnerNav">Partner</a>
      <a href="./#collab-entry" data-i18n="portal.collabNav">Collab</a>
      <button class="lang-toggle" type="button" id="langToggle" aria-label="Switch language"><span class="is-active">CN</span><span class="lang-divider">/</span><span>EN</span></button>
    </nav>
  </header>
  <section class="api-connect-panel hidden" id="apiConnectPanel" aria-live="polite">
    <div class="api-connect-head">
      <div><p class="eyebrow">API</p><h2 data-i18n="api.title">连接 System API</h2></div>
      <button class="icon-copy" type="button" id="apiConnectClose" data-icon-only="true" aria-label="Close">×</button>
    </div>
    <form class="api-connect-form" id="apiConnectForm" autocomplete="on">
      <label><span data-i18n="api.key">System API Key</span><input id="apiAdminKey" name="admin_api_key" type="password" autocomplete="current-password" placeholder="System API Key" spellcheck="false"></label>
      <label class="hidden" id="apiTotpField"><span>Google Authenticator</span><input id="apiTotpCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label>
      <button class="portal-action" type="submit" id="apiConnectSubmit" data-i18n="api.connect">Connect</button>
    </form>
    <p class="portal-status" id="apiConnectStatus"></p>
    <div class="api-ops hidden" id="apiConnectedOps">
      <strong class="connected-pill" data-i18n="api.connected">Connected</strong>
      <p class="muted" id="apiScopeText"></p>
      <div class="portal-links">
        <a href="admin.html" data-i18n="api.openAdmin">Admin</a>
        <a href="api/manifest.json">Manifest</a>
        <a href="api/brands.json">Brands</a>
        <a href="api/search.json">Search</a>
        <a href="api/media/">Media</a>
        <button class="api-copy" type="button" id="apiResourcesButton" data-i18n="api.resources">Resources</button>
        <button class="api-copy" type="button" data-api-copy="manifest" data-i18n="api.copyCurl">Copy cURL</button>
      </div>
      <pre class="api-resource-summary hidden" id="apiResourceSummary"></pre>
    </div>
  </section>
  <main class="ip-system-main">
    <section class="ip-system-hero">
      <p class="eyebrow" data-i18n="evolution.label">IP进化论</p>
      <h1 data-i18n="evolution.pageTitle">让品牌持续进化。</h1>
      <p data-i18n="evolution.pageLead">架构、内核、表达、资产与治理，构成可管理、可调用、可持续更新的闭环。</p>
      <div class="ip-system-actions">
        <a class="button" href="#framework" data-i18n="evolution.readFramework">查看完整系统</a>
        <a class="button ghost" href="./#brandGrid" data-i18n="evolution.applyToIp">选择一个 IP</a>
      </div>
    </section>
    <section class="ip-system-layers" aria-label="IP Evolution layers">
      <article><strong data-i18n="evolution.architecture">架构</strong><p data-i18n="evolution.architectureBody">先判断品牌关系与命名层级。</p></article>
      <article><strong data-i18n="evolution.core">内核</strong><p data-i18n="evolution.coreBody">明确使命、受众、定位与主张。</p></article>
      <article><strong data-i18n="evolution.expression">表达</strong><p data-i18n="evolution.expressionBody">统一语言、视觉、声音与行为。</p></article>
      <article><strong data-i18n="evolution.assets">资产</strong><p data-i18n="evolution.assetsBody">把系统转化为人和 Agent 可调用的资产。</p></article>
      <article><strong data-i18n="evolution.governance">治理</strong><p data-i18n="evolution.governanceBody">记录版本、衡量偏差并持续回修。</p></article>
    </section>
    <section class="ip-system-content-shell" id="framework">
      <aside class="ip-system-toc" aria-label="IP System contents">
        <strong data-i18n="evolution.frameworkTitle">完整系统</strong>
        <nav>${ipSystemTocHtml}</nav>
      </aside>
      <article class="rendered-document ip-system-document">
        ${ipSystemDocumentHtml}
      </article>
    </section>
    <section class="ip-system-loop">
      <p data-i18n="evolution.loop">识别品牌，建立系统，生成资产，回收反馈，再次进化。</p>
    </section>
  </main>
  <script src="${siteJsPath}" type="module"></script>
</body>
</html>`);

await writeFile(join(siteDir, "brand.html"), html`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Brand Guidelines</title>
  <link rel="preconnect" href="https://media.apuch.art" crossorigin>
  <script>try{const slug=new URLSearchParams(location.search).get("brand");if(slug){const link=document.createElement("link");link.rel="preload";link.as="fetch";link.href="api/brands/"+encodeURIComponent(slug)+".json";document.head.append(link)}}catch{}</script>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${siteCssPath}">
  <link rel="stylesheet" href="assets/editorial.css?v=${buildVersion}">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="./" aria-label="${hubNameCn}"><img src="${hubLogoUrl}" alt="${hubNameCn}"></a>
    <div class="topbar-search" role="search">
      <input id="brandSearch" type="search" autocomplete="off" aria-label="Search IP">
      <div class="global-results" id="globalResults" aria-live="polite"></div>
    </div>
    <nav class="top-actions" aria-label="Primary actions">
      <button class="api-link" type="button" id="apiConnectButton" aria-label="API connect"><span class="api-dot"></span>API</button>
      <a href="./#agent-entry" data-i18n="portal.agentNav">Agent</a>
      <a href="./#partner-entry" data-i18n="portal.partnerNav">Partner</a>
      <a href="./#collab-entry" data-i18n="portal.collabNav">Collab</a>
      <button class="lang-toggle" type="button" id="langToggle" aria-label="Switch language"><span class="is-active">CN</span><span class="lang-divider">/</span><span>EN</span></button>
    </nav>
  </header>
  <section class="api-connect-panel hidden" id="apiConnectPanel" aria-live="polite">
    <div class="api-connect-head">
      <div>
        <p class="eyebrow">API</p>
        <h2 data-i18n="api.title">连接 System API</h2>
      </div>
      <button class="icon-copy" type="button" id="apiConnectClose" data-icon-only="true" aria-label="Close">×</button>
    </div>
    <form class="api-connect-form" id="apiConnectForm" autocomplete="on">
      <label><span data-i18n="api.key">System API Key</span><input id="apiAdminKey" name="admin_api_key" type="password" autocomplete="current-password" placeholder="System API Key" spellcheck="false"></label>
      <label class="hidden" id="apiTotpField"><span>Google Authenticator</span><input id="apiTotpCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label>
      <button class="portal-action" type="submit" id="apiConnectSubmit" data-i18n="api.connect">Connect</button>
    </form>
    <p class="portal-status" id="apiConnectStatus"></p>
    <div class="api-ops hidden" id="apiConnectedOps">
      <strong class="connected-pill" data-i18n="api.connected">Connected</strong>
      <p class="muted" id="apiScopeText"></p>
      <div class="portal-links">
        <a href="admin.html" data-i18n="api.openAdmin">Admin</a>
        <a href="api/manifest.json">Manifest</a>
        <a href="api/brands.json">Brands</a>
        <a href="api/search.json">Search</a>
        <a href="api/media/">Media</a>
        <button class="api-copy" type="button" id="apiResourcesButton" data-i18n="api.resources">Resources</button>
        <button class="api-copy" type="button" data-api-copy="manifest" data-i18n="api.copyCurl">Copy cURL</button>
      </div>
      <pre class="api-resource-summary hidden" id="apiResourceSummary"></pre>
    </div>
  </section>
  <main id="brandPage" class="brand-page" aria-live="polite"></main>
  <script src="${siteJsPath}" type="module"></script>
</body>
</html>`);

function directoryPage({ kind, title, mountId }) {
  return html`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <base href="../">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} · ${hubName}</title>
  <link rel="preconnect" href="https://media.apuch.art" crossorigin>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${siteCssPath}">
  <link rel="stylesheet" href="assets/editorial.css?v=${buildVersion}">
</head>
<body data-page="${kind}">
  <header class="topbar">
    <a class="brand" href="./" aria-label="${hubNameCn}"><img src="${hubLogoUrl}" alt="${hubNameCn}"></a>
    <div class="topbar-search" role="search"><input id="brandSearch" type="search" autocomplete="off" aria-label="Search IP"><div class="global-results" id="globalResults" aria-live="polite"></div></div>
    <nav class="top-actions" aria-label="Primary actions">
      <a href="directory" aria-current="${kind === "directory" ? "page" : "false"}">Directory</a>
      <button class="api-link" type="button" id="apiConnectButton" aria-label="API connect"><span class="api-dot"></span>API</button>
      <a href="./#agent-entry">Agent</a><a href="./#partner-entry">Partner</a><a href="./#collab-entry">Collab</a>
      <button class="lang-toggle" type="button" id="langToggle" aria-label="Switch language"><span class="is-active">CN</span><span class="lang-divider">/</span><span>EN</span></button>
    </nav>
  </header>
  <main id="${mountId}" class="directory-main" aria-live="polite"></main>
  <script src="${siteJsPath}" type="module"></script>
</body>
</html>`;
}

await mkdir(join(siteDir, "directory"), { recursive: true });
await mkdir(join(siteDir, "ip"), { recursive: true });
await mkdir(join(siteDir, "application"), { recursive: true });
await writeFile(join(siteDir, "directory", "index.html"), directoryPage({ kind: "directory", title: "IP Directory", mountId: "directoryPage" }));
await writeFile(join(siteDir, "ip", "index.html"), directoryPage({ kind: "ip", title: "IP", mountId: "ipRecordPage" }));
await writeFile(join(siteDir, "application", "index.html"), directoryPage({ kind: "application", title: "Application", mountId: "applicationPage" }));

await writeFile(join(siteDir, "admin.html"), html`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <base href="../">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin · ${hubName}</title>
  <link rel="preconnect" href="https://media.apuch.art" crossorigin>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${siteCssPath}">
  <link rel="stylesheet" href="assets/editorial.css?v=${buildVersion}">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="./" aria-label="${hubNameCn}"><img src="${hubLogoUrl}" alt="${hubNameCn}"></a>
    <div class="topbar-search" role="search">
      <input id="brandSearch" type="search" autocomplete="off" aria-label="Search IP">
      <div class="global-results" id="globalResults" aria-live="polite"></div>
    </div>
    <nav class="top-actions" aria-label="Primary actions">
      <button class="api-link" type="button" id="apiConnectButton" aria-label="API connect"><span class="api-dot"></span>API</button>
      <a href="./#agent-entry" data-i18n="portal.agentNav">Agent</a>
      <a href="./#partner-entry" data-i18n="portal.partnerNav">Partner</a>
      <a href="./#collab-entry" data-i18n="portal.collabNav">Collab</a>
      <button class="lang-toggle" type="button" id="langToggle" aria-label="Switch language"><span class="is-active">CN</span><span class="lang-divider">/</span><span>EN</span></button>
    </nav>
  </header>
  <section class="api-connect-panel hidden" id="apiConnectPanel" aria-live="polite">
    <div class="api-connect-head">
      <div>
        <p class="eyebrow">API</p>
        <h2 data-i18n="api.title">连接 System API</h2>
      </div>
      <button class="icon-copy" type="button" id="apiConnectClose" data-icon-only="true" aria-label="Close">×</button>
    </div>
    <form class="api-connect-form" id="apiConnectForm" autocomplete="on">
      <label><span data-i18n="api.key">System API Key</span><input id="apiAdminKey" name="admin_api_key" type="password" autocomplete="current-password" placeholder="System API Key" spellcheck="false"></label>
      <label class="hidden" id="apiTotpField"><span>Google Authenticator</span><input id="apiTotpCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label>
      <button class="portal-action" type="submit" id="apiConnectSubmit" data-i18n="api.connect">Connect</button>
    </form>
    <p class="portal-status" id="apiConnectStatus"></p>
    <div class="api-ops hidden" id="apiConnectedOps">
      <strong class="connected-pill" data-i18n="api.connected">Connected</strong>
      <p class="muted" id="apiScopeText"></p>
      <div class="portal-links">
        <a href="admin.html" data-i18n="api.openAdmin">Admin</a>
        <a href="api/manifest.json">Manifest</a>
        <a href="api/brands.json">Brands</a>
        <a href="api/search.json">Search</a>
        <a href="api/media/">Media</a>
        <button class="api-copy" type="button" id="apiResourcesButton" data-i18n="api.resources">Resources</button>
        <button class="api-copy" type="button" data-api-copy="manifest" data-i18n="api.copyCurl">Copy cURL</button>
      </div>
      <pre class="api-resource-summary hidden" id="apiResourceSummary"></pre>
    </div>
  </section>
  <main class="admin">
    <section class="panel" id="unlockPanel">
      <p class="eyebrow" data-i18n="nav.admin">管理</p>
      <h1 data-i18n="admin.unlockTitle">AI 原生管理</h1>
      <p class="muted admin-lead" data-i18n="admin.unlockBody">通过 AI 原生的方式，一站式管理你的品牌和 IP。</p>
      <label><span data-i18n="admin.keyLabel">Key</span><input id="adminKey" type="password" autocomplete="current-password"></label>
      <label><span data-i18n="admin.totpLabel">Google Authenticator</span><input id="totpCode" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" maxlength="8" placeholder="000000"></label>
      <button id="unlockButton" data-i18n="admin.unlockButton">继续</button>
      <p class="notice" id="unlockStatus"></p>
    </section>
    <section class="panel hidden" id="editorPanel">
      <div class="admin-heading"><div><p class="eyebrow">IPTrust OS</p><h1>管理中枢</h1></div><span class="connected-pill">Connected</span></div>
      <nav class="admin-tabs" aria-label="Admin sections">
        <button class="is-active" data-admin-tab="overview">概览</button><button data-admin-tab="ips">IP</button><button data-admin-tab="architecture">品牌架构</button><button data-admin-tab="applications">项目应用</button><button data-admin-tab="assets">资产</button><button data-admin-tab="library">资料库</button><button data-admin-tab="jobs">任务</button><button data-admin-tab="audit">审计</button><button data-admin-tab="keys">API Keys</button>
      </nav>
      <section class="admin-view" data-admin-view="overview"><div class="admin-stats" id="adminStats"></div><div class="service-health" id="serviceHealth"></div></section>
      <section class="admin-view hidden" data-admin-view="ips">
        <div class="admin-toolbar"><label><span>IP</span><select id="brandSelect"></select></label><button id="loadBrand">载入</button></div>
        <div class="form-grid">
          <label><span>中文名称</span><input id="ipNameZh"></label><label><span>English name</span><input id="ipNameEn"></label>
          <label><span>主语言</span><select id="ipMainLanguage"><option value="zh">中文</option><option value="en">English</option></select></label><label><span>IP 类型</span><select id="ipType"></select></label>
          <label><span>主行业</span><select id="ipPrimaryIndustry"></select></label><label><span>其他行业</span><select id="ipIndustries" multiple></select></label>
          <label><span>生命周期</span><select id="ipLifecycle"><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label><label><span>规范模式</span><select id="ipGuideline"><option value="independent">Independent</option><option value="inherit">Inherit</option><option value="extend">Extend</option></select></label>
          <label><span>品牌架构</span><span class="checkbox-line"><input id="ipParentCapable" type="checkbox"> 可作为母 IP</span></label>
        </div>
        <div class="actions"><button id="saveIp">保存字段</button><button class="ghost" id="saveBrand">保存品牌内容</button></div>
        <details class="advanced-editor"><summary>高级 · Raw JSON</summary><textarea id="editor" spellcheck="false" placeholder="Brand JSON"></textarea></details>
        <p class="muted" id="recordVersion"></p>
      </section>
      <section class="admin-view hidden" data-admin-view="architecture"><div class="admin-split"><form id="relationForm"><h2>连接 IP</h2><label>母 IP<select id="relationParent"></select></label><label>子 IP<select id="relationChild"></select></label><label>关系<select id="relationType"><option value="brand_parent">主母 IP</option><option value="endorsed_by">背书</option><option value="operated_by">运营</option><option value="licensed_by">授权</option><option value="member_of">成员</option><option value="co_branded_with">联合品牌</option></select></label><button>建立关系</button></form><div id="relationList"></div></div></section>
      <section class="admin-view hidden" data-admin-view="applications"><div class="admin-split"><form id="applicationForm"><div class="admin-form-heading"><h2 id="applicationFormTitle">新增项目应用</h2><button class="ghost" type="button" id="newApplication">新建</button></div><label>Slug<input id="applicationSlug"></label><label>中文名称<input id="applicationNameZh"></label><label>English name<input id="applicationNameEn"></label><label>类型<select id="applicationType"></select></label><label>主 IP<select id="applicationPrimary"></select></label><label>规范模式<select id="applicationGuideline"><option value="inherit">Inherit</option><option value="extend">Extend</option><option value="independent">Independent</option></select></label><label>中文简介<textarea id="applicationDescriptionZh"></textarea></label><label>English intro<textarea id="applicationDescriptionEn"></textarea></label><label>中文业务<textarea id="applicationBusinessZh"></textarea></label><label>English business<textarea id="applicationBusinessEn"></textarea></label><div class="form-grid"><label>省份<input id="applicationProvince"></label><label>城市<input id="applicationCity"></label></div><button id="saveApplication">保存应用</button></form><div id="applicationList"></div></div></section>
      <section class="admin-view hidden" data-admin-view="assets"><div id="assetList"></div></section>
      <section class="admin-view hidden" data-admin-view="library"><p>案例、报告、数据与公共品牌库通过资料库 API 管理。</p><a class="button" href="library/">打开资料库</a></section>
      <section class="admin-view hidden" data-admin-view="jobs"><div id="jobList"></div></section>
      <section class="admin-view hidden" data-admin-view="audit"><div id="auditList"></div></section>
      <section class="admin-view hidden" data-admin-view="keys"><div class="step-up"><label>Google Authenticator<input id="stepUpTotp" inputmode="numeric" maxlength="6" placeholder="000000"></label><button id="stepUpButton">验证 10 分钟</button></div><div class="admin-split"><form id="keyForm"><h2>创建 API Key</h2><label>名称<input id="keyLabel" required></label><label>类型<select id="keyKind"><option value="service">Service</option><option value="partner">Partner</option><option value="agent">Agent</option></select></label><label>Scopes<input id="keyScopes" value="brands:read,ips:read,assets:read"></label><label>IP 范围<input id="keyIpScopes" value="*"></label><button>创建 Key</button><pre class="new-key-token hidden" id="newKeyToken"></pre></form><div id="keyList"></div></div></section>
      <p class="notice" id="editorStatus"></p>
    </section>
  </main>
  <script src="${siteJsPath}" type="module"></script>
  <script src="assets/admin.js" type="module"></script>
</body>
</html>`);

await mkdir(join(siteDir, "admin"), { recursive: true });
await copyFile(join(siteDir, "admin.html"), join(siteDir, "admin", "index.html"));

await writeFile(join(assetsDir, "site.css"), html`:root {
  color-scheme: light;
  --bg: #f2f0eb;
  --paper: #fffefa;
  --ink: #161412;
  --muted: #66635d;
  --line: rgba(22, 20, 18, .13);
  --accent: #9a7a3f;
  --blue: #0a1626;
  --green: #0e8c7b;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--ink);
  background: var(--bg);
}
.hub-home {
  background:
    linear-gradient(180deg, rgba(255, 254, 250, .92), rgba(242, 240, 235, .98) 42%),
    var(--bg);
}
a { color: inherit; }
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 18px clamp(18px, 4vw, 48px);
  border-bottom: 1px solid var(--line);
  background: rgba(255, 254, 250, .82);
  backdrop-filter: blur(16px);
  position: sticky;
  top: 0;
  z-index: 10;
}
.brand { font-weight: 750; text-decoration: none; letter-spacing: 0; }
.topbar-search {
  flex: 1 1 420px;
  max-width: 520px;
  position: relative;
}
.topbar-search input {
  width: 100%;
  min-height: 38px;
  border-radius: 999px;
  background:
    linear-gradient(90deg, rgba(255, 254, 250, .92), rgba(255, 254, 250, .72)),
    var(--paper);
  border-color: color-mix(in srgb, var(--line) 82%, var(--blue));
  padding: 0 16px;
  font-size: 14px;
}
.topbar-search input:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 4px rgba(10, 22, 38, .08);
}
nav { display: flex; align-items: center; gap: 18px; color: var(--muted); font-size: 14px; }
nav a { text-decoration: none; }
nav a:hover { color: var(--ink); }
.top-actions {
  gap: 16px;
  flex: 0 0 auto;
  white-space: nowrap;
}
.top-actions a,
.top-actions button {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--muted);
  padding: 0;
  font: inherit;
  font-weight: 640;
  text-decoration: none;
  cursor: pointer;
  transition: color .16s ease;
}
.top-actions a:hover,
.top-actions a:focus-visible,
.top-actions button:hover,
.top-actions button:focus-visible { color: var(--ink); }
.api-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.api-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--muted);
  opacity: .56;
  box-shadow: 0 0 0 3px transparent;
  transition: background .16s ease, opacity .16s ease, box-shadow .16s ease;
}
.api-link:hover .api-dot,
.api-link:focus-visible .api-dot,
.api-link.api-connected .api-dot {
  background: #0E8C7B;
  opacity: 1;
  box-shadow: 0 0 0 3px rgba(14, 140, 123, .12);
}
.api-link.api-connected { color: #0E8C7B; }
.lang-toggle {
  min-height: 0;
  font: inherit;
  font-weight: 750;
}
.lang-toggle .lang-code {
  position: absolute;
  right: 4px;
  bottom: 3px;
  color: inherit;
  font-size: 8px;
  font-weight: 860;
  letter-spacing: 0;
  opacity: 0;
}
.lang-toggle .lang-code.is-active { opacity: 1; }
.api-connect-panel {
  position: fixed;
  right: clamp(14px, 4vw, 48px);
  top: 74px;
  z-index: 30;
  width: min(330px, calc(100vw - 28px));
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--green) 18%, var(--line));
  border-radius: 18px;
  background: rgba(255, 254, 250, .92);
  box-shadow: 0 18px 56px rgba(22, 20, 18, .12);
  backdrop-filter: blur(22px);
}
.api-connect-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.api-connect-head .eyebrow { display: none; }
.api-connect-head h2 {
  font-size: 13px;
  line-height: 1;
  margin: 0;
  letter-spacing: 0;
}
.api-connect-panel.is-connected #apiConnectStatus { display: none; }
.api-connect-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 8px;
  margin-top: 10px;
}
.api-connect-form label {
  margin: 0;
  gap: 5px;
}
.api-connect-form label span {
  color: var(--muted);
  font-size: 10px;
  font-weight: 760;
  letter-spacing: .06em;
  text-transform: uppercase;
}
.api-connect-form input {
  min-height: 34px;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 13px;
  background: rgba(255, 255, 255, .72);
}
.api-connect-form .portal-action {
  min-height: 34px;
  margin: 0;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
}
.api-ops {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}
.connected-pill {
  justify-self: start;
  border: 1px solid rgba(14, 140, 123, .24);
  border-radius: 999px;
  padding: 5px 9px;
  color: #0E8C7B;
  background: rgba(14, 140, 123, .08);
  font-size: 11px;
}
.api-ops .muted {
  margin: 0;
  font-size: 11px;
  line-height: 1.3;
}
.api-ops .portal-links {
  gap: 6px;
  margin-top: 2px;
}
.api-ops .portal-links a,
.api-ops .api-copy {
  padding: 5px 8px;
  font-size: 11px;
}
.api-copy {
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 760;
  padding: 7px 10px;
  background: rgba(255, 254, 250, .7);
}
.api-copy:hover { border-color: var(--green); color: var(--green); }
.api-resource-summary {
  max-height: 260px;
  overflow: auto;
  margin: 12px 0 0;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255,255,255,.74);
  font-size: 12px;
  white-space: pre-wrap;
}
main { width: min(1180px, calc(100vw - 36px)); margin: 0 auto; }
.hub-hero {
  min-height: 54vh;
  display: grid;
  grid-template-columns: minmax(0, .92fr) minmax(340px, .78fr);
  gap: clamp(24px, 4vw, 42px);
  align-items: center;
  padding: clamp(34px, 6vw, 72px) 0 24px;
}
.hero-copy { max-width: 760px; }
.eyebrow { color: var(--accent); font-size: 12px; font-weight: 760; text-transform: uppercase; letter-spacing: .18em; }
h1 { font-size: clamp(54px, 7.2vw, 74px); line-height: .96; margin: 8px 0 16px; letter-spacing: 0; max-width: 980px; }
h2 { font-size: clamp(26px, 3.5vw, 34px); line-height: 1.08; margin: 0 0 8px; letter-spacing: 0; }
h3 { margin: 0 0 8px; }
p { line-height: 1.65; }
.hub-hero p:not(.eyebrow), .muted { color: var(--muted); font-size: 16px; max-width: 640px; }
.hero-index {
  display: grid;
  gap: 8px;
  align-self: center;
  max-height: min(520px, 58vh);
  overflow: auto;
  padding: 2px 10px 2px 0;
  border-top: 0;
  perspective: 1200px;
  mask-image: linear-gradient(to bottom, transparent, #000 24px, #000 calc(100% - 24px), transparent);
  scrollbar-width: none;
}
.hero-index::-webkit-scrollbar { display: none; }
.hero-index-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content max-content;
  align-items: center;
  gap: 12px;
  border: 1px solid color-mix(in srgb, var(--brand-primary, var(--blue)) 16%, transparent);
  border-radius: 999px;
  color: var(--brand-primary);
  padding: 8px 8px 8px 14px;
  font-size: 14px;
  font-weight: 760;
  text-decoration: none;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--brand-primary, var(--blue)) 7%, transparent), rgba(255, 254, 250, .42) 54%, transparent),
    rgba(255, 254, 250, .32);
  box-shadow: 0 10px 34px rgba(22, 20, 18, .045);
  transform: translate3d(calc((var(--row-index, 0) % 2) * 10px), 10px, 0);
  opacity: 0;
  animation: row-flow .64s cubic-bezier(.2,.8,.2,1) forwards;
  animation-delay: calc(var(--row-index, 0) * 32ms);
  transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
}
.hero-index-link {
  display: block;
  color: inherit;
  min-width: 0;
  overflow: hidden;
  text-decoration: none;
}
.hero-index-row:hover {
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--brand-primary, var(--blue)) 14%, transparent), rgba(255, 254, 250, .68) 62%, transparent),
    rgba(255, 254, 250, .56);
  box-shadow: 0 14px 42px rgba(22, 20, 18, .08);
  transform: translate3d(6px, -1px, 0);
}
.hero-index-title {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hero-index-secondary {
  color: color-mix(in srgb, currentColor 68%, var(--muted));
  font-size: 12px;
  font-weight: 690;
}
.hero-index-colors {
  display: flex;
  flex: 0 0 auto;
  gap: 5px;
}
.hero-index-row .icon-copy { flex: 0 0 auto; }
.color-dot {
  width: 18px;
  height: 18px;
  min-height: 18px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, .14);
  border-radius: 999px;
  background: var(--dot);
  cursor: pointer;
  position: relative;
}
.color-dot.copied { outline: 2px solid var(--brand-primary, var(--blue)); outline-offset: 2px; }
.color-dot::after {
  content: attr(data-color-tooltip);
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  width: max-content;
  max-width: 220px;
  padding: 6px 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--ink);
  color: var(--paper);
  font-size: 11px;
  line-height: 1.3;
  opacity: 0;
  pointer-events: none;
  white-space: nowrap;
  transition: opacity .14s ease;
  z-index: 20;
}
.color-dot:hover::after,
.color-dot:focus-visible::after { opacity: 1; }
.icon-copy {
  width: 30px;
  height: 30px;
  min-height: 30px;
  padding: 0;
  border-radius: 999px;
  border-color: var(--brand-line, var(--line));
  background: color-mix(in srgb, var(--brand-paper, white) 88%, var(--brand-primary, var(--blue)));
  color: var(--brand-primary, var(--blue));
  display: grid;
  place-items: center;
}
.icon-copy svg { width: 15px; height: 15px; stroke: currentColor; stroke-width: 2; fill: none; }
.icon-copy:hover,
.icon-copy.copied { background: var(--brand-primary, var(--blue)); color: var(--brand-button-text, white); }
.icon-copy.copied {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--brand-primary, var(--blue)) 16%, transparent);
}
@keyframes row-rise {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes row-flow {
  to { opacity: 1; transform: translate3d(calc((var(--row-index, 0) % 2) * 6px), 0, 0); }
}
.section-head {
  display: flex;
  justify-content: space-between;
  gap: 28px;
  align-items: end;
  padding: 10px 0 18px;
  border-top: 1px solid var(--line);
}
.evolution-entry {
  padding: 6px 0 34px;
}
.evolution-link {
  display: grid;
  grid-template-columns: minmax(220px, .9fr) minmax(360px, 1.1fr) auto;
  align-items: center;
  gap: clamp(22px, 4vw, 58px);
  min-height: 124px;
  padding: 22px 0;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  text-decoration: none;
  transition: color .2s ease, padding .28s cubic-bezier(.2,.8,.2,1);
}
.evolution-link:hover,
.evolution-link:focus-visible {
  color: var(--blue);
  padding-left: 10px;
  padding-right: 10px;
}
.evolution-copy h2 {
  max-width: 440px;
  margin: 7px 0 0;
  font-size: clamp(26px, 3vw, 38px);
  text-wrap: balance;
}
.evolution-copy .eyebrow { margin: 0; }
.evolution-path {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: center;
  gap: 0;
  color: var(--muted);
  font-size: 13px;
  font-weight: 720;
}
.evolution-path span {
  position: relative;
  padding-right: 18px;
  white-space: nowrap;
}
.evolution-path span:not(:last-child)::after {
  content: "/";
  position: absolute;
  right: 7px;
  color: var(--line);
}
.evolution-open {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 20px;
  transition: transform .2s ease, background .2s ease, color .2s ease;
}
.evolution-link:hover .evolution-open,
.evolution-link:focus-visible .evolution-open {
  transform: translate(2px, -2px);
  background: var(--blue);
  color: var(--paper);
}
.library-entry { padding: 0 0 34px; }
.library-entry-link {
  display: grid;
  grid-template-columns: minmax(260px, .8fr) minmax(440px, 1.2fr) auto;
  align-items: stretch;
  min-height: 150px;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--ink);
  color: var(--ink);
  text-decoration: none;
}
.library-entry-copy { display: grid; align-content: center; padding: 22px 28px 22px 0; }
.library-entry-copy h2 { max-width: 480px; margin: 8px 0 0; font-size: clamp(24px, 2.5vw, 34px); line-height: 1.04; text-wrap: balance; }
.library-entry-copy .eyebrow { margin: 0; }
.library-entry-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-left: 1px solid var(--line); }
.library-entry-stats span { display: grid; align-content: center; gap: 7px; padding: 18px; border-right: 1px solid var(--line); }
.library-entry-stats strong { font: 800 clamp(24px, 3vw, 42px)/.9 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.library-entry-stats small { color: var(--muted); font-size: 11px; font-weight: 720; }
.library-entry-open { display: grid; width: 54px; place-items: center; font-size: 22px; transition: background .2s ease, color .2s ease; }
.library-entry-link:hover .library-entry-open,
.library-entry-link:focus-visible .library-entry-open { background: var(--ink); color: var(--paper); }
.library-entry-link:hover .library-entry-copy h2,
.library-entry-link:focus-visible .library-entry-copy h2 { color: var(--blue); }
.entry-portals {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(12px, 2vw, 20px);
  padding: 8px 0 34px;
}
.portal {
  border-top: 1px solid color-mix(in srgb, var(--ink) 18%, transparent);
  padding: 14px 0 0;
  min-height: 136px;
  display: grid;
  align-content: start;
}
.portal h3 {
  font-size: 21px;
  line-height: 1.1;
  margin: 8px 0 6px;
}
.portal p:not(.eyebrow) {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.35;
  margin: 0;
}
.portal-action {
  justify-self: start;
  margin-top: 16px;
  border: 1px solid var(--ink);
  background: var(--ink);
  color: var(--paper);
  min-height: 38px;
  padding: 9px 14px;
}
.portal-action:hover,
.portal-action.copied {
  background: var(--blue);
  border-color: var(--blue);
}
.portal-status {
  min-height: 18px;
  margin-top: 8px !important;
  color: var(--ink) !important;
  font-size: 12px !important;
  font-weight: 720;
}
.portal-points {
  display: grid;
  gap: 5px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}
.portal-points li::before {
  content: "+";
  margin-right: 6px;
  color: var(--blue);
  font-weight: 900;
}
.collab-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 108px;
  gap: 14px;
  align-items: end;
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 254, 250, .72);
}
.collab-mail {
  color: var(--ink);
  font-size: 17px;
  font-weight: 860;
  text-decoration: none;
}
.collab-mail:hover { color: var(--blue); }
.collab-card img {
  width: 108px;
  height: 108px;
  object-fit: contain;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: white;
}
.portal-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.portal-links a {
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 760;
  padding: 7px 10px;
  text-decoration: none;
  background: rgba(255, 254, 250, .7);
}
.portal-links a:hover { border-color: var(--blue); }
.ip-system-main { padding-bottom: 90px; }
.ip-system-hero {
  min-height: 58vh;
  display: grid;
  align-content: end;
  padding: clamp(64px, 10vw, 128px) 0 clamp(36px, 6vw, 72px);
  border-bottom: 1px solid var(--ink);
}
.ip-system-hero h1 {
  max-width: 1050px;
  margin: 12px 0 18px;
  font-size: clamp(48px, 6.2vw, 78px);
}
.ip-system-hero > p:not(.eyebrow) {
  max-width: 620px;
  margin: 0;
  color: var(--muted);
  font-size: clamp(18px, 2vw, 24px);
}
.ip-system-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
.ip-system-layers { display: grid; }
.ip-system-layers article {
  display: grid;
  grid-template-columns: minmax(150px, .35fr) minmax(0, 1fr);
  gap: 30px;
  padding: 24px 0;
  border-bottom: 1px solid var(--line);
}
.ip-system-layers strong { font-size: clamp(23px, 3vw, 34px); }
.ip-system-layers p {
  align-self: center;
  max-width: 620px;
  margin: 0;
  color: var(--muted);
  font-size: 16px;
}
.ip-system-content-shell {
  display: grid;
  grid-template-columns: minmax(170px, .28fr) minmax(0, 1fr);
  gap: clamp(36px, 7vw, 92px);
  align-items: start;
  padding: clamp(70px, 10vw, 132px) 0 20px;
}
.ip-system-toc {
  position: sticky;
  top: 96px;
  display: grid;
  gap: 18px;
  max-height: calc(100vh - 120px);
  overflow: auto;
  padding-right: 12px;
}
.ip-system-toc > strong {
  font-size: 13px;
  letter-spacing: .06em;
}
.ip-system-toc nav {
  display: grid;
  align-items: start;
  gap: 10px;
  width: 100%;
}
.ip-system-toc a {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.35;
  text-decoration: none;
}
.ip-system-toc a:hover,
.ip-system-toc a:focus-visible { color: var(--ink); }
.rendered-document {
  min-width: 0;
  max-width: 860px;
  color: var(--ink);
}
.rendered-document > :first-child { margin-top: 0; }
.rendered-document h1 {
  max-width: 820px;
  margin: 0 0 30px;
  font-size: clamp(36px, 5vw, 64px);
  line-height: 1.04;
}
.rendered-document h2 {
  margin: clamp(64px, 9vw, 108px) 0 22px;
  padding-top: 22px;
  border-top: 1px solid var(--ink);
  font-size: clamp(28px, 4vw, 42px);
}
.rendered-document h3 {
  margin: 42px 0 16px;
  font-size: clamp(21px, 2.4vw, 28px);
}
.rendered-document h4 {
  margin: 28px 0 12px;
  font-size: 18px;
}
.rendered-document p,
.rendered-document li {
  color: color-mix(in srgb, var(--ink) 82%, var(--muted));
  font-size: 16px;
  line-height: 1.85;
}
.rendered-document ul,
.rendered-document ol { padding-left: 1.35em; }
.rendered-document li + li { margin-top: 7px; }
.rendered-document blockquote {
  margin: 28px 0;
  padding: 4px 0 4px 20px;
  border-left: 2px solid var(--accent);
}
.rendered-document blockquote p { color: var(--muted); }
.rendered-document table {
  display: block;
  width: 100%;
  margin: 24px 0 36px;
  overflow-x: auto;
  border-collapse: collapse;
  font-size: 14px;
}
.rendered-document th,
.rendered-document td {
  min-width: 132px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
  line-height: 1.55;
}
.rendered-document th {
  color: var(--ink);
  font-weight: 800;
  border-bottom-color: var(--ink);
}
.rendered-document code {
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: .9em;
}
.rendered-document pre code { color: inherit; }
.brand-guide-document {
  max-width: 920px;
}
.guide-rendered {
  padding: clamp(24px, 4vw, 48px);
}
.guide-rendered > .eyebrow { margin: 0 0 22px; }
.ip-system-loop {
  padding: clamp(54px, 8vw, 100px) 0 0 clamp(0px, 14vw, 170px);
}
.ip-system-loop p {
  max-width: 760px;
  margin: 0;
  font-size: clamp(28px, 4vw, 48px);
  font-weight: 760;
  line-height: 1.15;
}
.history-panel {
  display: grid;
  grid-template-columns: minmax(220px, .44fr) minmax(0, 1fr);
  gap: 28px;
  padding: 4px 0 42px;
}
.version-list {
  display: grid;
  gap: 8px;
  border-top: 1px solid var(--line);
}
.version-item {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--line);
  padding: 10px 0;
  color: var(--muted);
  font-size: 13px;
  text-decoration: none;
}
.version-item strong { color: var(--ink); }
.version-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.section-head h2 { max-width: 560px; }
.count-pill {
  flex: 0 0 auto;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 9px 11px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 760;
  background: rgba(255, 254, 250, .72);
}
.global-results {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: min(560px, calc(100vw - 36px));
  max-height: 420px;
  overflow: auto;
  display: none;
  z-index: 8;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 254, 250, .96);
  box-shadow: 0 18px 60px rgba(22, 20, 18, .14);
}
.global-results.is-open { display: grid; }
.global-result {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-bottom: 1px solid var(--line);
  text-decoration: none;
}
.global-result:last-child { border-bottom: 0; }
.global-result strong { color: var(--ink); }
.global-result small { color: var(--accent); font-weight: 760; }
.global-result span {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}
.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
.button, button {
  appearance: none;
  border: 1px solid var(--blue);
  background: var(--blue);
  color: white;
  text-decoration: none;
  padding: 11px 15px;
  min-height: 42px;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
}
.button.ghost { background: transparent; color: var(--blue); }
.lang-toggle {
  min-height: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-weight: 750;
}
.ip-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 14px 0 88px;
}
.empty-state {
  grid-column: 1 / -1;
  padding: 34px 0;
  border-top: 1px solid var(--line);
  color: var(--muted);
}
.card, .panel, .guide, .resource {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.ip-card {
  overflow: hidden;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 330px;
  background: var(--brand-paper, var(--paper));
  border-color: var(--brand-line, var(--line));
  color: var(--brand-ink, var(--ink));
  position: relative;
  border: 1px solid var(--brand-line, var(--line));
  border-radius: 8px;
  transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease;
}
.ip-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  background: var(--brand-primary, var(--accent));
  z-index: 2;
}
.ip-card:hover { transform: translateY(-5px); border-color: var(--brand-primary, var(--line)); box-shadow: 0 22px 60px rgba(22, 20, 18, .12); }
.ip-card.theme-dark { background: var(--brand-paper); color: var(--brand-ink); }
.ip-card-link {
  color: inherit;
  display: flex;
  flex: 1;
  min-height: 100%;
  text-decoration: none;
}
.ip-card[data-brand="sidera"],
.ip-card[data-brand="manaendless"] { background: var(--brand-paper); }
.ip-card[data-brand="fengzhi"] { border-radius: 0; }
.ip-card[data-brand="kind"] { border-radius: 18px; }
.ip-card[data-brand="vanahom"]::before { width: 3px; }
.brand-sigil {
  align-self: flex-end;
  min-width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid var(--brand-line);
  background: color-mix(in srgb, var(--brand-paper) 88%, transparent);
  color: var(--brand-primary);
  font-weight: 800;
}
.ip-card[data-brand="sidera"] .brand-sigil { background: var(--brand-secondary); color: var(--brand-ink); }
.ip-card[data-brand="kind"] .brand-sigil { border-radius: 999px; }
.ip-card[data-brand="fengzhi"] .brand-sigil { border-radius: 0; }
.card-body { padding: 14px; display: flex; flex-direction: column; gap: 12px; min-height: 100%; }
.card-art {
  min-height: 150px;
  border: 1px solid var(--brand-line, var(--line));
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 22%, color-mix(in srgb, var(--brand-accent) 78%, transparent) 0 10%, transparent 28%),
    linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 24%, var(--brand-paper)) 0%, var(--brand-paper) 48%, color-mix(in srgb, var(--brand-secondary) 25%, var(--brand-paper)) 100%);
}
.card-art::before {
  content: "";
  position: absolute;
  inset: 14px;
  border: 1px solid color-mix(in srgb, var(--brand-primary) 38%, transparent);
  border-radius: 999px 999px 6px 6px;
  transform: rotate(-8deg);
}
.card-art::after {
  content: "";
  position: absolute;
  inset: auto 14px 14px auto;
  width: 44%;
  aspect-ratio: 1;
  border: 1px solid color-mix(in srgb, var(--brand-accent) 50%, transparent);
  background:
    linear-gradient(90deg, transparent 49%, color-mix(in srgb, var(--brand-primary) 30%, transparent) 50%, transparent 51%),
    linear-gradient(0deg, transparent 49%, color-mix(in srgb, var(--brand-primary) 30%, transparent) 50%, transparent 51%);
  opacity: .72;
}
.ip-card[data-brand="tableai"] .card-art {
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--brand-primary) 18%, transparent) 1px, transparent 1px),
    linear-gradient(0deg, color-mix(in srgb, var(--brand-primary) 12%, transparent) 1px, transparent 1px),
    linear-gradient(135deg, var(--brand-paper), color-mix(in srgb, var(--brand-accent) 24%, var(--brand-paper)));
  background-size: 26px 26px, 26px 26px, auto;
}
.ip-card[data-brand="vanahom"] .card-art::before { border-radius: 6px; transform: rotate(0); inset: 20px 42px; }
.ip-card[data-brand="kind"] .card-art::before { border-radius: 999px; inset: 18px 44px 16px 18px; }
.ip-card[data-brand="apha"] .card-art::before { border-radius: 60% 40% 50% 50%; transform: rotate(14deg); }
.ip-card[data-brand="manaendless"] .card-art,
.ip-card[data-brand="sidera"] .card-art,
.ip-card[data-brand="rgd"] .card-art {
  background:
    radial-gradient(circle at 70% 18%, color-mix(in srgb, var(--brand-accent) 62%, transparent) 0 9%, transparent 24%),
    linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 26%, var(--brand-paper)), var(--brand-paper));
}
.ip-card[data-brand="fengzhi"] .card-art::before { border-radius: 0; transform: rotate(0); inset: 22px; }
.ip-card[data-brand="axisee"] .card-art::after { width: 34%; border-radius: 999px; }
.ip-card[data-brand="boya"] .card-art::before { border-radius: 6px 999px 999px 6px; transform: rotate(-16deg); }
.art-code {
  position: absolute;
  left: 14px;
  bottom: 12px;
  color: var(--brand-primary);
  font-weight: 840;
  font-size: 13px;
}
.art-metric {
  position: absolute;
  right: 14px;
  top: 12px;
  color: var(--brand-ink);
  font-size: 12px;
  font-weight: 760;
}
.mini-palette { display: flex; gap: 6px; margin-top: 2px; }
.mini-swatch {
  width: 24px;
  height: 8px;
  border-radius: 999px;
  background: var(--dot);
  border: 1px solid rgba(0, 0, 0, .1);
}
.card-body .eyebrow { color: var(--brand-primary, var(--accent)); }
.card-body .muted, .card-body p { color: var(--brand-muted, var(--muted)); }
.card-body h2 { color: var(--brand-ink, var(--ink)); font-size: 30px; line-height: 1.02; margin: 2px 0 0; padding-right: 48px; }
.alt-name {
  min-height: 20px;
  font-size: 13px;
  letter-spacing: .02em;
}
.card-intro {
  font-size: 13px;
  line-height: 1.45;
  color: var(--brand-muted, var(--muted));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 38px;
}
.card-profile {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: var(--brand-muted, var(--muted));
}
.card-profile span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.profile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 14px 0 4px;
}
.profile-tags span {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  border: 1px solid var(--brand-line, var(--line));
  border-radius: 999px;
  padding: 4px 8px;
  color: var(--brand-primary, var(--blue));
  background: color-mix(in srgb, var(--brand-paper, white) 78%, transparent);
  font-size: 12px;
  font-weight: 720;
}
.copy-reference {
  position: absolute;
  right: 14px;
  top: 14px;
  z-index: 3;
  min-height: 32px;
  max-width: 72px;
  padding: 7px 9px;
  border-radius: 999px;
  border-color: var(--brand-line, var(--line));
  background: color-mix(in srgb, var(--brand-paper, white) 86%, var(--brand-primary, var(--blue)));
  color: var(--brand-ink, var(--ink));
  font-size: 12px;
  line-height: 1;
}
.copy-reference:hover,
.copy-reference.copied {
  background: var(--brand-primary, var(--blue));
  border-color: var(--brand-primary, var(--blue));
  color: var(--brand-button-text, white);
}
.copy-manual {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 40;
  width: min(420px, calc(100vw - 36px));
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
  box-shadow: 0 18px 60px rgba(22, 20, 18, .18);
}
.copy-manual textarea {
  min-height: 120px;
  margin: 0;
  font-size: 12px;
}
.copy-manual button {
  width: 34px;
  min-height: 34px;
  padding: 0;
}
.toast-stack {
  position: fixed;
  right: clamp(16px, 3vw, 32px);
  bottom: clamp(16px, 3vw, 32px);
  display: grid;
  gap: 10px;
  z-index: 50;
  pointer-events: none;
}
.toast {
  max-width: min(360px, calc(100vw - 32px));
  padding: 11px 13px;
  border: 1px solid rgba(255, 255, 255, .34);
  border-radius: 8px;
  background: rgba(10, 22, 38, .92);
  color: white;
  box-shadow: 0 16px 42px rgba(10, 22, 38, .22);
  backdrop-filter: blur(14px);
  font-size: 13px;
  font-weight: 760;
  line-height: 1.35;
  opacity: 0;
  transform: translateY(8px);
  animation: toast-in .18s ease forwards;
}
.toast.is-leaving { animation: toast-out .18s ease forwards; }
@keyframes toast-in {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes toast-out {
  to { opacity: 0; transform: translateY(8px); }
}
.meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; color: var(--muted); font-size: 13px; }
.pill {
  border: 1px solid var(--brand-line, var(--line));
  border-radius: 999px;
  padding: 4px 8px;
  background: color-mix(in srgb, var(--brand-primary, var(--blue)) 7%, var(--brand-paper, white));
  color: var(--brand-ink, var(--ink));
}
.swatches { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 10px; }
.swatch {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, .16);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .2);
}
.swatch-label { font-size: 12px; color: var(--brand-muted, var(--muted)); }
.brand-page { padding: 36px 0 90px; }
.brand-shell {
  margin: -36px calc((100vw - min(1180px, calc(100vw - 36px))) / -2) -90px;
  padding: 42px max(18px, calc((100vw - 1180px) / 2)) 90px;
  background: var(--brand-surface, var(--bg));
  color: var(--brand-ink, var(--ink));
  min-height: calc(100vh - 76px);
}
.brand-shell.theme-dark .top-note,
.brand-shell.theme-dark p,
.brand-shell.theme-dark .muted { color: var(--brand-muted); }
.brand-shell .eyebrow { color: var(--brand-primary, var(--accent)); }
.brand-shell h1, .brand-shell h2, .brand-shell h3 { color: var(--brand-ink, var(--ink)); }
.brand-shell .button {
  background: var(--brand-primary, var(--blue));
  border-color: var(--brand-primary, var(--blue));
  color: var(--brand-button-text, white);
}
.brand-shell .button.ghost {
  background: transparent;
  color: var(--brand-primary, var(--blue));
  border-color: var(--brand-primary, var(--blue));
}
.brand-shell.theme-dark .button.ghost { color: var(--brand-ink); border-color: var(--brand-line); }
.brand-hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(280px, .95fr); gap: clamp(22px, 4vw, 48px); align-items: center; margin-bottom: 28px; }
.brand-visual {
  min-height: clamp(240px, 32vw, 420px);
  display: grid;
  place-items: center;
  border: 1px solid var(--brand-line, var(--line));
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--brand-paper, white) 86%, transparent), color-mix(in srgb, var(--brand-surface, #f7f5ef) 82%, transparent)),
    var(--brand-paper, white);
  overflow: hidden;
}
.brand-visual img {
  width: 100%;
  height: 100%;
  max-height: 420px;
  object-fit: contain;
  padding: clamp(18px, 4vw, 54px);
  box-sizing: border-box;
}
.brand-assets {
  display: grid;
  gap: 10px;
  margin: 0 0 30px;
}
.adobe-assets { margin: 0 0 28px; border-top: 1px solid var(--brand-ink, var(--ink)); }
.adobe-assets-head { display: flex; align-items: end; justify-content: space-between; gap: 18px; padding: 18px 0; }
.adobe-assets-head h2 { margin: 5px 0 0; }
.adobe-source-file { display: grid; grid-template-columns: minmax(280px, .95fr) minmax(0, 1.05fr); border-top: 1px solid var(--brand-line, var(--line)); border-bottom: 1px solid var(--brand-line, var(--line)); background: var(--brand-paper, white); }
.adobe-source-preview { position: relative; min-height: 260px; border-right: 1px solid var(--brand-line, var(--line)); background: color-mix(in srgb, var(--brand-surface, #f5f3ee) 80%, white); }
.adobe-source-preview img { width: 100%; height: 100%; max-height: 390px; object-fit: contain; padding: 24px; box-sizing: border-box; }
.adobe-source-preview .asset-copy-button { position: absolute; top: 12px; right: 12px; }
.adobe-source-body { display: grid; align-content: center; padding: clamp(22px, 4vw, 48px); }
.adobe-source-body h3 { margin: 7px 0 8px; font-size: clamp(25px, 3vw, 38px); }
.adobe-source-meta { margin: 0; color: var(--brand-muted, var(--muted)); font: 650 11px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.adobe-downloads { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 24px; }
.adobe-downloads a { padding: 8px 10px; border: 1px solid var(--brand-line, var(--line)); color: var(--brand-ink, var(--ink)); font-size: 12px; font-weight: 750; text-decoration: none; }
.adobe-downloads a:hover { background: var(--brand-primary, var(--ink)); color: var(--brand-button-text, white); }
.asset-hub,
.mood-board,
.profile-editor,
.ip-system-panel {
  margin: 0 0 28px;
  padding: 18px;
  border: 1px solid var(--brand-line, var(--line));
  border-radius: 8px;
  background: color-mix(in srgb, var(--brand-paper, white) 82%, transparent);
}
.asset-hub-head,
.mood-head,
.profile-editor-head,
.ip-system-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.ip-system-panel p {
  margin: 0;
  color: var(--brand-muted, var(--muted));
}
.profile-editor[data-locked="true"] {
  opacity: .78;
}
.profile-editor[data-locked="true"] #profileEditButton {
  cursor: not-allowed;
}
.profile-edit-form {
  display: grid;
  gap: 14px;
}
.profile-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.profile-form-grid .span-2 { grid-column: 1 / -1; }
.profile-form-grid label {
  display: grid;
  gap: 6px;
  margin: 0;
}
.profile-form-grid label span {
  color: var(--brand-muted, var(--muted));
  font-size: 11px;
  font-weight: 780;
  text-transform: uppercase;
}
.profile-form-grid input,
.profile-form-grid select,
.profile-form-grid textarea {
  width: 100%;
  border: 1px solid var(--brand-line, var(--line));
  border-radius: 8px;
  background: color-mix(in srgb, var(--brand-paper, white) 86%, transparent);
  color: var(--brand-ink, var(--ink));
  padding: 10px 11px;
  font: inherit;
  font-size: 13px;
}
.profile-form-grid textarea {
  resize: vertical;
  line-height: 1.55;
}
.asset-key {
  font-size: 12px;
  color: var(--brand-muted, var(--muted));
}
.asset-key code,
.endpoint-card code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.endpoint-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
}
.endpoint-card {
  min-height: 86px;
  display: grid;
  align-content: space-between;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--brand-line, var(--line));
  border-radius: 8px;
  background: var(--brand-paper, white);
  color: var(--brand-ink, var(--ink));
  text-decoration: none;
}
.endpoint-card span,
.mood-keywords span {
  color: var(--brand-muted, var(--muted));
  font-size: 12px;
}
.endpoint-card strong { font-size: 13px; }
.endpoint-card code {
  color: var(--brand-primary, var(--blue));
  font-size: 11px;
  overflow-wrap: anywhere;
}
.mood-grid {
  display: grid;
  grid-template-columns: minmax(220px, .9fr) minmax(0, 1.1fr);
  gap: 18px;
}
.mood-colors {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.mood-color {
  min-height: 72px;
  display: grid;
  align-content: end;
  gap: 3px;
  padding: 10px;
  border: 1px solid var(--brand-line, var(--line));
  border-radius: 8px;
  background: var(--mood-color);
  color: var(--mood-ink, var(--brand-ink, var(--ink)));
}
.mood-color strong,
.mood-color code {
  font-size: 11px;
  line-height: 1;
}
.mood-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.mood-keywords span {
  border: 1px solid var(--brand-line, var(--line));
  border-radius: 999px;
  padding: 6px 9px;
  background: var(--brand-paper, white);
}
.brand-asset-strip {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 2px 0 12px;
}
.brand-asset {
  flex: 0 0 176px;
  min-width: 0;
  border: 1px solid var(--brand-line, var(--line));
  border-radius: 8px;
  background: var(--brand-paper, white);
  color: var(--brand-muted, var(--muted));
  overflow: hidden;
}
.brand-asset-link {
  height: 116px;
  border-bottom: 1px solid var(--brand-line, var(--line));
}
.brand-asset img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 10px;
  box-sizing: border-box;
}
.brand-asset-info {
  display: grid;
  gap: 4px;
  padding: 10px 11px 11px;
}
.brand-asset-name {
  overflow: hidden;
  color: var(--brand-ink, var(--ink));
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.brand-asset-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 6px;
  color: var(--brand-muted, var(--muted));
  font: 600 10px/1.25 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0;
}
.brand-asset-meta span + span::before {
  margin-right: 6px;
  content: "·";
}
.brand-asset-dimensions {
  display: block;
  flex-basis: 100%;
}
.brand-asset-dimensions::before { display: none; }
.resource-list { display: grid; gap: 14px; margin: 24px 0; }
.resource-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 24px 0; }
.resource, .guide {
  background: var(--brand-paper, var(--paper));
  color: var(--brand-ink, var(--ink));
  border-color: var(--brand-line, var(--line));
}
.resource { padding: 18px; }
.guide { margin: 18px 0; padding: 22px; }
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--brand-ink, #262626);
  background: color-mix(in srgb, var(--brand-surface, #f5f3ee) 82%, var(--brand-paper, white));
  padding: 18px;
  border-radius: 6px;
  border: 1px solid var(--brand-line, var(--line));
  max-height: 560px;
  overflow: auto;
}
.admin { max-width: 980px; padding: 42px 0 90px; }
.admin #unlockPanel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
  max-width: 760px;
  margin: clamp(24px, 7vw, 72px) auto 18px;
  padding: clamp(22px, 4vw, 38px);
}
.admin #unlockPanel .eyebrow,
.admin #unlockPanel h1,
.admin #unlockPanel .admin-lead,
.admin #unlockPanel label:nth-of-type(3),
.admin #unlockPanel button,
.admin #unlockPanel .notice {
  grid-column: 1 / -1;
}
.admin #unlockPanel h1 {
  font-size: clamp(36px, 5vw, 54px);
  margin: 4px 0 8px;
  line-height: 1;
  max-width: 680px;
}
.admin-lead {
  font-size: clamp(16px, 1.7vw, 18px);
  line-height: 1.5;
  max-width: 520px;
  margin: 0 0 14px;
}
.admin #unlockPanel label {
  max-width: none;
  margin: 8px 0;
}
.admin #unlockPanel select {
  min-height: 78px;
}
.admin #unlockPanel button {
  justify-self: start;
  margin-top: 2px;
}
.panel { padding: 24px; margin-bottom: 18px; }
.admin #editorPanel { max-width: 1180px; margin-inline: auto; background: transparent; border: 0; padding: 0; }
.admin-heading { display: flex; align-items: end; justify-content: space-between; border-bottom: 1px solid var(--ink); padding: 0 0 22px; }
.admin-heading h1 { margin: 3px 0 0; font-size: clamp(38px, 5vw, 68px); }
.admin-tabs { display: flex; gap: 0; overflow-x: auto; border-bottom: 1px solid var(--line); margin-bottom: 28px; }
.admin-tabs button { flex: 0 0 auto; padding: 14px 12px; color: var(--muted); background: transparent; border: 0; border-bottom: 2px solid transparent; border-radius: 0; }
.admin-tabs button.is-active { color: var(--ink); border-bottom-color: var(--ink); }
.admin-view { min-height: 400px; }
.admin-stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); border-top: 1px solid var(--line); }
.admin-stats article { min-height: 132px; display: flex; flex-direction: column; justify-content: space-between; padding: 18px 12px 18px 0; border-right: 1px solid var(--line); }
.admin-stats strong { font-size: clamp(28px, 4vw, 54px); line-height: 1; }
.admin-stats span { color: var(--muted); font-size: 12px; }
.service-health { display: flex; flex-wrap: wrap; gap: 8px; padding: 22px 0; }
.service-health span { display: inline-flex; align-items: center; gap: 7px; border: 1px solid var(--line); padding: 7px 10px; font: 700 11px/1 ui-monospace, monospace; }
.service-health i { width: 7px; height: 7px; border-radius: 50%; background: #b12137; }
.service-health .is-ok i { background: var(--green); }
.admin-toolbar { display: flex; align-items: end; gap: 12px; margin-bottom: 20px; }
.admin-toolbar label { min-width: 280px; margin: 0; }
.admin-toolbar button { min-height: 42px; }
.admin-split { display: grid; grid-template-columns: minmax(260px, .8fr) minmax(0, 1.5fr); gap: 48px; }
.admin-split form { border-top: 1px solid var(--ink); padding-top: 18px; }
.admin-form-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.admin-list-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; width: 100%; padding: 14px 0; border: 0; border-top: 1px solid var(--line); border-radius: 0; background: transparent; color: inherit; text-align: left; text-decoration: none; }
.admin-list-row[data-edit-application] { cursor: pointer; }
.admin-list-row span { color: var(--muted); font-size: 12px; }
.admin-list-row span strong { display: block; color: var(--ink); font-size: 14px; }
.admin-list-row small { display: block; margin-top: 4px; color: var(--muted); font-size: 11px; }
.admin-split textarea { min-height: 88px; resize: vertical; }
.new-key-token { overflow-wrap: anywhere; white-space: pre-wrap; border: 1px solid var(--line); padding: 12px; background: var(--paper); }
.advanced-editor { margin-top: 28px; border-top: 1px solid var(--line); }
.advanced-editor summary { cursor: pointer; padding: 14px 0; color: var(--muted); font-size: 12px; font-weight: 750; }
.step-up { display: flex; align-items: end; gap: 10px; margin-bottom: 24px; }
.step-up label { margin: 0; max-width: 240px; }
.hidden { display: none; }
label { display: grid; gap: 8px; font-size: 14px; font-weight: 700; margin: 12px 0; }
input, select, textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 11px 12px;
  font: inherit;
  background: white;
  color: var(--ink);
}
textarea { min-height: 520px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.55; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 18px; }
.notice { color: var(--green); font-weight: 700; }
.section-actions { display: flex; align-items: center; gap: 10px; }
.directory-shortcut { color: var(--muted); font-size: 12px; font-weight: 750; text-decoration: none; border-bottom: 1px solid var(--line); padding: 6px 0; }
.directory-main { width: min(1180px, calc(100% - 40px)); margin: 0 auto; padding: clamp(48px, 8vw, 108px) 0 100px; }
.directory-hero { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 24px; border-bottom: 1px solid var(--ink); padding-bottom: 28px; margin-bottom: 20px; }
.directory-hero .eyebrow { grid-column: 1 / -1; }
.directory-hero h1 { max-width: 760px; margin: 0; font-size: clamp(44px, 7vw, 92px); line-height: .92; }
.directory-hero > p:last-child { color: var(--muted); font: 700 12px/1 ui-monospace, monospace; }
.directory-filters { display: grid; grid-template-columns: minmax(180px, 1.6fr) repeat(4, minmax(132px, 1fr)) auto; gap: 8px; position: sticky; top: 74px; z-index: 4; padding: 12px 0; background: color-mix(in srgb, var(--bg) 94%, transparent); backdrop-filter: blur(14px); }
.directory-filters input, .directory-filters select, .directory-filters button { min-height: 42px; margin: 0; border-radius: 2px; }
.directory-list { border-top: 1px solid var(--line); }
.directory-row { display: grid; grid-template-columns: minmax(220px, 2fr) 1.15fr 1.15fr 1fr 24px; gap: 16px; align-items: center; min-height: 68px; border-bottom: 1px solid var(--line); text-decoration: none; transition: padding .2s ease, background .2s ease; }
.directory-row:hover { padding: 0 12px; background: var(--paper); }
.directory-row > span:not(.directory-name) { color: var(--muted); font-size: 12px; }
.directory-name { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.directory-name strong { font-size: 17px; }
.directory-name small { color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.application-directory { margin-top: 88px; border-top: 1px solid var(--ink); }
.application-directory header { padding: 28px 0 18px; }
.application-directory h2 { margin: 4px 0 0; }
.application-directory > a { display: grid; grid-template-columns: 1fr auto 24px; gap: 20px; padding: 18px 0; border-top: 1px solid var(--line); text-decoration: none; }
.record-detail { min-height: 58vh; display: flex; flex-direction: column; justify-content: flex-end; border-bottom: 1px solid var(--ink); padding-bottom: 38px; }
.record-detail h1 { max-width: 930px; margin: 10px 0; font-size: clamp(54px, 10vw, 128px); line-height: .9; overflow-wrap: anywhere; }
.record-secondary { color: var(--muted); font-size: clamp(18px, 2vw, 28px); }
.record-facts { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0; }
.record-facts > * { border: 1px solid var(--line); padding: 8px 11px; color: inherit; text-decoration: none; font-size: 12px; }
.application-details { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); margin-top: 42px; border-top: 1px solid var(--line); }
.application-details > div { min-height: 170px; padding: 18px 14px 18px 0; border-right: 1px solid var(--line); }
.application-details h2 { margin: 18px 0 8px; font-size: 19px; }
.application-details a { display: block; color: inherit; padding: 5px 0; font-size: 12px; }
.lineage-block, .brand-architecture { padding: 32px 0; border-bottom: 1px solid var(--brand-line, var(--line)); }
.lineage-block a { display: block; padding: 16px 0; border-top: 1px solid var(--line); font-size: 22px; text-decoration: none; }
.brand-architecture header { display: flex; justify-content: space-between; align-items: end; }
.brand-architecture h2 { margin: 0; font-size: clamp(28px, 4vw, 48px); }
.lineage-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 20px; border-top: 1px solid var(--brand-line, var(--line)); }
.lineage-grid a { display: grid; gap: 6px; padding: 18px 14px 18px 0; border-right: 1px solid var(--brand-line, var(--line)); color: inherit; text-decoration: none; }
.lineage-grid small { color: var(--brand-muted, var(--muted)); text-transform: uppercase; }
.lineage-grid strong { font-size: 17px; }
@media (max-width: 760px) {
  .topbar { align-items: flex-start; flex-direction: column; }
  .topbar-search { flex: 1 1 auto; width: 100%; max-width: none; order: 3; }
  nav { width: 100%; justify-content: space-between; gap: 10px; }
  .admin #unlockPanel { grid-template-columns: 1fr; }
  .admin-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .admin-split { grid-template-columns: 1fr; gap: 36px; }
  .admin-toolbar { align-items: stretch; flex-direction: column; }
  .admin-toolbar label { min-width: 0; width: 100%; }
  .hub-hero, .brand-hero, .form-grid { grid-template-columns: 1fr; }
  .resource-grid { grid-template-columns: 1fr; }
  .endpoint-grid, .mood-grid { grid-template-columns: 1fr; }
  .profile-form-grid { grid-template-columns: 1fr; }
  .adobe-source-file { grid-template-columns: 1fr; }
  .adobe-source-preview { min-height: 220px; border-right: 0; border-bottom: 1px solid var(--brand-line, var(--line)); }
  .hub-hero { min-height: auto; padding-top: 36px; }
  .hero-index { align-self: stretch; }
  .hero-index-row { grid-template-columns: minmax(0, 1fr) auto; }
  .hero-index-colors { display: none; }
  .entry-portals { grid-template-columns: 1fr; }
  .evolution-link { grid-template-columns: 1fr auto; gap: 18px; }
  .evolution-path { grid-column: 1 / -1; grid-row: 2; grid-template-columns: repeat(5, auto); justify-content: space-between; }
  .evolution-open { grid-column: 2; grid-row: 1; }
  .library-entry-link { grid-template-columns: 1fr auto; }
  .library-entry-copy { padding-right: 16px; }
  .library-entry-stats { grid-column: 1 / -1; grid-row: 2; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid var(--line); border-left: 0; }
  .library-entry-stats span { min-height: 82px; padding: 14px 0; }
  .library-entry-stats span:nth-child(2n) { padding-left: 14px; }
  .library-entry-open { grid-column: 2; grid-row: 1; }
  .ip-system-hero { min-height: auto; }
  .ip-system-layers article { grid-template-columns: 1fr; gap: 8px; }
  .ip-system-content-shell { grid-template-columns: 1fr; gap: 36px; }
  .ip-system-toc {
    position: static;
    max-height: none;
    padding: 0 0 22px;
    border-bottom: 1px solid var(--line);
  }
  .ip-system-toc nav {
    display: flex;
    gap: 8px 16px;
    overflow-x: auto;
    padding-bottom: 6px;
  }
  .ip-system-toc a { flex: 0 0 auto; }
  .ip-system-loop { padding-left: 0; }
  .collab-card { grid-template-columns: 1fr; align-items: start; }
  .history-panel { grid-template-columns: 1fr; }
  .version-item { grid-template-columns: 70px minmax(0, 1fr); }
  .version-item time { display: none; }
  .section-head { display: grid; align-items: start; }
  .ip-grid { grid-template-columns: 1fr; }
  .ip-card { min-height: 320px; }
  .directory-main { width: min(100% - 28px, 1180px); padding-top: 42px; }
  .directory-hero { grid-template-columns: 1fr; }
  .directory-filters { position: static; grid-template-columns: 1fr 1fr; }
  .directory-filters input { grid-column: 1 / -1; }
  .directory-row { grid-template-columns: minmax(0, 1fr) 22px; padding: 13px 0; }
  .directory-row > span:not(.directory-name) { display: none; }
  .directory-name { align-items: flex-start; flex-direction: column; gap: 3px; }
  .lineage-grid { grid-template-columns: 1fr; }
  .application-details { grid-template-columns: 1fr 1fr; }
  h1 { font-size: 40px; }
  h2 { font-size: 28px; }
  .card-body h2 { font-size: 24px; }
}
@media (min-width: 761px) {
  .evolution-copy h2 {
    max-width: none;
    white-space: nowrap;
    font-size: clamp(24px, 2.25vw, 32px);
  }
}
@media (min-width: 761px) and (max-width: 1080px) {
  .hub-hero { grid-template-columns: 1fr; min-height: auto; }
  .ip-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}`);
await copyFile(join(assetsDir, "site.css"), join(siteDir, siteCssPath));

await writeFile(join(assetsDir, "site.js"), html`const $ = (selector) => document.querySelector(selector);
const BUILD_VERSION = "${buildVersion}";

const i18n = {
  cn: {
    "hub.name": "岁知社",
    "hub.description": "岁知社 IPTrust 是一个面向人和 Agent 的 IP 品牌信任中枢。",
    "nav.manifest": "清单",
    "nav.admin": "管理",
    "nav.agent": "我是 Agent",
    "nav.partner": "我是合伙人",
    "nav.collab": "我想合作",
    "home.lead": "高楼宾客似曾识，日光底下无新事。",
    "home.openJson": "打开 JSON 索引",
    "home.adminEdit": "管理编辑",
    "home.systems": "IP 系统",
    "home.sectionTitle": "IP",
    "home.searchPlaceholder": "搜索 IP / Asset Key",
    "home.noResults": "没有匹配的 IP。",
    "library.label": "公共知识库",
    "library.title": "让出处、案例与数据彼此连接。",
    "library.organizations": "组织",
    "library.centralEnterprises": "中央企业",
    "library.modules": "关联模块",
    "status.documented": "已建档",
    "status.placeholder": "待建档",
    "meta.guides": "规范",
    "copy.reference": "复制",
    "copy.done": "已复制",
    "copy.selected": "已选中，请按 ⌘C / Ctrl+C 复制",
    "copy.fail": "复制失败",
    "copy.referenceDone": "已复制 IP Agent Reference",
    "copy.assetUrl": "复制资产地址",
    "copy.assetDone": "已复制资产地址",
    "copy.colorDone": "已复制色值",
    "copy.pantoneDone": "已复制 Pantone 近似值",
    "brand.openJson": "打开 JSON",
    "brand.source": "源文件",
    "brand.colors": "品牌颜色",
    "brand.website": "官网",
    "brand.mainLanguage": "主语言",
    "brand.business": "业务",
    "brand.intro": "简介",
    "brand.notes": "备注",
    "brand.tracks": "赛道",
    "brand.audiences": "人群",
    "brand.tags": "标签",
    "brand.blank": "未填写",
    "brand.editable": "可编辑源文件",
    "brand.tokens": "Token 文件",
    "brand.noneGuide": "暂无规范文件",
    "brand.noneTokens": "暂无 token 文件",
    "brand.assetHub": "IP 资产调用",
    "brand.assetKey": "IP ID",
    "brand.brandJson": "品牌 JSON",
    "brand.imageAssets": "图片资产",
    "brand.historyApi": "历史版本",
    "brand.agentUse": "Agent 调用",
    "brand.ipSystem": "IP System",
    "brand.ipSystemBody": "把品牌 IP 系统 v2 套用到当前 IP。",
    "brand.openIpSystem": "打开框架",
    "brand.copyIpSystem": "复制 Apply Brief",
    "brand.ipSystemCopied": "已复制 IP System Apply Brief",
    "brand.guideline": "品牌规范",
    "brand.moodBoard": "Mood Board",
    "brand.visualAssets": "视觉资产",
    "brand.adobeAssets": "Adobe 源文件",
    "brand.preview": "预览",
    "brand.original": "原始文件",
    "brand.exportPng": "PNG 导出",
    "brand.exportJpg": "JPG 导出",
    "brand.keywords": "关键词",
    "brand.editProfile": "编辑资料",
    "brand.edit": "编辑",
    "brand.name": "IP 名称",
    "brand.nativeName": "对照名称",
    "brand.description": "描述",
    "brand.saveProfile": "保存",
    "brand.cancelEdit": "取消",
    "brand.apiFirst": "连接 API 后编辑。",
    "brand.editReady": "已连接，可编辑。",
    "brand.editing": "编辑中。",
    "brand.saving": "保存中...",
    "brand.savedProfile": "已保存，等待部署。",
    "brand.saveFailed": "保存失败。",
    "portal.agentTitle": "我是 Agent",
    "portal.agentBody": "复制 Skill。",
    "portal.agentAction": "Skill",
    "portal.agentCopied": "已复制。打开 Skill。",
    "portal.partnerTitle": "我是合伙人",
    "portal.partnerBody": "Key first.",
    "portal.partnerAction": "Key first",
    "portal.partnerStatus": "请联系获取管理 API。",
    "portal.partnerPointApi": "API 可按单个或多个 IP 授权。",
    "portal.partnerPointLogin": "后台通过 API Key + Google Authenticator 登录。",
    "portal.collabTitle": "我想合作",
    "portal.collabBody": "hi@tableai.ai",
    "portal.collabAction": "Email",
    "portal.collabStatus": "正在打开邮箱。",
    "portal.openIps": "查看 IP",
    "portal.admin": "管理入口",
    "portal.github": "发起合作",
    "portal.explore": "先看 IP",
    "portal.searchApi": "搜索 API",
    "portal.agentNav": "Agent",
    "portal.partnerNav": "合伙人",
    "portal.collabNav": "合作",
    "evolution.label": "IP进化论",
    "evolution.title": "让品牌成为可管理的系统。",
    "evolution.pageTitle": "让品牌持续进化。",
    "evolution.pageLead": "架构、内核、表达、资产与治理，构成可管理、可调用、可持续更新的闭环。",
    "evolution.architecture": "架构",
    "evolution.core": "内核",
    "evolution.expression": "表达",
    "evolution.assets": "资产",
    "evolution.governance": "治理",
    "evolution.architectureBody": "先判断品牌关系与命名层级。",
    "evolution.coreBody": "明确使命、受众、定位与主张。",
    "evolution.expressionBody": "统一语言、视觉、声音与行为。",
    "evolution.assetsBody": "把系统转化为人和 Agent 可调用的资产。",
    "evolution.governanceBody": "记录版本、衡量偏差并持续回修。",
    "evolution.readFramework": "查看完整系统",
    "evolution.frameworkTitle": "完整系统",
    "evolution.applyToIp": "选择一个 IP",
    "evolution.loop": "识别品牌，建立系统，生成资产，回收反馈，再次进化。",
    "api.title": "System API",
    "api.key": "System API Key",
    "api.connect": "Connect",
    "api.connected": "Connected",
    "api.connecting": "Connecting...",
    "api.notConfigured": "Cloudflare secrets 未配置。",
    "api.badKey": "API Key 不对。",
    "api.badTotp": "验证码不对。",
    "api.failed": "连接失败。",
    "api.scopesGranted": "Access: ",
    "api.allAccess": "全部 IP",
    "api.openAdmin": "Admin",
    "api.resources": "Resources",
    "api.loadingResources": "读取资源中...",
    "api.reconnectForResources": "请重新输入 System API Key 后读取资源。",
    "api.copyCurl": "Copy cURL",
    "api.copiedCurl": "已复制 cURL 模板。",
    "history.title": "历史版本",
    "history.empty": "暂无版本记录",
    "search.global": "全局搜索",
    "admin.unlockTitle": "AI 原生管理",
    "admin.unlockBody": "通过 AI 原生的方式，一站式管理你的品牌和 IP。",
    "admin.keyLabel": "Key",
    "admin.totpLabel": "Google Authenticator",
    "admin.scopeLabel": "IP 权限范围",
    "admin.unlockButton": "继续",
    "admin.sync": "同步",
    "admin.editTitle": "编辑源文件",
    "admin.githubToken": "Token",
    "admin.branch": "分支",
    "admin.brand": "IP",
    "admin.file": "文件",
    "admin.loadFile": "载入",
    "admin.saveFile": "保存",
    "admin.commitMessage": "提交信息",
    "admin.tokenPlaceholder": "GitHub token",
    "admin.editorPlaceholder": "载入文件..."
  },
  en: {
    "hub.name": "IPTrust",
    "hub.description": "IPTrust is an IP trust hub for people and agents.",
    "nav.manifest": "Manifest",
    "nav.admin": "Admin",
    "nav.agent": "I am an Agent",
    "nav.partner": "I am a Partner",
    "nav.collab": "Work with Us",
    "home.lead": "Old guests in high halls; nothing new under the sun.",
    "home.openJson": "Open JSON index",
    "home.adminEdit": "Admin edit",
    "home.systems": "IP systems",
    "home.sectionTitle": "IP",
    "home.searchPlaceholder": "Search IP / Asset Key",
    "home.noResults": "No matching IP.",
    "library.label": "PUBLIC LIBRARY",
    "library.title": "Connect every source, case, and dataset.",
    "library.organizations": "Organizations",
    "library.centralEnterprises": "Central enterprises",
    "library.modules": "Linked modules",
    "status.documented": "Documented",
    "status.placeholder": "Pending",
    "meta.guides": "guides",
    "copy.reference": "Copy",
    "copy.done": "Copied",
    "copy.selected": "Selected. Press Cmd/Ctrl+C to copy.",
    "copy.fail": "Failed",
    "copy.referenceDone": "IP Agent Reference copied",
    "copy.assetUrl": "Copy asset URL",
    "copy.assetDone": "Asset URL copied",
    "copy.colorDone": "Color copied",
    "copy.pantoneDone": "Pantone approximation copied",
    "brand.openJson": "Open JSON",
    "brand.source": "Source",
    "brand.colors": "Brand colors",
    "brand.website": "Website",
    "brand.mainLanguage": "Main language",
    "brand.business": "Business",
    "brand.intro": "Intro",
    "brand.notes": "Notes",
    "brand.tracks": "Tracks",
    "brand.audiences": "Audiences",
    "brand.tags": "Tags",
    "brand.blank": "Blank",
    "brand.editable": "Editable source",
    "brand.tokens": "Token files",
    "brand.noneGuide": "No guideline files yet",
    "brand.noneTokens": "No token files yet",
    "brand.assetHub": "IP Asset Calls",
    "brand.assetKey": "IP ID",
    "brand.brandJson": "Brand JSON",
    "brand.imageAssets": "Image assets",
    "brand.historyApi": "History",
    "brand.agentUse": "Agent call",
    "brand.ipSystem": "IP System",
    "brand.ipSystemBody": "Apply Brand IP System v2 to this IP.",
    "brand.openIpSystem": "Open framework",
    "brand.copyIpSystem": "Copy apply brief",
    "brand.ipSystemCopied": "IP System apply brief copied",
    "brand.guideline": "Brand guideline",
    "brand.moodBoard": "Mood Board",
    "brand.visualAssets": "Visual assets",
    "brand.adobeAssets": "Adobe sources",
    "brand.preview": "Preview",
    "brand.original": "Original",
    "brand.exportPng": "PNG export",
    "brand.exportJpg": "JPG export",
    "brand.keywords": "Keywords",
    "brand.editProfile": "Edit profile",
    "brand.edit": "Edit",
    "brand.name": "IP name",
    "brand.nativeName": "Alternate name",
    "brand.description": "Description",
    "brand.saveProfile": "Save",
    "brand.cancelEdit": "Cancel",
    "brand.apiFirst": "Connect API to edit.",
    "brand.editReady": "Connected. Ready.",
    "brand.editing": "Editing.",
    "brand.saving": "Saving...",
    "brand.savedProfile": "Saved. Deploying.",
    "brand.saveFailed": "Save failed.",
    "portal.agentTitle": "I am an Agent",
    "portal.agentBody": "Copy Skill.",
    "portal.agentAction": "Skill",
    "portal.agentCopied": "Copied. Opening Skill.",
    "portal.partnerTitle": "I am a Partner",
    "portal.partnerBody": "Key first.",
    "portal.partnerAction": "Key first",
    "portal.partnerStatus": "Contact us for the management API.",
    "portal.partnerPointApi": "API access can be scoped to one or multiple IPs.",
    "portal.partnerPointLogin": "Admin login uses API Key + Google Authenticator.",
    "portal.collabTitle": "Work with Us",
    "portal.collabBody": "hi@tableai.ai",
    "portal.collabAction": "Email",
    "portal.collabStatus": "Opening email.",
    "portal.openIps": "View IPs",
    "portal.admin": "Admin entry",
    "portal.github": "Start on GitHub",
    "portal.explore": "Explore first",
    "portal.searchApi": "Search API",
    "portal.agentNav": "Agent",
    "portal.partnerNav": "Partner",
    "portal.collabNav": "Collab",
    "evolution.label": "IP Evolution",
    "evolution.title": "Turn a brand into a managed system.",
    "evolution.pageTitle": "Build a brand that keeps evolving.",
    "evolution.pageLead": "Architecture, core, expression, assets, and governance form a managed, callable, continuously updated loop.",
    "evolution.architecture": "Architecture",
    "evolution.core": "Core",
    "evolution.expression": "Expression",
    "evolution.assets": "Assets",
    "evolution.governance": "Governance",
    "evolution.architectureBody": "Define brand relationships and naming hierarchy.",
    "evolution.coreBody": "Clarify mission, audience, positioning, and proposition.",
    "evolution.expressionBody": "Align language, visual, sound, and behavior.",
    "evolution.assetsBody": "Create assets that people and agents can call.",
    "evolution.governanceBody": "Track versions, measure gaps, and keep improving.",
    "evolution.readFramework": "Explore the system",
    "evolution.frameworkTitle": "System contents",
    "evolution.applyToIp": "Choose an IP",
    "evolution.loop": "Identify the brand. Build the system. Create assets. Learn from feedback. Evolve again.",
    "api.title": "System API",
    "api.key": "System API Key",
    "api.connect": "Connect",
    "api.connected": "Connected",
    "api.connecting": "Connecting...",
    "api.notConfigured": "Cloudflare secrets are not configured.",
    "api.badKey": "Wrong API Key.",
    "api.badTotp": "Wrong code.",
    "api.failed": "Connection failed.",
    "api.scopesGranted": "Access: ",
    "api.allAccess": "All IP",
    "api.openAdmin": "Admin",
    "api.resources": "Resources",
    "api.loadingResources": "Loading resources...",
    "api.reconnectForResources": "Reconnect with the System API Key to read resources.",
    "api.copyCurl": "Copy cURL",
    "api.copiedCurl": "cURL template copied.",
    "history.title": "Version history",
    "history.empty": "No version records yet",
    "search.global": "Global search",
    "admin.unlockTitle": "AI-native management",
    "admin.unlockBody": "Manage your brands and IPs in one AI-native workspace.",
    "admin.keyLabel": "Key",
    "admin.totpLabel": "Google Authenticator",
    "admin.scopeLabel": "IP scope",
    "admin.unlockButton": "Continue",
    "admin.sync": "Sync",
    "admin.editTitle": "Edit source",
    "admin.githubToken": "Token",
    "admin.branch": "Branch",
    "admin.brand": "IP",
    "admin.file": "File",
    "admin.loadFile": "Load",
    "admin.saveFile": "Save",
    "admin.commitMessage": "Message",
    "admin.tokenPlaceholder": "GitHub token",
    "admin.editorPlaceholder": "Load file..."
  }
};

const localeMeta = {
  cn: { label: "CN", htmlLang: "zh-CN", contentLang: "zh", dateLocale: "zh-CN" },
  en: { label: "EN", htmlLang: "en", contentLang: "en", dateLocale: "en-US" },
};

function normalizeLocale(value) {
  if (value === "zh" || value === "cn" || value === "CN") return "cn";
  if (value === "en" || value === "EN") return "en";
  return "cn";
}

let currentLocale = normalizeLocale(localStorage.getItem("iptrust-locale") || localStorage.getItem("iptrust-lang"));
let cachedBrands = null;
let cachedSearch = null;
let cachedVersions = null;
let currentQuery = "";
let cachedPortalSkillText = "";

function contentLang(locale = currentLocale) {
  return localeMeta[locale]?.contentLang || "zh";
}

function t(key) {
  return i18n[currentLocale]?.[key] || i18n.cn[key] || key;
}

function renderLanguageToggle() {
  const toggle = $("#langToggle");
  if (!toggle) return;
  toggle.setAttribute("aria-label", \`Language: \${localeMeta[currentLocale].label}\`);
  toggle.innerHTML = \`
    <span class="\${currentLocale === "cn" ? "is-active" : ""}">CN</span>
    <span class="lang-divider">/</span>
    <span class="\${currentLocale === "en" ? "is-active" : ""}">EN</span>
  \`;
}

function applyI18n() {
  document.documentElement.lang = localeMeta[currentLocale].htmlLang;
  document.documentElement.dataset.locale = currentLocale;
  if (document.body.classList.contains("hub-home")) {
    document.title = t("hub.name");
  } else if (document.querySelector(".admin")) {
    document.title = \`Admin · \${t("hub.name")}\`;
  }
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  renderLanguageToggle();
  const search = $("#brandSearch");
  if (search) search.placeholder = t("home.searchPlaceholder");
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
}

function setupLanguageToggle() {
  const toggle = $("#langToggle");
  if (!toggle) return;
  toggle.addEventListener("click", async () => {
    currentLocale = currentLocale === "cn" ? "en" : "cn";
    localStorage.setItem("iptrust-locale", currentLocale);
    localStorage.setItem("iptrust-lang", contentLang(currentLocale));
    applyI18n();
    await renderHeroIndex();
    await renderIndex();
    await renderBrand();
  });
}

function setupSearch() {
  const search = $("#brandSearch");
  if (!search || search.dataset.ready) return;
  search.dataset.ready = "true";
  search.placeholder = t("home.searchPlaceholder");
  search.addEventListener("input", async () => {
    currentQuery = search.value.trim().toLowerCase();
    if ($("#brandGrid")) {
      await renderIndex();
    } else {
      await renderGlobalResults(currentQuery);
    }
  });
  search.addEventListener("focus", async () => {
    currentQuery = search.value.trim().toLowerCase();
    if (currentQuery) await renderGlobalResults(currentQuery);
  });
  search.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    search.value = "";
    currentQuery = "";
    $("#globalResults")?.classList.remove("is-open");
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest(".topbar-search")) return;
    $("#globalResults")?.classList.remove("is-open");
  });
}

async function loadJson(path) {
  const url = path.startsWith("api/") ? new URL("../" + path, import.meta.url) : new URL(path, location.href);
  url.searchParams.set("v", BUILD_VERSION);
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(\`Could not load \${path}\`);
  return res.json();
}

async function loadSearch() {
  cachedSearch ??= await loadJson("api/search.json");
  return cachedSearch;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function mediaPreviewUrl(value, size = "640") {
  try {
    const url = new URL(value, location.href);
    if (url.hostname === "media.apuch.art" && url.pathname.startsWith("/public/")) {
      url.searchParams.set("size", String(size));
    }
    return url.href;
  } catch {
    return String(value || "");
  }
}

function responsiveImageAttributes(value, widths = [320, 640, 1280], sizes = "100vw") {
  const normalized = [...new Set(widths.map(String))];
  const fallback = normalized[Math.min(1, normalized.length - 1)] || "640";
  const src = mediaPreviewUrl(value, fallback);
  const srcset = normalized.map((width) => mediaPreviewUrl(value, width) + " " + width + "w").join(", ");
  return 'src="' + escapeHtml(src) + '" srcset="' + escapeHtml(srcset) + '" sizes="' + escapeHtml(sizes) + '"';
}

function imageDimensionAttributes(asset = {}) {
  let width = Number(asset.width || 0);
  let height = Number(asset.height || 0);
  if ((!width || !height) && asset.dimensions) {
    const match = String(asset.dimensions).match(/(\d+)\s*[x×]\s*(\d+)/i);
    if (match) {
      width = Number(match[1]);
      height = Number(match[2]);
    }
  }
  return width > 0 && height > 0 ? 'width="' + width + '" height="' + height + '"' : "";
}

function copyIcon() {
  return \`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="2"></rect><path d="M5 15V7a2 2 0 0 1 2-2h8"></path></svg>\`;
}

function themeStyle(theme = {}) {
  const isDark = theme.mode === "dark";
  const buttonText = isDark ? theme.surface || "#14100A" : "#ffffff";
  const vars = {
    "--brand-primary": theme.primary,
    "--brand-accent": theme.accent,
    "--brand-secondary": theme.secondary,
    "--brand-surface": theme.surface,
    "--brand-paper": theme.paper,
    "--brand-ink": theme.ink,
    "--brand-muted": theme.muted,
    "--brand-line": theme.line,
    "--brand-button-text": buttonText,
  };
  return Object.entries(vars)
    .filter(([, value]) => value)
    .map(([key, value]) => \`\${key}:\${value}\`)
    .join(";");
}

function themeClass(theme = {}) {
  return theme.mode === "dark" ? "theme-dark" : "theme-light";
}

function swatches(theme = {}, labeled = false) {
  const colors = [
    ["Primary", theme.primary],
    ["Accent", theme.accent],
    ["Secondary", theme.secondary],
    ["Surface", theme.surface],
    ["Ink", theme.ink],
  ].filter(([, value]) => value);
  return \`<div class="swatches">\${colors.map(([label, value]) => \`
    <span class="swatch" title="\${escapeHtml(label)} \${escapeHtml(value)}" style="background:\${escapeHtml(value)}"></span>
    \${labeled ? \`<span class="swatch-label">\${escapeHtml(label)} \${escapeHtml(value)}</span>\` : ""}
  \`).join("")}</div>\`;
}

function palette(theme = {}) {
  return [
    ["Primary", theme.primary],
    ["Accent", theme.accent],
    ["Secondary", theme.secondary],
  ].filter(([, value]) => value);
}

function hexToRgb(hex = "") {
  const clean = hex.replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbValue(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? \`rgb(\${rgb.r}, \${rgb.g}, \${rgb.b})\` : hex;
}

function pantoneApprox(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return \`PANTONE approx \${hex}\`;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === rgb.r) hue = ((rgb.g - rgb.b) / delta) % 6;
    if (max === rgb.g) hue = (rgb.b - rgb.r) / delta + 2;
    if (max === rgb.b) hue = (rgb.r - rgb.g) / delta + 4;
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
  }
  if (max < 46) return "PANTONE Black 6 C";
  if (delta < 18) return "PANTONE Cool Gray 7 C";
  if (hue < 20 || hue >= 345) return "PANTONE 7621 C";
  if (hue < 48) return "PANTONE 7578 C";
  if (hue < 74) return "PANTONE 872 C";
  if (hue < 155) return "PANTONE 5535 C";
  if (hue < 190) return "PANTONE 3272 C";
  if (hue < 245) return "PANTONE 296 C";
  if (hue < 292) return "PANTONE 7673 C";
  return "PANTONE 7645 C";
}

function colorDots(theme = {}) {
  return \`<span class="hero-index-colors">\${palette(theme).map(([label, value]) => \`
    <button class="color-dot" type="button" data-copy-rgb="\${escapeHtml(rgbValue(value))}" data-copy-pantone="\${escapeHtml(pantoneApprox(value))}" data-color-tooltip="\${escapeHtml(label)} · \${escapeHtml(rgbValue(value))} · Tab \${escapeHtml(pantoneApprox(value))}" aria-label="Copy \${escapeHtml(label)} \${escapeHtml(rgbValue(value))}" title="\${escapeHtml(label)} \${escapeHtml(rgbValue(value))}" style="--dot:\${escapeHtml(value)}"></button>
  \`).join("")}</span>\`;
}

function miniPalette(theme = {}) {
  return \`<span class="mini-palette" aria-hidden="true">\${palette(theme).map(([, value]) => \`
    <span class="mini-swatch" style="--dot:\${escapeHtml(value)}"></span>
  \`).join("")}</span>\`;
}

function brandInitial(brand = {}) {
  if (brand.slug === "fengzhi") return "界";
  if (brand.slug === "sidera") return "侍";
  if (brand.slug === "vanahom") return "V";
  if (brand.slug === "kind") return "K";
  if (brand.slug === "tableai") return "AI";
  return String(brand.name || brand.slug || "IP").slice(0, 2);
}

function cardClass(brand = {}) {
  return \`ip-card \${themeClass(brand.theme)}\`;
}

function cardHeroImage(brand = {}, localized = {}) {
  if (!brand.heroImage) return "";
  return \`<img \${responsiveImageAttributes(brand.heroImage, [320, 640, 1280], "(max-width: 760px) 100vw, 33vw")} alt="\${escapeHtml(localized.name || brand.name || "")}" loading="lazy" decoding="async">\`;
}

function statusLabel(status) {
  return status === "documented" ? t("status.documented") : t("status.placeholder");
}

function localizedBrand(brand = {}) {
  const lang = contentLang();
  const display = brand.display?.[lang] || {};
  const hasIntro = Object.prototype.hasOwnProperty.call(brand.intro ?? {}, lang);
  const hasBusiness = Object.prototype.hasOwnProperty.call(brand.profile?.business ?? brand.business ?? {}, lang);
  const hasNotes = Object.prototype.hasOwnProperty.call(brand.profile?.notes ?? brand.notes ?? {}, lang);
  return {
    name: display.name || brand.name || brand.slug,
    secondaryName: display.secondaryName || brand.nativeName || "",
    intro: hasIntro ? (brand.intro?.[lang] ?? "") : (brand.primaryExcerpt || brand.description || ""),
    business: hasBusiness ? ((brand.profile?.business ?? brand.business)?.[lang] ?? "") : "",
    notes: hasNotes ? ((brand.profile?.notes ?? brand.notes)?.[lang] ?? "") : "",
  };
}

function localizedClassification(brand = {}, lang = contentLang()) {
  const source = brand.profile?.classification || brand.classification || {};
  const fallbackLang = lang === "zh" ? "en" : "zh";
  const get = (field) => {
    const primary = source[field]?.[lang];
    const fallback = source[field]?.[fallbackLang];
    return Array.isArray(primary) && primary.length ? primary : (Array.isArray(fallback) ? fallback : []);
  };
  return {
    tracks: get("tracks"),
    audiences: get("audiences"),
    tags: get("tags"),
  };
}

function listText(values = []) {
  return values.filter(Boolean).join(" · ");
}

function alternateBrandName(brand = {}, main = "") {
  const mainLanguage = brand.display?.default?.language || brand.mainLanguage || contentLang();
  const alternateLang = mainLanguage === "zh" || mainLanguage === "cn" ? "en" : "zh";
  const alternate = brand.display?.[alternateLang]?.name
    || (alternateLang === "zh" ? brand.nativeName : brand.name)
    || "";
  return {
    language: alternateLang,
    name: alternate && alternate !== main ? alternate : "",
  };
}

function mainBrand(brand = {}) {
  const display = brand.display?.default || {};
  const lang = display.language || brand.mainLanguage || contentLang();
  const fallback = localizedBrand(brand);
  const name = display.name || brand.mainName || brand.display?.[lang]?.name || fallback.name || brand.slug;
  const alternate = alternateBrandName(brand, name);
  const classification = localizedClassification(brand, lang);
  return {
    name,
    secondaryName: alternate.name,
    secondaryLanguage: alternate.language,
    intro: brand.intro?.[lang] || fallback.intro || brand.description || "",
    business: brand.profile?.business?.[lang] || brand.business?.[lang] || "",
    notes: brand.profile?.notes?.[lang] || brand.notes?.[lang] || "",
    classification,
    language: lang,
  };
}

function fieldValue(value) {
  return value || t("brand.blank");
}

function languageLabel(value) {
  if (value === "zh" || value === "cn") return "CN";
  if (value === "en") return "EN";
  return value || "";
}

function skillBaseText(skill = "") {
  const skillUrl = new URL("skills/iptrust-live-update/SKILL.md", document.baseURI).href;
  return [
    "IPTrust Skill ✦",
    "Hub: " + location.origin + location.pathname,
    "Manifest: " + new URL("api/manifest.json", location.href).href,
    "Search API: " + new URL("api/search.json", location.href).href,
    "MCP: " + new URL("mcp", location.href).href,
    \`Skill: \${skillUrl}\`,
    "",
    skill || "Use the IPTrust manifest and brand APIs to read each IP's latest name, colors, intro, business, language, and guideline files.",
  ].join("\\n");
}

async function portalSkillText() {
  const skillUrl = new URL("skills/iptrust-live-update/SKILL.md", document.baseURI);
  skillUrl.searchParams.set("v", BUILD_VERSION);
  let skill = "";
  try {
    const res = await fetch(skillUrl);
    if (res.ok) skill = await res.text();
  } catch (error) {
    console.warn("Could not load IPTrust Skill for copy.", error);
  }
  return skillBaseText(skill);
}

function referenceText(brand = {}) {
  const localized = mainBrand(brand);
  const ipPageUrl = new URL(brand.url || \`brand.html?brand=\${brand.slug}\`, location.href).href;
  const apiUrl = new URL(brand.apiUrl || \`api/brands/\${brand.slug}.json\`, location.href).href;
  const historyUrl = new URL(brand.historyUrl || \`api/history/\${brand.slug}.json\`, location.href).href;
  const schemaUrl = new URL("api/schema.json", location.href).href;
  const skillUrl = new URL("skills/iptrust-live-update/SKILL.md", document.baseURI).href;
  const mcpSource = new URL("api/manifest.json", location.href).href;
  const preferredLogo = preferredBrandImage(brand.images || []);
  const logoPath = brand.logoUrl || preferredLogo?.sitePath || brand.heroImage || "";
  const logoUrl = logoPath ? new URL(logoPath, location.href).href : "TBD";
  const colors = palette(brand.theme)
    .map(([label, value]) => \`\${label}: \${value} / \${rgbValue(value)}\`)
    .join("\\n");
  return [
    "IPTrust Agent Reference",
    "",
    "[IP Identity]",
    \`Name: \${localized.name}\`,
    localized.secondaryName ? \`Other name: \${localized.secondaryName}\` : "",
    \`IP ID / Asset Key: \${brand.assetKey || brand.slug}\`,
    \`Main language: \${languageLabel(brand.mainLanguage || localized.language)}\`,
    "",
    "[Links]",
    \`IP page: \${ipPageUrl}\`,
    \`Logo URL: \${logoUrl}\`,
    \`Official website: \${brand.officialWebsite || "TBD"}\`,
    \`Brand API: \${apiUrl}\`,
    \`History API: \${historyUrl}\`,
    \`Field schema: \${schemaUrl}\`,
    \`IPTrust Skill: \${skillUrl}\`,
    \`MCP manifest: \${mcpSource}\`,
    "",
    "[Core]",
    \`Intro: \${localized.intro || "TBD"}\`,
    \`Business: \${localized.business || "TBD"}\`,
    \`Tracks: \${listText(localized.classification.tracks) || "TBD"}\`,
    \`Audiences: \${listText(localized.classification.audiences) || "TBD"}\`,
    \`Tags: \${listText(localized.classification.tags) || "TBD"}\`,
    "",
    "[Palette]",
    colors || "TBD",
    "",
    "[Agent Skill Usage]",
    "1. Load the IPTrust Skill first.",
    "2. Prefer MCP tools for live brand standards.",
    "3. Fall back to the Brand API JSON when MCP is unavailable.",
    "4. Keep the main IP name in the main language; show other-language name as a labeled alternate.",
    "",
    "[MCP Calls]",
    \`list_brands({})\`,
    \`get_brand({ "assetKey": "\${brand.assetKey || brand.slug}" })\`,
    \`get_guideline({ "assetKey": "\${brand.assetKey || brand.slug}" })\`,
    \`list_tokens({ "assetKey": "\${brand.assetKey || brand.slug}" })\`,
    \`validate_color({ "assetKey": "\${brand.assetKey || brand.slug}", "hex": "\${brand.theme?.primary || "#000000"}" })\`,
  ].join("\\n");
}

function ipSystemApplyText(brand = {}) {
  const localized = mainBrand(brand);
  const brandUrl = new URL(brand.url || \`brand.html?brand=\${brand.slug}\`, location.href).href;
  const brandApi = new URL(brand.apiUrl || \`api/brands/\${brand.slug}.json\`, location.href).href;
  const framework = new URL("ip_sys.md", location.href).href;
  return [
    "Apply Brand IP System v2",
    "",
    \`IP: \${localized.name}\`,
    \`IP ID: \${brand.assetKey || brand.slug}\`,
    \`Main language: \${languageLabel(brand.mainLanguage || localized.language)}\`,
    \`Tracks: \${listText(localized.classification.tracks) || "TBD"}\`,
    \`Audiences: \${listText(localized.classification.audiences) || "TBD"}\`,
    \`Tags: \${listText(localized.classification.tags) || "TBD"}\`,
    "",
    \`Framework: \${framework}\`,
    \`Brand page: \${brandUrl}\`,
    \`Brand API: \${brandApi}\`,
    "",
    "Instruction:",
    "Use Brand IP System v2 as the universal operating framework. Apply it to this IP's latest API fields, then produce: 0) brand architecture judgment, 1) IP core, 2) expression system, 3) asset ladder, 4) governance and measurement loop. Keep all recommendations aligned with the IP's main language, tracks, audiences, tags, colors, intro, business, and notes.",
  ].join("\\n");
}

function copyWithTextarea(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-999px";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  textarea.remove();
  return ok;
}

function showManualCopy(text) {
  document.querySelector(".copy-manual")?.remove();
  const panel = document.createElement("div");
  panel.className = "copy-manual";
  panel.innerHTML = \`<textarea readonly></textarea><button type="button" aria-label="Close">×</button>\`;
  const textarea = panel.querySelector("textarea");
  textarea.value = text;
  panel.querySelector("button").addEventListener("click", () => panel.remove());
  document.body.appendChild(panel);
  textarea.focus();
  textarea.select();
}

function toastStack() {
  let stack = document.querySelector(".toast-stack");
  if (stack) return stack;
  stack = document.createElement("div");
  stack.className = "toast-stack";
  stack.setAttribute("aria-live", "polite");
  stack.setAttribute("aria-atomic", "true");
  document.body.appendChild(stack);
  return stack;
}

function showToast(message) {
  const stack = toastStack();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("is-leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, 1800);
}

function feedbackMessage(result, copiedKey) {
  return result === "selected" ? t("copy.selected") : t(copiedKey);
}

async function writeClipboardText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Clipboard timeout.")), 900)),
      ]);
      return "copied";
    }
  } catch (error) {
    console.warn("Clipboard API unavailable, trying legacy copy.", error);
  }
  try {
    if (copyWithTextarea(text)) return "copied";
  } catch (error) {
    console.warn("Legacy copy unavailable, falling back to manual selection.", error);
  }
  showManualCopy(text);
  return "selected";
}

async function copyReference(brand, button) {
  const result = await writeClipboardText(referenceText(brand));
  const previous = button.textContent;
  const message = feedbackMessage(result, "copy.referenceDone");
  if (!button.dataset.iconOnly) button.textContent = message;
  button.dataset.feedback = message;
  button.classList.add("copied");
  showToast(message);
  setTimeout(() => {
    if (!button.dataset.iconOnly) button.textContent = previous || t("copy.reference");
    button.classList.remove("copied");
    delete button.dataset.feedback;
  }, 1200);
}

function setupPortalActions() {
  cachedPortalSkillText = skillBaseText();
  portalSkillText().then((text) => cachedPortalSkillText = text).catch(console.error);
  document.querySelectorAll("[data-portal-action]").forEach((button) => {
    if (button.dataset.ready) return;
    button.dataset.ready = "true";
    button.addEventListener("click", async () => {
      const action = button.dataset.portalAction;
      const href = button.dataset.portalHref;
      const statusNode = document.querySelector(\`[data-portal-status="\${action}"]\`);
      const openTarget = () => {
        if (!href) return;
        window.setTimeout(() => {
          location.href = href;
        }, 620);
      };
      try {
        if (action === "agent") {
          const text = cachedPortalSkillText || skillBaseText();
          const result = await writeClipboardText(text);
          const message = result === "selected" ? t("copy.selected") : t("portal.agentCopied");
          button.classList.add("copied");
          if (statusNode) statusNode.textContent = message;
          showToast(message);
          setTimeout(() => button.classList.remove("copied"), 1000);
          openTarget();
          return;
        }
        if (action === "partner") {
          if (statusNode) statusNode.textContent = t("portal.partnerStatus");
          button.classList.add("copied");
          showToast(t("portal.partnerStatus"));
          setTimeout(() => button.classList.remove("copied"), 1000);
          openTarget();
          return;
        }
        if (action === "collab") {
          if (statusNode) statusNode.textContent = t("portal.collabStatus");
          button.classList.add("copied");
          showToast(t("portal.collabStatus"));
          setTimeout(() => button.classList.remove("copied"), 1000);
          openTarget();
        }
      } catch (error) {
        if (statusNode) statusNode.textContent = t("copy.fail");
        console.error(error);
      }
    });
  });
}

function apiStatus(message, isError = false) {
  const node = $("#apiConnectStatus");
  if (!node) return;
  node.textContent = message;
  node.style.color = isError ? "#b12137" : "#0E8C7B";
}

function apiErrorMessage(error) {
  if (error === "admin_auth_not_configured") return t("api.notConfigured");
  if (error === "bad_api_key") return t("api.badKey");
  if (error === "bad_totp") return t("api.badTotp");
  return error || t("api.failed");
}

function apiCurlTemplate() {
  return [
    \`curl -X POST "\${new URL("api/v2/auth/exchange", location.href).href}"\`,
    \`  -H "Content-Type: application/json"\`,
    \`  -d '{"apiKey":"<SYSTEM_API_KEY>","totp":"<TOTP>"}'\`,
  ].join("\\n");
}

const API_CSRF_SESSION = "iptrust_csrf";
let apiConnection = null;

function renderApiConnected(scopes = ["*"], ipScopes = ["*"]) {
  apiConnection = { scopes, ipScopes };
  $("#apiConnectButton")?.classList.add("api-connected");
  $("#apiConnectPanel")?.classList.add("is-connected");
  $("#apiConnectForm")?.classList.add("hidden");
  $("#apiConnectedOps")?.classList.remove("hidden");
  const scopeText = $("#apiScopeText");
  if (scopeText) {
    scopeText.textContent = scopes.includes("system:*") || ipScopes.includes("*") ? t("api.allAccess") : \`\${t("api.scopesGranted")}\${ipScopes.join(", ")}\`;
  }
  apiStatus(t("api.connected"));
  window.dispatchEvent(new CustomEvent("iptrust:api-connected", { detail: { scopes } }));
}

async function loadProtectedResources() {
  const summary = $("#apiResourceSummary");
  if (!summary) return;
  if (!apiConnection) {
    summary.classList.remove("hidden");
    summary.textContent = t("api.reconnectForResources");
    return;
  }
  summary.classList.remove("hidden");
  summary.textContent = t("api.loadingResources");
  try {
    const res = await fetch("api/v2/assets?limit=20", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.hint || data.error || t("api.failed"));
    summary.textContent = JSON.stringify({
      assets: data.total,
      items: data.items?.map((item) => ({ id: item.id, ip: item.ownerId, access: item.access, status: item.status })) || [],
    }, null, 2);
  } catch (error) {
    summary.textContent = error.message || t("api.failed");
  }
}

function setupApiConnect() {
  const button = $("#apiConnectButton");
  const panel = $("#apiConnectPanel");
  const close = $("#apiConnectClose");
  const submit = $("#apiConnectSubmit");
  const form = $("#apiConnectForm");
  const ops = $("#apiConnectedOps");
  if (!button || !panel || button.dataset.ready) return;
  button.dataset.ready = "true";

  fetch("api/v2/auth/session", { credentials: "include" }).then(async (res) => {
    if (!res.ok) return;
    const data = await res.json();
    renderApiConnected(data.actor?.scopes || [], data.actor?.ipScopes || []);
  }).catch(() => {});

  button.addEventListener("click", async () => {
    panel.classList.toggle("hidden");
    if (!panel.classList.contains("hidden") && !button.classList.contains("api-connected")) {
      $("#apiAdminKey")?.focus();
    }
  });
  close?.addEventListener("click", () => panel.classList.add("hidden"));
  document.querySelectorAll("[data-api-copy]").forEach((copyButton) => {
    copyButton.addEventListener("click", async () => {
      const result = await writeClipboardText(apiCurlTemplate());
      const message = result === "selected" ? t("copy.selected") : t("api.copiedCurl");
      apiStatus(message);
      showToast(message);
    });
  });
  $("#apiResourcesButton")?.addEventListener("click", loadProtectedResources);

  const connectApi = async () => {
    const adminKey = $("#apiAdminKey")?.value || "";
    const totp = $("#apiTotpCode")?.value || "";
    apiStatus(t("api.connecting"));
    try {
      const res = await fetch("api/v2/auth/exchange", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ apiKey: adminKey, totp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "bad_totp") $("#apiTotpField")?.classList.remove("hidden");
        throw new Error(apiErrorMessage(data.error));
      }
      const scopes = data.scopes || [];
      const ipScopes = data.ipScopes || [];
      sessionStorage.setItem(API_CSRF_SESSION, data.csrfToken || "");
      $("#apiAdminKey").value = "";
      if ($("#apiTotpCode")) $("#apiTotpCode").value = "";
      renderApiConnected(scopes, ipScopes);
      showToast(t("api.connected"));
    } catch (error) {
      apiConnection = null;
      sessionStorage.removeItem(API_CSRF_SESSION);
      button.classList.remove("api-connected");
      panel.classList.remove("is-connected");
      form?.classList.remove("hidden");
      ops?.classList.add("hidden");
      apiStatus(error.message || t("api.failed"), true);
      showToast(error.message || t("api.failed"));
    }
  };
  submit?.addEventListener("click", () => connectApi());
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    void connectApi();
  });
}

function apiKeyForWrite() {
  return sessionStorage.getItem(API_CSRF_SESSION) || "";
}

function apiScopesForWrite() {
  return apiConnection?.ipScopes || [];
}

function canManageBrand(slug) {
  const scopes = apiScopesForWrite();
  const permissions = apiConnection?.scopes || [];
  const canWrite = permissions.includes("system:*") || permissions.includes("brands:*") || permissions.includes("brands:write");
  return Boolean(apiKeyForWrite()) && canWrite && (scopes.includes("*") || scopes.includes(slug));
}

function setProfileStatus(message, isError = false) {
  const node = $("#profileEditStatus");
  if (!node) return;
  node.textContent = message;
  node.style.color = isError ? "#b12137" : "#0e8c7b";
}

function setProfileEditorAccess(slug) {
  const editor = $("#profileEditor");
  const button = $("#profileEditButton");
  if (!editor || !button) return;
  const unlocked = canManageBrand(slug);
  editor.dataset.locked = unlocked ? "false" : "true";
  button.disabled = !unlocked;
  if (!unlocked) setProfileStatus(t("brand.apiFirst"), false);
  else setProfileStatus(t("brand.editReady"), false);
}

function fieldPatchValue(form, name) {
  const node = form.querySelector(\`[data-profile-field="\${name}"]\`);
  return node ? node.value : "";
}

function fieldListValue(form, name) {
  return fieldPatchValue(form, name)
    .split(/[,\\n·]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function profilePatchFromForm(form) {
  const keywords = fieldPatchValue(form, "theme.keywords")
    .split(/[,\\n·]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    name: fieldPatchValue(form, "name"),
    nativeName: fieldPatchValue(form, "nativeName"),
    description: fieldPatchValue(form, "description"),
    officialWebsite: fieldPatchValue(form, "officialWebsite"),
    mainLanguage: fieldPatchValue(form, "mainLanguage"),
    intro: {
      zh: fieldPatchValue(form, "intro.zh"),
      en: fieldPatchValue(form, "intro.en"),
    },
    business: {
      zh: fieldPatchValue(form, "business.zh"),
      en: fieldPatchValue(form, "business.en"),
    },
    notes: {
      zh: fieldPatchValue(form, "notes.zh"),
      en: fieldPatchValue(form, "notes.en"),
    },
    classification: {
      tracks: {
        zh: fieldListValue(form, "classification.tracks.zh"),
        en: fieldListValue(form, "classification.tracks.en"),
      },
      audiences: {
        zh: fieldListValue(form, "classification.audiences.zh"),
        en: fieldListValue(form, "classification.audiences.en"),
      },
      tags: {
        zh: fieldListValue(form, "classification.tags.zh"),
        en: fieldListValue(form, "classification.tags.en"),
      },
    },
    theme: {
      primary: fieldPatchValue(form, "theme.primary"),
      accent: fieldPatchValue(form, "theme.accent"),
      secondary: fieldPatchValue(form, "theme.secondary"),
      keywords,
    },
  };
}

function profileEditor(brand = {}) {
  const profile = brand.profile || {};
  const intro = brand.intro || profile.intro || {};
  const business = brand.business || profile.business || {};
  const notes = brand.notes || profile.notes || {};
  const classification = brand.classification || profile.classification || {};
  const theme = brand.theme || {};
  return \`
    <section class="profile-editor" id="profileEditor" data-brand="\${escapeHtml(brand.slug)}" data-locked="true">
      <div class="profile-editor-head">
        <div>
          <p class="eyebrow">API</p>
          <h2>\${escapeHtml(t("brand.editProfile"))}</h2>
        </div>
        <button class="button ghost" type="button" id="profileEditButton">\${escapeHtml(t("brand.edit"))}</button>
      </div>
      <form class="profile-edit-form hidden" id="profileEditForm">
        <div class="profile-form-grid">
          <label><span>\${escapeHtml(t("brand.name"))}</span><input data-profile-field="name" value="\${escapeHtml(brand.name || "")}"></label>
          <label><span>\${escapeHtml(t("brand.nativeName"))}</span><input data-profile-field="nativeName" value="\${escapeHtml(brand.nativeName || "")}"></label>
          <label><span>\${escapeHtml(t("brand.website"))}</span><input data-profile-field="officialWebsite" value="\${escapeHtml(brand.officialWebsite || "")}"></label>
          <label><span>\${escapeHtml(t("brand.mainLanguage"))}</span><select data-profile-field="mainLanguage">
            <option value="zh" \${(brand.mainLanguage || profile.mainLanguage) === "zh" ? "selected" : ""}>CN</option>
            <option value="en" \${(brand.mainLanguage || profile.mainLanguage) === "en" ? "selected" : ""}>EN</option>
          </select></label>
          <label class="span-2"><span>\${escapeHtml(t("brand.description"))}</span><textarea data-profile-field="description" rows="2">\${escapeHtml(brand.description || "")}</textarea></label>
          <label><span>\${escapeHtml(t("brand.intro"))} · CN</span><textarea data-profile-field="intro.zh" rows="4">\${escapeHtml(intro.zh || "")}</textarea></label>
          <label><span>\${escapeHtml(t("brand.intro"))} · EN</span><textarea data-profile-field="intro.en" rows="4">\${escapeHtml(intro.en || "")}</textarea></label>
          <label><span>\${escapeHtml(t("brand.business"))} · CN</span><textarea data-profile-field="business.zh" rows="3">\${escapeHtml(business.zh || "")}</textarea></label>
          <label><span>\${escapeHtml(t("brand.business"))} · EN</span><textarea data-profile-field="business.en" rows="3">\${escapeHtml(business.en || "")}</textarea></label>
          <label><span>\${escapeHtml(t("brand.notes"))} · CN</span><textarea data-profile-field="notes.zh" rows="3">\${escapeHtml(notes.zh || "")}</textarea></label>
          <label><span>\${escapeHtml(t("brand.notes"))} · EN</span><textarea data-profile-field="notes.en" rows="3">\${escapeHtml(notes.en || "")}</textarea></label>
          <label><span>\${escapeHtml(t("brand.tracks"))} · CN</span><textarea data-profile-field="classification.tracks.zh" rows="2">\${escapeHtml((classification.tracks?.zh || []).join(" · "))}</textarea></label>
          <label><span>\${escapeHtml(t("brand.tracks"))} · EN</span><textarea data-profile-field="classification.tracks.en" rows="2">\${escapeHtml((classification.tracks?.en || []).join(" · "))}</textarea></label>
          <label><span>\${escapeHtml(t("brand.audiences"))} · CN</span><textarea data-profile-field="classification.audiences.zh" rows="2">\${escapeHtml((classification.audiences?.zh || []).join(" · "))}</textarea></label>
          <label><span>\${escapeHtml(t("brand.audiences"))} · EN</span><textarea data-profile-field="classification.audiences.en" rows="2">\${escapeHtml((classification.audiences?.en || []).join(" · "))}</textarea></label>
          <label><span>\${escapeHtml(t("brand.tags"))} · CN</span><textarea data-profile-field="classification.tags.zh" rows="2">\${escapeHtml((classification.tags?.zh || []).join(" · "))}</textarea></label>
          <label><span>\${escapeHtml(t("brand.tags"))} · EN</span><textarea data-profile-field="classification.tags.en" rows="2">\${escapeHtml((classification.tags?.en || []).join(" · "))}</textarea></label>
          <label><span>Primary</span><input data-profile-field="theme.primary" value="\${escapeHtml(theme.primary || "")}"></label>
          <label><span>Accent</span><input data-profile-field="theme.accent" value="\${escapeHtml(theme.accent || "")}"></label>
          <label><span>Secondary</span><input data-profile-field="theme.secondary" value="\${escapeHtml(theme.secondary || "")}"></label>
          <label class="span-2"><span>\${escapeHtml(t("brand.keywords"))}</span><textarea data-profile-field="theme.keywords" rows="2">\${escapeHtml((theme.keywords || []).join(" · "))}</textarea></label>
        </div>
        <div class="actions">
          <button class="button" type="submit" id="profileSaveButton">\${escapeHtml(t("brand.saveProfile"))}</button>
          <button class="button ghost" type="button" id="profileCancelButton">\${escapeHtml(t("brand.cancelEdit"))}</button>
        </div>
      </form>
      <p class="notice" id="profileEditStatus" aria-live="polite"></p>
    </section>
  \`;
}

function setupProfileEditor(brand = {}) {
  const editor = $("#profileEditor");
  const form = $("#profileEditForm");
  const editButton = $("#profileEditButton");
  const cancelButton = $("#profileCancelButton");
  if (!editor || !form || !editButton || editor.dataset.ready) return;
  editor.dataset.ready = "true";
  setProfileEditorAccess(brand.slug);
  window.addEventListener("iptrust:api-connected", () => setProfileEditorAccess(brand.slug));

  editButton.addEventListener("click", () => {
    if (!canManageBrand(brand.slug)) {
      setProfileStatus(t("brand.apiFirst"), true);
      $("#apiConnectPanel")?.classList.remove("hidden");
      $("#apiAdminKey")?.focus();
      return;
    }
    form.classList.remove("hidden");
    setProfileStatus(t("brand.editing"));
  });
  cancelButton?.addEventListener("click", () => {
    form.classList.add("hidden");
    setProfileStatus(t("brand.editReady"));
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = apiKeyForWrite();
    if (!key) {
      setProfileStatus(t("brand.apiFirst"), true);
      return;
    }
    setProfileStatus(t("brand.saving"));
    try {
      const current = await fetch(\`api/v2/brands/\${encodeURIComponent(brand.slug)}\`, { credentials: "include" });
      if (!current.ok) throw new Error(t("brand.saveFailed"));
      const etag = current.headers.get("etag");
      const res = await fetch(\`api/v2/brands/\${encodeURIComponent(brand.slug)}\`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": key,
          "If-Match": etag || "",
          "Idempotency-Key": crypto.randomUUID(),
        },
        credentials: "include",
        body: JSON.stringify({
          patch: profilePatchFromForm(form),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.hint || data.error || t("brand.saveFailed"));
      form.classList.add("hidden");
      setProfileStatus(t("brand.savedProfile"));
      showToast(t("brand.savedProfile"));
    } catch (error) {
      setProfileStatus(error.message || t("brand.saveFailed"), true);
      showToast(error.message || t("brand.saveFailed"));
    }
  });
}

function setupCopyButtons(brands) {
  const bySlug = new Map(brands.map((brand) => [brand.slug, brand]));
  document.querySelectorAll("[data-copy-brand]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        const brand = bySlug.get(button.dataset.copyBrand);
        if (!brand) throw new Error(\`Unknown brand \${button.dataset.copyBrand}\`);
        await copyReference(brand, button);
      } catch (error) {
        button.textContent = t("copy.fail");
        console.error(error);
      }
    });
  });
  document.querySelectorAll("[data-copy-rgb]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const result = await writeClipboardText(button.dataset.copyRgb);
      showToast(feedbackMessage(result, "copy.colorDone"));
      button.classList.add("copied");
      button.title = result === "selected" ? t("copy.selected") : t("copy.done");
      setTimeout(() => button.classList.remove("copied"), 900);
    });
    button.addEventListener("keydown", async (event) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      event.stopPropagation();
      const result = await writeClipboardText(button.dataset.copyPantone);
      showToast(feedbackMessage(result, "copy.pantoneDone"));
      button.classList.add("copied");
      button.title = result === "selected" ? t("copy.selected") : t("copy.done");
      setTimeout(() => button.classList.remove("copied"), 900);
    });
  });
}

function setupAssetCopyButtons() {
  document.querySelectorAll("[data-copy-asset-url]").forEach((button) => {
    if (button.dataset.ready) return;
    button.dataset.ready = "true";
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const assetUrl = new URL(button.dataset.copyAssetUrl, location.href).href;
      const result = await writeClipboardText(assetUrl);
      showToast(feedbackMessage(result, "copy.assetDone"));
      button.classList.add("copied");
      button.title = result === "selected" ? t("copy.selected") : t("copy.done");
      setTimeout(() => button.classList.remove("copied"), 900);
    });
  });
}

function normalizeSearchText(value = "") {
  return String(value).toLowerCase();
}

function assetScore(image = {}) {
  const text = [image.path, image.sitePath, image.title].filter(Boolean).join(" ").toLowerCase();
  let score = 0;
  if (text.includes("logo")) score += 60;
  if (text.includes("a2a")) score += 35;
  if (text.includes("transparent") || text.includes("clear")) score += 42;
  if (text.includes("wide") || text.includes("wordmark")) score += 25;
  if (text.includes("color") || text.includes("red")) score += 32;
  if (text.includes("black")) score += 10;
  if (text.includes("white")) score -= 18;
  if (String(image.sitePath || "").toLowerCase().endsWith(".png")) score += 10;
  if (String(image.sitePath || "").toLowerCase().endsWith(".jpg")) score -= 4;
  if (text.includes("brand-hero")) score -= 90;
  return score;
}

function preferredBrandImage(images = []) {
  if (!images.length) return null;
  const candidates = [...images].sort((a, b) => assetScore(b) - assetScore(a));
  return assetScore(candidates[0]) > 0 ? candidates[0] : images[0];
}

function brandAssetStrip(images = []) {
  if (!images.length) return "";
  return \`
    <section class="brand-assets" aria-label="Brand visual assets">
      <p class="eyebrow">\${escapeHtml(t("brand.visualAssets"))}</p>
      <div class="brand-asset-strip">
        \${images.map((image) => \`
          <div class="brand-asset" title="\${escapeHtml(image.title || image.path || "")}">
            <a class="brand-asset-link" href="\${escapeHtml(image.sitePath)}">
              <img \${responsiveImageAttributes(image.sitePath, [320, 640, 1280], "(max-width: 760px) 54vw, 240px")} alt="\${escapeHtml(image.title || "")}" loading="lazy" decoding="async">
            </a>
            <button class="asset-copy-button icon-copy" type="button" data-icon-only="true" data-copy-asset-url="\${escapeHtml(image.sitePath)}" aria-label="\${escapeHtml(t("copy.assetUrl"))}">\${copyIcon()}</button>
            <div class="brand-asset-info">
              <span class="brand-asset-name">\${escapeHtml(image.title || image.path || "Asset")}</span>
              <span class="brand-asset-meta">
                \${image.format ? \`<span>\${escapeHtml(image.format)}</span>\` : ""}
                \${image.size ? \`<span>\${escapeHtml(image.size)}</span>\` : ""}
                \${image.dimensions ? \`<span class="brand-asset-dimensions">\${escapeHtml(image.dimensions.replace(" x ", " × "))}</span>\` : ""}
              </span>
            </div>
          </div>
        \`).join("")}
      </div>
    </section>
  \`;
}

function adobeAssetPanel(adobeAssets = []) {
  if (!adobeAssets.length) return "";
  return \`
    <section class="adobe-assets" aria-label="Adobe source assets">
      <div class="adobe-assets-head">
        <div><p class="eyebrow">ADOBE</p><h2>\${escapeHtml(t("brand.adobeAssets"))}</h2></div>
        <span class="asset-key">AI / EPS / PS / PDF / PSD</span>
      </div>
      \${adobeAssets.map((asset) => \`
        <article class="adobe-source-file">
          <div class="adobe-source-preview">
            \${asset.preview?.sitePath ? \`<img \${responsiveImageAttributes(asset.preview.sitePath, [320, 640, 1280], "(max-width: 760px) 100vw, 42vw")} alt="\${escapeHtml(asset.title || "Adobe asset")}" loading="lazy" decoding="async">\` : ""}
            \${asset.preview?.sitePath ? \`<button class="asset-copy-button icon-copy" type="button" data-icon-only="true" data-copy-asset-url="\${escapeHtml(asset.preview.sitePath)}" aria-label="\${escapeHtml(t("copy.assetUrl"))}">\${copyIcon()}</button>\` : ""}
          </div>
          <div class="adobe-source-body">
            <p class="eyebrow">\${escapeHtml(asset.source?.format || "ADOBE")}</p>
            <h3>\${escapeHtml(asset.title || asset.id || "Adobe asset")}</h3>
            <p class="adobe-source-meta">\${escapeHtml([asset.source?.format, asset.source?.size, asset.pipeline].filter(Boolean).join(" · "))}</p>
            <div class="adobe-downloads">
              \${asset.source?.sitePath ? \`<a href="\${escapeHtml(asset.source.sitePath)}" download>\${escapeHtml(t("brand.original"))}</a>\` : ""}
              \${asset.preview?.sitePath ? \`<a href="\${escapeHtml(asset.preview.sitePath)}" target="_blank">\${escapeHtml(t("brand.preview"))}</a>\` : ""}
              \${(asset.exports || []).flatMap((page) => [
                page.png?.sitePath ? \`<a href="\${escapeHtml(page.png.sitePath)}" download>p\${page.page} · \${escapeHtml(t("brand.exportPng"))}</a>\` : "",
                page.jpg?.sitePath ? \`<a href="\${escapeHtml(page.jpg.sitePath)}" download>p\${page.page} · \${escapeHtml(t("brand.exportJpg"))}</a>\` : "",
              ]).filter(Boolean).join("")}
            </div>
          </div>
        </article>
      \`).join("")}
    </section>
  \`;
}

function endpointCard(label, href, code) {
  return \`
    <a class="endpoint-card" href="\${escapeHtml(href)}">
      <span>\${escapeHtml(label)}</span>
      <strong>\${escapeHtml(code)}</strong>
      <code>\${escapeHtml(href)}</code>
    </a>
  \`;
}

function brandAssetHub(brand = {}) {
  const key = brand.assetKey || brand.slug;
  const endpoints = brand.assetKit?.endpoints || {};
  return \`
    <section class="asset-hub" aria-label="IP asset calls">
      <div class="asset-hub-head">
        <div>
          <p class="eyebrow">\${escapeHtml(t("brand.assetHub"))}</p>
          <h2>\${escapeHtml(t("brand.assetHub"))}</h2>
        </div>
        <div class="asset-key">\${escapeHtml(t("brand.assetKey"))}: <code>\${escapeHtml(key)}</code></div>
      </div>
      <div class="endpoint-grid">
        \${endpointCard(t("brand.brandJson"), endpoints.brand || brand.apiUrl, \`get_brand\`)}
        \${endpointCard(t("brand.imageAssets"), endpoints.images || brand.apiUrl, \`images[]\`)}
        \${endpoints.adobe ? endpointCard(t("brand.adobeAssets"), endpoints.adobe, \`adobeAssets[]\`) : ""}
        \${endpointCard(t("brand.historyApi"), endpoints.history || brand.historyUrl, \`versions[]\`)}
        \${endpointCard(t("brand.ipSystem"), "ip-evolution", \`apply_ip_system\`)}
        \${endpointCard(t("brand.agentUse"), brand.apiUrl, \`get_brand({ "assetKey": "\${key}" })\`)}
      </div>
    </section>
  \`;
}

function ipSystemPanel(brand = {}) {
  return \`
    <section class="ip-system-panel" aria-label="IP System">
      <div class="ip-system-head">
        <div>
          <p class="eyebrow">\${escapeHtml(t("brand.ipSystem"))}</p>
          <h2>\${escapeHtml(t("brand.ipSystem"))}</h2>
        </div>
        <div class="actions">
          <a class="button ghost" href="ip-evolution">\${escapeHtml(t("brand.openIpSystem"))}</a>
          <button class="button" type="button" data-apply-ip-system="\${escapeHtml(brand.slug)}">\${escapeHtml(t("brand.copyIpSystem"))}</button>
        </div>
      </div>
      <p>\${escapeHtml(t("brand.ipSystemBody"))}</p>
    </section>
  \`;
}

function setupIpSystemPanel(brand = {}) {
  document.querySelectorAll("[data-apply-ip-system]").forEach((button) => {
    if (button.dataset.ready) return;
    button.dataset.ready = "true";
    button.addEventListener("click", async () => {
      const result = await writeClipboardText(ipSystemApplyText(brand));
      const message = result === "selected" ? t("copy.selected") : t("brand.ipSystemCopied");
      showToast(message);
      button.classList.add("copied");
      setTimeout(() => button.classList.remove("copied"), 1000);
    });
  });
}

function moodColorStyle(value = "") {
  const hex = String(value).trim();
  let ink = "var(--brand-ink, var(--ink))";
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    ink = luminance < .52 ? "#fff" : "#111";
  }
  return \`--mood-color:\${escapeHtml(value)};--mood-ink:\${ink}\`;
}

function moodBoard(brand = {}) {
  const colors = palette(brand.theme).slice(0, 7);
  const keywords = brand.moodboard?.keywords?.length ? brand.moodboard.keywords : brand.theme?.keywords || [];
  return \`
    <section class="mood-board" aria-label="Mood board">
      <div class="mood-head">
        <div>
          <p class="eyebrow">\${escapeHtml(t("brand.moodBoard"))}</p>
          <h2>\${escapeHtml(t("brand.moodBoard"))}</h2>
        </div>
        <div class="asset-key">\${escapeHtml(t("brand.assetKey"))}: <code>\${escapeHtml(brand.assetKey || brand.slug)}</code></div>
      </div>
      <div class="mood-grid">
        <div>
          <div class="mood-colors">
            \${colors.map(([label, value]) => \`
              <div class="mood-color" style="\${moodColorStyle(value)}">
                <strong>\${escapeHtml(label)}</strong>
                <code>\${escapeHtml(value)}</code>
              </div>
            \`).join("")}
          </div>
          <div class="mood-keywords" aria-label="\${escapeHtml(t("brand.keywords"))}">
            \${keywords.map((keyword) => \`<span>\${escapeHtml(keyword)}</span>\`).join("")}
          </div>
        </div>
        <div>
          \${brandAssetStrip(brand.images || []) || \`<p class="muted">\${escapeHtml(t("brand.blank"))}</p>\`}
        </div>
      </div>
    </section>
  \`;
}

async function renderGlobalResults(query) {
  const panel = $("#globalResults");
  if (!panel) return;
  const q = normalizeSearchText(query).trim();
  if (!q) {
    panel.classList.remove("is-open");
    panel.innerHTML = "";
    return;
  }
  const search = await loadSearch();
  const results = search
    .filter((item) => [item.title, item.subtitle, item.text, item.slug, item.type].join(" ").toLowerCase().includes(q))
    .slice(0, 9);
  if (!results.length) {
    panel.classList.add("is-open");
    panel.innerHTML = \`<div class="global-result"><span>\${escapeHtml(t("home.noResults"))}</span></div>\`;
    return;
  }
  panel.classList.add("is-open");
  panel.innerHTML = results.map((item) => \`
    <a class="global-result" href="\${escapeHtml(item.url)}">
      <small>\${escapeHtml(item.type)} · IP ID \${escapeHtml(item.slug)}</small>
      <strong>\${escapeHtml(item.title)}</strong>
      <span>\${escapeHtml(item.subtitle || item.text || "")}</span>
    </a>
  \`).join("");
}

async function renderHeroIndex() {
  const index = $("#heroIndex");
  if (!index) return;
  cachedBrands ??= await loadJson("api/brands.json");
  index.innerHTML = cachedBrands.map((brand, idx) => {
    const localized = mainBrand(brand);
    return \`
      <div class="hero-index-row" data-brand="\${escapeHtml(brand.slug)}" style="\${themeStyle(brand.theme)};--row-index:\${idx}">
        <a class="hero-index-link" href="\${brand.url}">
          <span class="hero-index-title">\${escapeHtml(localized.name)}\${localized.secondaryName ? \` <span class="hero-index-secondary">· \${escapeHtml(localized.secondaryName)}</span>\` : ""}</span>
        </a>
        \${colorDots(brand.theme)}
        <button class="icon-copy" type="button" data-icon-only="true" data-copy-brand="\${escapeHtml(brand.slug)}" aria-label="\${escapeHtml(t("copy.reference"))} \${escapeHtml(localized.name)}">\${copyIcon()}</button>
      </div>
    \`;
  }).join("");
  index.scrollTop = 0;
  setupCopyButtons(cachedBrands);
}

async function renderVersions() {
  const list = $("#versionList");
  if (!list) return;
  cachedVersions ??= await loadJson("api/versions.json");
  if (!cachedVersions.length) {
    list.innerHTML = \`<p class="muted">\${escapeHtml(t("history.empty"))}</p>\`;
    return;
  }
  list.innerHTML = cachedVersions.slice(0, 6).map((version) => \`
    <a class="version-item" href="\${escapeHtml(version.url)}">
      <strong>\${escapeHtml(version.shortHash)}</strong>
      <span>\${escapeHtml(version.message)}</span>
      <time>\${escapeHtml(new Date(version.date).toLocaleDateString(localeMeta[currentLocale].dateLocale))}</time>
    </a>
  \`).join("");
}

async function renderIndex() {
  const grid = $("#brandGrid");
  if (!grid) return;
  cachedBrands ??= await loadJson("api/brands.json");
  const brands = cachedBrands;
  const filtered = currentQuery
    ? brands.filter((brand) => {
        const localized = mainBrand(brand);
        return [
          brand.slug,
          brand.name,
          brand.nativeName,
          brand.mainName,
          brand.mainLanguage,
          brand.officialWebsite,
          brand.profile?.business?.zh,
          brand.profile?.business?.en,
          brand.profile?.notes?.zh,
          brand.profile?.notes?.en,
          brand.profile?.classification?.tracks?.zh?.join(" "),
          brand.profile?.classification?.tracks?.en?.join(" "),
          brand.profile?.classification?.audiences?.zh?.join(" "),
          brand.profile?.classification?.audiences?.en?.join(" "),
          brand.profile?.classification?.tags?.zh?.join(" "),
          brand.profile?.classification?.tags?.en?.join(" "),
          localized.name,
          localized.secondaryName,
          localized.intro,
          localized.business,
          localized.notes,
          brand.theme?.keywords?.join(" "),
        ].join(" ").toLowerCase().includes(currentQuery);
      })
    : brands;
  const count = $("#brandCount");
  if (count) count.textContent = currentQuery ? \`\${filtered.length}/\${brands.length} IP\` : \`\${brands.length} IP\`;
  await renderGlobalResults(currentQuery);
  if (!filtered.length) {
    grid.innerHTML = \`<p class="empty-state">\${escapeHtml(t("home.noResults"))}</p>\`;
    return;
  }
  grid.innerHTML = filtered.map((brand) => {
    const localized = mainBrand(brand);
    return \`
    <article class="\${cardClass(brand)}" data-brand="\${escapeHtml(brand.slug)}" style="\${themeStyle(brand.theme)}">
      <a class="ip-card-link" href="\${brand.url}" aria-label="\${escapeHtml(localized.name)}">
        <div class="card-body">
          <div class="card-art">
            \${cardHeroImage(brand, localized)}
            <span class="art-code">\${escapeHtml(brand.assetKey || brand.slug)}</span>
          </div>
          <p class="eyebrow">\${escapeHtml(statusLabel(brand.status))}</p>
          <h2>\${escapeHtml(localized.name)}</h2>
          \${miniPalette(brand.theme)}
          <p class="muted alt-name">\${escapeHtml(localized.secondaryName || "")}</p>
          <p class="card-intro">\${escapeHtml(localized.intro || "")}</p>
          <div class="card-profile">
            <span>\${escapeHtml(t("brand.mainLanguage"))}: \${escapeHtml(languageLabel(brand.mainLanguage || localized.language))}</span>
            <span>\${escapeHtml(t("brand.tracks"))}: \${escapeHtml(listText(localized.classification.tracks))}</span>
            <span>\${escapeHtml(t("brand.audiences"))}: \${escapeHtml(listText(localized.classification.audiences))}</span>
            <span>\${escapeHtml(t("brand.business"))}: \${escapeHtml(localized.business || "")}</span>
          </div>
          <div class="meta">
            <span class="pill">\${brand.guideCount} \${t("meta.guides")}</span>
            <span class="pill">API</span>
          </div>
        </div>
      </a>
      <button class="copy-reference icon-copy" type="button" data-icon-only="true" data-copy-brand="\${escapeHtml(brand.slug)}" aria-label="\${escapeHtml(t("copy.reference"))} \${escapeHtml(localized.name)}">\${copyIcon()}</button>
    </article>
  \`;
  }).join("");
  setupCopyButtons(filtered);
}

async function renderBrand() {
  const page = $("#brandPage");
  if (!page) return;
  const slug = new URLSearchParams(location.search).get("brand") || "tableai";
  const brand = await loadJson(\`api/brands/\${slug}.json\`);
  const display = mainBrand(brand);
  const localized = localizedBrand(brand);
  document.title = \`\${display.name} · Brand Guidelines\`;
  const hero = brand.adobeAssets?.[0]?.hero?.sitePath
    ? brand.adobeAssets[0].hero
    : preferredBrandImage(brand.images || []);
  page.innerHTML = \`
    <div class="brand-shell \${themeClass(brand.theme)}" style="\${themeStyle(brand.theme)}">
      <section class="brand-hero">
        <div>
          <p class="eyebrow">\${escapeHtml(statusLabel(brand.status))}</p>
          <h1>\${escapeHtml(display.name)}</h1>
          <p class="muted alt-name">\${escapeHtml(display.secondaryName || "")}</p>
          <p>\${escapeHtml(localized.intro)}</p>
          <div class="profile-tags">
            \${display.classification.tracks.map((item) => \`<span>\${escapeHtml(item)}</span>\`).join("")}
            \${display.classification.audiences.map((item) => \`<span>\${escapeHtml(item)}</span>\`).join("")}
          </div>
          \${swatches(brand.theme, true)}
          <div class="actions">
            <a class="button" href="\${brand.apiUrl}">\${t("brand.openJson")}</a>
            <a class="button ghost" href="\${brand.source.github}">\${t("brand.source")}</a>
          </div>
        </div>
        \${hero ? \`
          <div class="brand-visual">
            <img \${responsiveImageAttributes(hero.sitePath, [640, 1280, 2400], "(max-width: 900px) 100vw, 52vw")} \${imageDimensionAttributes(hero)} alt="\${escapeHtml(hero.title || display.name)}" loading="eager" fetchpriority="high" decoding="async">
            <button class="asset-copy-button icon-copy" type="button" data-icon-only="true" data-copy-asset-url="\${escapeHtml(hero.sitePath)}" aria-label="\${escapeHtml(t("copy.assetUrl"))}">\${copyIcon()}</button>
            <div class="brand-visual-meta">
              <strong>\${escapeHtml(hero.title || display.name)}</strong>
              <span>\${escapeHtml([hero.format, hero.size].filter(Boolean).join(" · "))}</span>
              \${hero.dimensions ? \`<span>\${escapeHtml(hero.dimensions.replace(" x ", " × "))}</span>\` : ""}
            </div>
          </div>
        \` : ""}
      </section>
      \${profileEditor(brand)}
      <section class="brand-architecture" id="brandArchitecture" aria-live="polite"></section>
      \${ipSystemPanel(brand)}
      \${brandAssetHub(brand)}
      \${adobeAssetPanel(brand.adobeAssets || [])}
      \${moodBoard(brand)}
      <section class="resource-list">
        <div class="resource-grid">
          <div class="resource"><strong>\${t("brand.website")}</strong><br>\${brand.officialWebsite ? \`<a href="\${escapeHtml(brand.officialWebsite)}">\${escapeHtml(brand.officialWebsite)}</a>\` : escapeHtml(t("brand.blank"))}</div>
          <div class="resource"><strong>\${t("brand.mainLanguage")}</strong><br>\${escapeHtml(languageLabel(brand.mainLanguage || brand.profile?.mainLanguage) || t("brand.blank"))}</div>
          <div class="resource"><strong>\${t("brand.intro")}</strong><br>\${escapeHtml(localized.intro || t("brand.blank"))}</div>
          <div class="resource"><strong>\${t("brand.business")}</strong><br>\${escapeHtml(localized.business || t("brand.blank"))}</div>
          <div class="resource"><strong>\${t("brand.notes")}</strong><br>\${escapeHtml(localized.notes || t("brand.blank"))}</div>
          <div class="resource"><strong>\${t("brand.tracks")}</strong><br>\${escapeHtml(listText(display.classification.tracks) || t("brand.blank"))}</div>
          <div class="resource"><strong>\${t("brand.audiences")}</strong><br>\${escapeHtml(listText(display.classification.audiences) || t("brand.blank"))}</div>
          <div class="resource"><strong>\${t("brand.tags")}</strong><br>\${escapeHtml(listText(display.classification.tags) || t("brand.blank"))}</div>
        </div>
        <div class="resource"><strong>\${t("brand.colors")}</strong><br>\${escapeHtml(brand.theme?.keywords?.join(" · ") || "")}</div>
        <div class="resource"><strong>\${t("brand.editable")}</strong><br>\${brand.editablePaths?.map(escapeHtml).join("<br>") || t("brand.noneGuide")}</div>
        <div class="resource"><strong>\${t("brand.tokens")}</strong><br>\${brand.tokens?.map((token) => escapeHtml(token.path)).join("<br>") || t("brand.noneTokens")}</div>
      </section>
      \${brand.guides?.map((guide) => \`
        <article class="guide guide-rendered">
          <p class="eyebrow">\${escapeHtml(t("brand.guideline"))}</p>
          <div class="rendered-document brand-guide-document">\${guide.html || ("<p>" + escapeHtml(guide.excerpt || "") + "</p>")}</div>
        </article>
      \`).join("") || ""}
    </div>
  \`;
  setupProfileEditor(brand);
  setupIpSystemPanel(brand);
  setupAssetCopyButtons();
  renderBrandArchitecture(slug).catch(console.error);
}

function primaryIpName(ip = {}) {
  return ip.mainLanguage === "en" ? (ip.names?.en || ip.names?.zh || ip.slug) : (ip.names?.zh || ip.names?.en || ip.slug);
}

function setupDirectoryLink() {
  document.querySelectorAll(".top-actions").forEach((nav) => {
    if (nav.querySelector('[href="directory"]')) return;
    const link = document.createElement("a");
    link.href = "directory";
    link.textContent = "Directory";
    nav.insertBefore(link, nav.firstChild);
  });
}

function secondaryIpName(ip = {}) {
  const primary = primaryIpName(ip);
  return [ip.names?.zh, ip.names?.en].find((name) => name && name !== primary) || "";
}

async function loadIpSystem() {
  try {
    const [ips, taxonomy, applications, relationships] = await Promise.all([loadJson("api/v2/ips"), loadJson("api/v2/taxonomy"), loadJson("api/v2/applications"), loadJson("api/v2/ip-relations")]);
    return { ips: ips.items || [], taxonomy, applications: applications.items || [], relationships: relationships.items || [] };
  } catch {
    const [snapshot, taxonomy] = await Promise.all([loadJson("api/ips.json"), loadJson("api/taxonomy.json")]);
    return { ips: snapshot.items || [], taxonomy, applications: snapshot.applications || [], relationships: snapshot.relationships || [] };
  }
}

function taxonomyLabel(term = {}) {
  return term.labels?.[currentLocale === "en" ? "en" : "zh"] || term[currentLocale === "en" ? "en" : "zh"] || term.id || "";
}

function selectOptions(items, active, empty) {
  return \`<option value="">\${escapeHtml(empty)}</option>\${items.map((item) => \`<option value="\${escapeHtml(item.id)}" \${active === item.id ? "selected" : ""}>\${escapeHtml(taxonomyLabel(item))}</option>\`).join("")}\`;
}

async function renderDirectory() {
  const page = $("#directoryPage");
  if (!page) return;
  const data = await loadIpSystem();
  const params = new URLSearchParams(location.search);
  const industry = params.get("industry") || "";
  const ipType = params.get("type") || "";
  const parent = params.get("parent") || "";
  const architectureRole = params.get("architectureRole") || "";
  const query = (params.get("q") || "").trim().toLowerCase();
  const parents = new Map((data.relationships || []).filter((item) => item.type === "brand_parent" && item.primary).map((item) => [item.child, item.parent]));
  const filtered = data.ips.filter((ip) => (!industry || ip.primaryIndustry === industry || ip.industries?.includes(industry)) && (!ipType || ip.ipType === ipType) && (!architectureRole || ip.architectureRoles?.includes(architectureRole)) && (!parent || parents.get(ip.slug) === parent) && (!query || [ip.slug, ip.names?.zh, ip.names?.en].join(" ").toLowerCase().includes(query)));
  const parentIps = data.ips.filter((ip) => ip.architectureRoles?.includes("parent") || (data.relationships || []).some((relation) => relation.parent === ip.slug));
  page.innerHTML = \`
    <header class="directory-hero"><p class="eyebrow">IPTrust Directory</p><h1>\${currentLocale === "en" ? "IP, clearly structured." : "IP，一目了然。"}</h1><p>\${data.ips.length} IP · \${data.applications.length} \${currentLocale === "en" ? "applications" : "项目应用"}</p></header>
    <form class="directory-filters" id="directoryFilters">
      <input name="q" value="\${escapeHtml(params.get("q") || "")}" placeholder="\${currentLocale === "en" ? "Search IP" : "搜索 IP"}">
      <select name="industry">\${selectOptions(data.taxonomy.industries || [], industry, currentLocale === "en" ? "All industries" : "全部行业")}</select>
      <select name="type">\${selectOptions(data.taxonomy.ipTypes || [], ipType, currentLocale === "en" ? "All IP types" : "全部类型")}</select>
      <select name="architectureRole"><option value="">\${currentLocale === "en" ? "All architecture roles" : "全部架构"}</option><option value="parent" \${architectureRole === "parent" ? "selected" : ""}>\${currentLocale === "en" ? "Parent IP" : "母 IP"}</option><option value="child" \${architectureRole === "child" ? "selected" : ""}>\${currentLocale === "en" ? "Child IP" : "子 IP"}</option><option value="standalone" \${architectureRole === "standalone" ? "selected" : ""}>\${currentLocale === "en" ? "Standalone" : "独立 IP"}</option></select>
      <select name="parent"><option value="">\${currentLocale === "en" ? "All parent IPs" : "全部母 IP"}</option>\${parentIps.map((ip) => \`<option value="\${ip.slug}" \${parent === ip.slug ? "selected" : ""}>\${escapeHtml(primaryIpName(ip))}</option>\`).join("")}</select>
      <button type="submit">\${currentLocale === "en" ? "Apply" : "筛选"}</button>
    </form>
    <section class="directory-list">\${filtered.map((ip) => {
      const parentIp = data.ips.find((candidate) => candidate.slug === parents.get(ip.slug));
      const href = ip.recordClass === "owned" ? (ip.url || \`brand.html?brand=\${ip.slug}\`) : \`ip?ip=\${ip.slug}\`;
      return \`<a class="directory-row" href="\${escapeHtml(href)}"><span class="directory-name"><strong>\${escapeHtml(primaryIpName(ip))}</strong>\${secondaryIpName(ip) ? \`<small>\${escapeHtml(secondaryIpName(ip))}</small>\` : ""}</span><span>\${escapeHtml(taxonomyLabel((data.taxonomy.industries || []).find((item) => item.id === ip.primaryIndustry)))}</span><span>\${escapeHtml(taxonomyLabel((data.taxonomy.ipTypes || []).find((item) => item.id === ip.ipType)))}</span><span>\${parentIp ? \`↳ \${escapeHtml(primaryIpName(parentIp))}\` : ""}</span><b>↗</b></a>\`;
    }).join("") || \`<p class="empty-state">\${escapeHtml(t("home.noResults"))}</p>\`}</section>
    <section class="application-directory"><header><p class="eyebrow">Applications</p><h2>\${currentLocale === "en" ? "Project applications" : "项目应用"}</h2></header>\${data.applications.map((app) => \`<a href="application?application=\${escapeHtml(app.slug)}"><strong>\${escapeHtml(app.mainLanguage === "en" ? (app.names?.en || app.names?.zh) : (app.names?.zh || app.names?.en))}</strong><span>\${escapeHtml(app.applicationType)}</span><b>↗</b></a>\`).join("")}</section>
  \`;
}

async function fallbackGraph(slug) {
  const data = await loadIpSystem();
  const ip = data.ips.find((item) => item.slug === slug);
  if (!ip) return null;
  const findNames = (candidate) => data.ips.find((item) => item.slug === candidate)?.names || {};
  return {
    ip,
    parents: data.relationships.filter((item) => item.child === slug).map((item) => ({ ...item, parentNames: findNames(item.parent), childNames: findNames(item.child) })),
    children: data.relationships.filter((item) => item.parent === slug).map((item) => ({ ...item, parentNames: findNames(item.parent), childNames: findNames(item.child) })),
    applications: data.applications.filter((app) => app.links?.some((link) => link.ip === slug)),
  };
}

async function loadGraph(slug) {
  try { return await loadJson(\`api/v2/ips/\${encodeURIComponent(slug)}/graph\`); } catch { return fallbackGraph(slug); }
}

async function renderIpRecord() {
  const page = $("#ipRecordPage");
  if (!page) return;
  const slug = new URLSearchParams(location.search).get("ip") || "";
  const graph = await loadGraph(slug);
  if (!graph) { page.innerHTML = \`<p class="empty-state">IP not found.</p>\`; return; }
  const ip = graph.ip;
  page.innerHTML = \`<article class="record-detail"><p class="eyebrow">\${escapeHtml(ip.recordClass)} · \${escapeHtml(ip.ipType)}</p><h1>\${escapeHtml(primaryIpName(ip))}</h1><p class="record-secondary">\${escapeHtml(secondaryIpName(ip))}</p><div class="record-facts"><span>\${escapeHtml(ip.primaryIndustry)}</span><span>\${escapeHtml(ip.lifecycleStatus)}</span><span>\${escapeHtml(ip.guidelineMode)}</span></div>\${ip.sourceUrl ? \`<a class="button" href="\${escapeHtml(ip.sourceUrl)}" rel="noreferrer">Official source ↗</a>\` : ""}</article>\${graph.parents?.length ? \`<section class="lineage-block"><p class="eyebrow">Parent IP</p>\${graph.parents.map((relation) => \`<a href="ip?ip=\${relation.parent}">\${escapeHtml(relation.parentNames?.zh || relation.parentNames?.en || relation.parent)}</a>\`).join("")}</section>\` : ""}\${graph.children?.length ? \`<section class="lineage-block"><p class="eyebrow">Child IP</p>\${graph.children.map((relation) => \`<a href="ip?ip=\${relation.child}">\${escapeHtml(relation.childNames?.zh || relation.childNames?.en || relation.child)}</a>\`).join("")}</section>\` : ""}\${graph.applications?.length ? \`<section class="lineage-block"><p class="eyebrow">Applications</p>\${graph.applications.map((app) => \`<a href="application?application=\${app.slug}">\${escapeHtml(primaryIpName(app))}</a>\`).join("")}</section>\` : ""}\`;
}

async function renderApplicationPage() {
  const page = $("#applicationPage");
  if (!page) return;
  const slug = new URLSearchParams(location.search).get("application") || "";
  const ipSystemData = await loadIpSystem();
  let app;
  try { app = await loadJson(\`api/v2/applications/\${encodeURIComponent(slug)}\`); } catch { app = ipSystemData.applications.find((item) => item.slug === slug); }
  if (!app) { page.innerHTML = \`<p class="empty-state">Application not found.</p>\`; return; }
  const title = app.mainLanguage === "en" ? (app.names?.en || app.names?.zh) : (app.names?.zh || app.names?.en);
  const primary = app.links?.find((link) => link.role === "primary")?.ip || "";
  const primaryRecord = ipSystemData.ips.find((item) => item.slug === primary);
  page.innerHTML = \`<article class="record-detail"><p class="eyebrow">\${escapeHtml(app.applicationType)} · Application</p><h1>\${escapeHtml(title)}</h1><p class="record-secondary">\${escapeHtml(app.description?.[currentLocale === "en" ? "en" : "zh"] || app.description?.zh || app.description?.en || "")}</p><div class="record-facts"><a href="ip?ip=\${escapeHtml(primary)}">Primary IP · \${escapeHtml(primaryRecord ? primaryIpName(primaryRecord) : primary)}</a><span>\${escapeHtml(app.guidelineMode)} guidelines</span><span>\${escapeHtml([app.location?.province, app.location?.city].filter(Boolean).join(" · "))}</span></div></article>\`;
  const [assetData, historyData] = await Promise.all([
    loadJson("api/v2/assets?ownerType=ip-application&ownerId=" + encodeURIComponent(slug)).catch(() => ({ items: [] })),
    loadJson("api/v2/applications/" + encodeURIComponent(slug) + "/history").catch(() => ({ items: [] })),
  ]);
  const details = document.createElement("section");
  details.className = "application-details";
  const linked = (app.links || []).filter((link) => link.role !== "primary");
  const business = app.business?.[currentLocale === "en" ? "en" : "zh"] || app.business?.zh || app.business?.en || "";
  details.innerHTML = '<div><p class="eyebrow">Guideline inheritance</p><h2>' + escapeHtml(app.guidelineMode === "inherit" ? "继承主 IP 规范" : app.guidelineMode) + '</h2><p>' + escapeHtml(Object.keys(app.overrides || {}).length ? "含局部覆盖" : "无局部覆盖") + '</p></div>'
    + '<div><p class="eyebrow">Linked IP</p>' + (linked.map((link) => '<a href="ip?ip=' + escapeHtml(link.ip) + '">' + escapeHtml(link.role + " · " + link.ip) + '</a>').join("") || '<p class="muted">None</p>') + '</div>'
    + '<div><p class="eyebrow">Business</p><p>' + escapeHtml(business || t("brand.blank")) + '</p></div>'
    + '<div><p class="eyebrow">Assets</p><p>' + escapeHtml(String(assetData.items?.length || 0)) + ' files</p></div>'
    + '<div><p class="eyebrow">History</p><p>' + escapeHtml(String(historyData.items?.length || 0)) + ' revisions</p></div>';
  page.append(details);
}

async function renderBrandArchitecture(slug) {
  const node = $("#brandArchitecture");
  if (!node) return;
  const graph = await loadGraph(slug);
  if (!graph || (!graph.parents?.length && !graph.children?.length && !graph.applications?.length)) { node.remove(); return; }
  node.innerHTML = \`<header><p class="eyebrow">Architecture</p><h2>\${currentLocale === "en" ? "Brand lineage" : "品牌谱系"}</h2></header><div class="lineage-grid">\${graph.parents.map((relation) => \`<a href="ip?ip=\${relation.parent}"><small>Parent IP</small><strong>\${escapeHtml(relation.parentNames?.zh || relation.parentNames?.en || relation.parent)}</strong></a>\`).join("")}\${graph.children.map((relation) => \`<a href="ip?ip=\${relation.child}"><small>Child IP</small><strong>\${escapeHtml(relation.childNames?.zh || relation.childNames?.en || relation.child)}</strong></a>\`).join("")}\${graph.applications.map((app) => \`<a href="application?application=\${app.slug}"><small>Application</small><strong>\${escapeHtml(app.names?.zh || app.names?.en || app.slug)}</strong></a>\`).join("")}</div>\`;
}

function setupWebVitals() {
  if (!("PerformanceObserver" in window) || Math.random() > 0.1) return;
  const metrics = { ttfb: 0, lcp: 0, cls: 0, inp: 0, transferSize: 0 };
  const navigation = performance.getEntriesByType("navigation")[0];
  if (navigation) {
    metrics.ttfb = Math.max(0, navigation.responseStart - navigation.requestStart);
    metrics.transferSize = navigation.transferSize || 0;
  }
  const observe = (type, callback, options = {}) => {
    if (!PerformanceObserver.supportedEntryTypes?.includes(type)) return;
    try {
      const observer = new PerformanceObserver((list) => list.getEntries().forEach(callback));
      observer.observe({ type, buffered: true, ...options });
    } catch {}
  };
  observe("largest-contentful-paint", (entry) => { metrics.lcp = Math.max(metrics.lcp, entry.startTime || 0); });
  observe("layout-shift", (entry) => { if (!entry.hadRecentInput) metrics.cls += entry.value || 0; });
  observe("event", (entry) => { metrics.inp = Math.max(metrics.inp, entry.duration || 0); }, { durationThreshold: 40 });
  let reported = false;
  const report = () => {
    if (reported) return;
    reported = true;
    const serverTiming = navigation?.serverTiming || [];
    const cache = serverTiming.find((item) => item.name === "edge-cache")?.description || "unknown";
    const body = JSON.stringify({ ...metrics, path: location.pathname, locale: document.documentElement.lang || "und", cache, imageFormat: "negotiated" });
    navigator.sendBeacon(new URL("/api/v2/metrics/web-vitals", location.origin), new Blob([body], { type: "application/json" }));
  };
  addEventListener("pagehide", report, { once: true });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") report(); }, { once: true });
}

applyI18n();
setupLanguageToggle();
setupDirectoryLink();
setupSearch();
setupPortalActions();
setupApiConnect();
renderHeroIndex().catch(console.error);
renderIndex().catch(console.error);
renderBrand().catch(console.error);
renderDirectory().catch(console.error);
renderIpRecord().catch(console.error);
renderApplicationPage().catch(console.error);
setupWebVitals();`);
await copyFile(join(assetsDir, "site.js"), join(siteDir, siteJsPath));

await writeFile(join(assetsDir, "admin.js"), html`const $ = (selector) => document.querySelector(selector);
const state = { csrf: "", ipScopes: [], taxonomy: null, ips: [], slug: "", ipEtag: "", brandEtag: "", brand: null, applicationSlug: "", applicationEtag: "", applicationLinks: [] };

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function status(message, isError = false) {
  const node = $("#editorStatus") || $("#unlockStatus");
  if (!node) return;
  node.textContent = message;
  node.style.color = isError ? "#b12137" : "#0e8c7b";
}

async function api(path, init = {}) {
  const method = init.method || "GET";
  const headers = new Headers(init.headers || {});
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("X-CSRF-Token", state.csrf);
  const target = path.startsWith("api/") ? new URL("../" + path, import.meta.url) : path;
  const response = await fetch(target, { ...init, method, headers, credentials: "include" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || ("HTTP " + response.status));
  return { data, response };
}

function primaryName(ip) {
  return ip.mainLanguage === "en" ? (ip.names?.en || ip.names?.zh || ip.slug) : (ip.names?.zh || ip.names?.en || ip.slug);
}

function options(items, selected = "") {
  return items.map((item) => '<option value="' + esc(item.id) + '"' + (selected === item.id ? " selected" : "") + ">" + esc(item.labels?.zh || item.zh || item.id) + "</option>").join("");
}

function setSelectValues(select, values) {
  for (const option of select.options) option.selected = values.includes(option.value);
}

async function loadOverview() {
  const value = (await api("api/v2/admin/status")).data;
  const labels = { ips: "IP", applications: "项目应用", assets: "资产", assetBytes: "存储字节", sessions: "有效会话" };
  $("#adminStats").innerHTML = Object.entries(value.counts).map(([key, count]) => '<article><strong>' + Number(count).toLocaleString() + '</strong><span>' + labels[key] + "</span></article>").join("");
  $("#serviceHealth").innerHTML = Object.entries(value.services).map(([key, service]) => '<span class="' + (service === "connected" ? "is-ok" : "") + '"><i></i>' + key + " · " + service + "</span>").join("");
}

function populateIpSelectors() {
  const allowed = state.ipScopes.includes("*") ? state.ips : state.ips.filter((ip) => state.ipScopes.includes(ip.slug));
  const markup = allowed.map((ip) => '<option value="' + esc(ip.slug) + '">' + esc(primaryName(ip)) + "</option>").join("");
  for (const selector of ["#brandSelect", "#relationParent", "#relationChild", "#applicationPrimary"]) {
    const node = $(selector);
    if (node) node.innerHTML = markup;
  }
}

async function loadCore() {
  const [taxonomy, ips] = await Promise.all([api("api/v2/taxonomy"), api("api/v2/ips")]);
  state.taxonomy = taxonomy.data;
  state.ips = ips.data.items || [];
  $("#ipType").innerHTML = options(state.taxonomy.ipTypes || []);
  $("#ipPrimaryIndustry").innerHTML = options(state.taxonomy.industries || []);
  $("#ipIndustries").innerHTML = options(state.taxonomy.industries || []);
  $("#applicationType").innerHTML = options(state.taxonomy.applicationTypes || []);
  populateIpSelectors();
  await Promise.all([loadOverview(), loadRelations(), loadApplications()]);
  if ($("#brandSelect").value) await loadIp();
}

async function loadIp() {
  const slug = $("#brandSelect").value;
  if (!slug) return;
  const [ipResult, brandResult] = await Promise.all([api("api/v2/ips/" + encodeURIComponent(slug)), api("api/v2/brands/" + encodeURIComponent(slug)).catch(() => null)]);
  const ip = ipResult.data;
  state.slug = slug;
  state.ipEtag = ipResult.response.headers.get("etag") || "";
  state.brandEtag = brandResult?.response.headers.get("etag") || "";
  state.brand = brandResult?.data || ip.payload || {};
  $("#ipNameZh").value = ip.names?.zh || "";
  $("#ipNameEn").value = ip.names?.en || "";
  $("#ipMainLanguage").value = ip.mainLanguage;
  $("#ipType").value = ip.ipType;
  $("#ipPrimaryIndustry").value = ip.primaryIndustry;
  setSelectValues($("#ipIndustries"), ip.industries || []);
  $("#ipLifecycle").value = ip.lifecycleStatus;
  $("#ipGuideline").value = ip.guidelineMode;
  $("#ipParentCapable").checked = Boolean(ip.parentCapable);
  $("#editor").value = JSON.stringify(state.brand, null, 2);
  $("#recordVersion").textContent = state.ipEtag;
  status("已载入 " + primaryName(ip));
}

async function saveIp() {
  const patch = {
    names: { zh: $("#ipNameZh").value.trim(), en: $("#ipNameEn").value.trim() },
    mainLanguage: $("#ipMainLanguage").value,
    ipType: $("#ipType").value,
    primaryIndustry: $("#ipPrimaryIndustry").value,
    industries: [...$("#ipIndustries").selectedOptions].map((option) => option.value),
    lifecycleStatus: $("#ipLifecycle").value,
    guidelineMode: $("#ipGuideline").value,
    parentCapable: $("#ipParentCapable").checked,
  };
  const result = await api("api/v2/ips/" + encodeURIComponent(state.slug), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "If-Match": state.ipEtag, "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ patch }),
  });
  state.ipEtag = result.response.headers.get("etag") || "";
  $("#recordVersion").textContent = state.ipEtag;
  status("字段已保存。");
  await loadCore();
}

async function saveBrand() {
  const patch = JSON.parse($("#editor").value);
  const result = await api("api/v2/brands/" + encodeURIComponent(state.slug), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "If-Match": state.brandEtag, "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ patch }),
  });
  state.brandEtag = result.response.headers.get("etag") || "";
  status("品牌内容已保存。");
}

async function loadRelations() {
  const items = (await api("api/v2/ip-relations")).data.items || [];
  $("#relationList").innerHTML = '<h2>当前关系</h2>' + items.map((item) => '<div class="admin-list-row"><span><strong>' + esc(item.parent) + " → " + esc(item.child) + "</strong><small>" + esc(item.type) + (item.primary ? " · primary" : "") + '</small></span><button class="ghost" type="button" data-delete-relation="' + esc(item.id) + '" data-version="' + Number(item.version || 1) + '">删除</button></div>').join("");
  document.querySelectorAll("[data-delete-relation]").forEach((button) => button.addEventListener("click", () => deleteRelation(button).catch((error) => status(error.message, true))));
}

async function deleteRelation(button) {
  if (!window.confirm("确认删除这条关系？")) return;
  const id = button.dataset.deleteRelation;
  await api("api/v2/ip-relations/" + encodeURIComponent(id), { method: "DELETE", headers: { "If-Match": '"ip-relation-' + id + "-v" + button.dataset.version + '"', "Idempotency-Key": crypto.randomUUID() }, body: "{}" });
  status("关系已删除。");
  await loadRelations();
}

async function createRelation(event) {
  event.preventDefault();
  await api("api/v2/ip-relations", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ parent: $("#relationParent").value, child: $("#relationChild").value, type: $("#relationType").value, primary: $("#relationType").value === "brand_parent" }),
  });
  status("品牌关系已建立。");
  await loadRelations();
}

async function loadApplications() {
  const items = (await api("api/v2/applications")).data.items || [];
  $("#applicationList").innerHTML = '<h2>项目应用</h2>' + items.map((item) => '<button class="admin-list-row" type="button" data-edit-application="' + esc(item.slug) + '"><strong>' + esc(primaryName(item)) + "</strong><span>" + esc(item.applicationType) + " · " + esc(item.guidelineMode) + "</span></button>").join("");
  document.querySelectorAll("[data-edit-application]").forEach((button) => button.addEventListener("click", () => loadApplication(button.dataset.editApplication).catch((error) => status(error.message, true))));
}

function resetApplication() {
  state.applicationSlug = "";
  state.applicationEtag = "";
  state.applicationLinks = [];
  $("#applicationForm").reset();
  $("#applicationSlug").disabled = false;
  $("#applicationFormTitle").textContent = "新增项目应用";
  populateIpSelectors();
}

async function loadApplication(slug) {
  const result = await api("api/v2/applications/" + encodeURIComponent(slug));
  const item = result.data;
  state.applicationSlug = slug;
  state.applicationEtag = result.response.headers.get("etag") || "";
  state.applicationLinks = item.links || [];
  $("#applicationSlug").value = slug;
  $("#applicationSlug").disabled = true;
  $("#applicationNameZh").value = item.names?.zh || "";
  $("#applicationNameEn").value = item.names?.en || "";
  $("#applicationType").value = item.applicationType;
  $("#applicationPrimary").value = item.links?.find((link) => link.role === "primary")?.ip || "";
  $("#applicationGuideline").value = item.guidelineMode || "inherit";
  $("#applicationDescriptionZh").value = item.description?.zh || "";
  $("#applicationDescriptionEn").value = item.description?.en || "";
  $("#applicationBusinessZh").value = item.business?.zh || "";
  $("#applicationBusinessEn").value = item.business?.en || "";
  $("#applicationProvince").value = item.location?.province || "";
  $("#applicationCity").value = item.location?.city || "";
  $("#applicationFormTitle").textContent = "编辑项目应用";
}

async function saveApplication(event) {
  event.preventDefault();
  const slug = state.applicationSlug || $("#applicationSlug").value;
  const editing = Boolean(state.applicationSlug);
  const primaryIp = $("#applicationPrimary").value;
  const links = [{ ip: primaryIp, role: "primary" }, ...state.applicationLinks.filter((link) => link.role !== "primary" && link.ip !== primaryIp)];
  const headers = { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() };
  if (editing) headers["If-Match"] = state.applicationEtag;
  await api(editing ? "api/v2/applications/" + encodeURIComponent(slug) : "api/v2/applications", {
    method: editing ? "PATCH" : "POST",
    headers,
    body: JSON.stringify({ patch: { slug, names: { zh: $("#applicationNameZh").value, en: $("#applicationNameEn").value }, mainLanguage: $("#applicationNameZh").value ? "zh" : "en", applicationType: $("#applicationType").value, lifecycleStatus: "active", guidelineMode: $("#applicationGuideline").value, description: { zh: $("#applicationDescriptionZh").value, en: $("#applicationDescriptionEn").value }, business: { zh: $("#applicationBusinessZh").value, en: $("#applicationBusinessEn").value }, location: { country: "CN", province: $("#applicationProvince").value, city: $("#applicationCity").value }, links } }),
  });
  status(editing ? "项目应用已保存。" : "项目应用已创建。");
  resetApplication();
  await loadApplications();
}

async function loadAssets() {
  const items = (await api("api/v2/assets?limit=100")).data.items || [];
  $("#assetList").innerHTML = '<h2>资产</h2>' + items.map((item) => '<div class="admin-list-row"><strong>' + esc(item.title) + "</strong><span>" + esc(item.ownerId) + " · " + esc(item.mimeType) + " · " + Number(item.bytes || 0).toLocaleString() + " B</span></div>").join("");
}

async function loadJobs() {
  const value = (await api("api/v2/admin/jobs")).data;
  $("#jobList").innerHTML = '<h2>任务</h2><pre>' + JSON.stringify({ counts: value.counts, outbox: value.outbox?.slice(0, 30), assetJobs: value.assetJobs?.slice(0, 30) }, null, 2) + "</pre>";
}

async function loadAudit() {
  const items = (await api("api/v2/audit?limit=100")).data.items || [];
  $("#auditList").innerHTML = '<h2>审计</h2>' + items.map((item) => '<div class="admin-list-row"><strong>' + esc(item.action) + "</strong><span>" + esc(item.resource_type) + " · " + esc(item.resource_id) + " · " + esc(item.created_at) + "</span></div>").join("");
}

async function loadKeys() {
  const items = (await api("api/v2/admin/keys")).data.items || [];
  $("#keyList").innerHTML = '<h2>API Keys</h2>' + items.map((item) => '<div class="admin-list-row"><span><strong>' + esc(item.label) + "</strong><small>" + esc(item.prefix) + " · " + (item.revoked_at ? "revoked" : "active") + '</small></span>' + (item.revoked_at ? "" : '<button class="ghost" type="button" data-revoke-key="' + esc(item.id) + '" data-etag="' + esc(item.etag) + '">撤销</button>') + "</div>").join("");
  document.querySelectorAll("[data-revoke-key]").forEach((button) => button.addEventListener("click", () => revokeKey(button).catch((error) => status(error.message, true))));
}

function csv(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

async function createKey(event) {
  event.preventDefault();
  const result = await api("api/v2/admin/keys", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ label: $("#keyLabel").value, kind: $("#keyKind").value, scopes: csv($("#keyScopes").value), ipScopes: csv($("#keyIpScopes").value) }) });
  $("#newKeyToken").textContent = result.data.key.token;
  $("#newKeyToken").classList.remove("hidden");
  status("Key 已创建；明文只显示这一次。");
  await loadKeys();
}

async function revokeKey(button) {
  if (!window.confirm("确认撤销这个 API Key？")) return;
  await api("api/v2/admin/keys/" + encodeURIComponent(button.dataset.revokeKey), { method: "DELETE", headers: { "If-Match": button.dataset.etag, "Idempotency-Key": crypto.randomUUID() }, body: "{}" });
  status("Key 已撤销。");
  await loadKeys();
}

async function stepUp() {
  const result = await api("api/v2/auth/step-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ totp: $("#stepUpTotp").value }) });
  status("高权限已验证至 " + result.data.stepUpUntil);
  $("#stepUpTotp").value = "";
}

async function showAdmin(actor) {
  state.ipScopes = actor.ipScopes?.length ? actor.ipScopes : ["*"];
  $("#unlockPanel").classList.add("hidden");
  $("#editorPanel").classList.remove("hidden");
  await loadCore();
}

async function restoreSession() {
  const result = await api("api/v2/auth/session");
  state.csrf = result.data.csrfToken || "";
  sessionStorage.setItem("iptrust_csrf", state.csrf);
  await showAdmin(result.data.actor);
}

async function unlock() {
  const key = $("#adminKey").value;
  const totp = $("#totpCode").value.trim();
  if (!key || !totp) throw new Error("Key + Google Authenticator first.");
  const result = await api("api/v2/auth/exchange", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: key, totp }) });
  state.csrf = result.data.csrfToken || "";
  sessionStorage.setItem("iptrust_csrf", state.csrf);
  $("#adminKey").value = "";
  $("#totpCode").value = "";
  await showAdmin({ ipScopes: result.data.ipScopes, scopes: result.data.scopes });
}

document.querySelectorAll("[data-admin-tab]").forEach((button) => button.addEventListener("click", async () => {
  document.querySelectorAll("[data-admin-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
  document.querySelectorAll("[data-admin-view]").forEach((view) => view.classList.toggle("hidden", view.dataset.adminView !== button.dataset.adminTab));
  const loaders = { overview: loadOverview, assets: loadAssets, jobs: loadJobs, audit: loadAudit, keys: loadKeys };
  if (loaders[button.dataset.adminTab]) await loaders[button.dataset.adminTab]().catch((error) => status(error.message, true));
}));
$("#unlockButton")?.addEventListener("click", () => unlock().catch((error) => status(error.message, true)));
$("#brandSelect")?.addEventListener("change", () => loadIp().catch((error) => status(error.message, true)));
$("#loadBrand")?.addEventListener("click", () => loadIp().catch((error) => status(error.message, true)));
$("#saveIp")?.addEventListener("click", () => saveIp().catch((error) => status(error.message, true)));
$("#saveBrand")?.addEventListener("click", () => saveBrand().catch((error) => status(error.message, true)));
$("#relationForm")?.addEventListener("submit", (event) => createRelation(event).catch((error) => status(error.message, true)));
$("#applicationForm")?.addEventListener("submit", (event) => saveApplication(event).catch((error) => status(error.message, true)));
$("#newApplication")?.addEventListener("click", resetApplication);
$("#keyForm")?.addEventListener("submit", (event) => createKey(event).catch((error) => status(error.message, true)));
$("#stepUpButton")?.addEventListener("click", () => stepUp().catch((error) => status(error.message, true)));
restoreSession().catch(() => {});
`);

console.log(`Built site with ${brandPayloads.length} brands at ${relative(root, siteDir)}`);
