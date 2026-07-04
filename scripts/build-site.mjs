import { mkdir, readFile, rm, writeFile, copyFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const siteDir = join(root, "site");
const apiDir = join(siteDir, "api");
const brandApiDir = join(apiDir, "brands");
const historyApiDir = join(apiDir, "history");
const assetsDir = join(siteDir, "assets");
const imageDir = join(assetsDir, "brand-images");
const contactDir = join(assetsDir, "contact");

const brands = JSON.parse(await readFile(join(root, "config/brands.json"), "utf8"));
const adminConfig = existsSync(join(root, "config/site-admin.public.json"))
  ? JSON.parse(await readFile(join(root, "config/site-admin.public.json"), "utf8"))
  : {};
const hubName = "岁知社 IPTrust";
const hubNameCn = "岁知社";
const hubNameEn = "IPTrust";
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
  };
}

function html(strings, ...values) {
  return String.raw({ raw: strings }, ...values);
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
        url: `https://github.com/${adminConfig.owner ?? "fengurt"}/${adminConfig.repo ?? "tableai_designaha"}/commit/${hash}`,
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
        url: `https://github.com/${adminConfig.owner ?? "fengurt"}/${adminConfig.repo ?? "tableai_designaha"}/commit/${hash}`,
        sourcePaths: paths,
      };
    });
  } catch {
    return [];
  }
}

function apiSchemaPayload() {
  return {
    name: "IPTrust Brand API Schema",
    version: "1.0.0",
    description: "Every public IPTrust brand field is callable through JSON APIs and versioned through Git-backed history endpoints.",
    endpoints: {
      manifest: "api/manifest.json",
      allBrands: "api/brands.json",
      search: "api/search.json",
      allVersions: "api/versions.json",
      brand: "api/brands/{slug}.json",
      brandHistory: "api/history/{slug}.json",
      skill: "skills/iptrust-live-update/SKILL.md",
      llms: "llms.txt",
    },
    brandFields: {
      slug: "Stable IP identifier.",
      folder: "Local source folder.",
      name: "Configured public/English name.",
      nativeName: "Configured native/Chinese or alternate name.",
      mainName: "Name chosen from mainLanguage.",
      mainLanguage: "Main display language: zh or en.",
      mainLocale: "Public label for mainLanguage: CN or EN.",
      officialWebsite: "Official website URL, blank when unknown.",
      description: "Short configured description.",
      display: "Bilingual display names and secondary labels.",
      profile: "Callable business profile fields: officialWebsite, mainLanguage, intro, business, notes.",
      intro: "Live bilingual intro generated from config or primary guideline.",
      business: "Bilingual business/service scope.",
      notes: "Bilingual notes for public context, agent hints, or operational remarks.",
      theme: "Brand colors, surface, ink, line, mode, and keywords.",
      url: "Public website brand page.",
      apiUrl: "Per-IP JSON endpoint.",
      historyUrl: "Per-IP Git-backed version endpoint.",
      status: "documented or placeholder.",
      guides: "Guideline metadata and text.",
      tokens: "Token file metadata and text.",
      images: "Image asset metadata and public site paths.",
      editablePaths: "Source files editable from admin flow.",
      source: "GitHub source folder and local folder.",
      version: "Latest build/global version object.",
      history: "Latest per-IP history records.",
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

const previousVersions = await loadPreviousJson(join(apiDir, "versions.json"), []);
const previousHistoryBySlug = new Map(await Promise.all(brands.map(async (brand) => {
  const previous = await loadPreviousJson(join(historyApiDir, `${brand.slug}.json`), null);
  return [brand.slug, previous?.versions ?? []];
})));
const versions = mergeVersionHistory(loadVersions(), previousVersions, 20);
const buildFingerprint = createHash("sha256");
for (const inputPath of ["scripts/build-site.mjs", "config/brands.json", "package.json"]) {
  buildFingerprint.update(await readFile(join(root, inputPath)));
}
const buildVersion = `${versions[0]?.shortHash ?? "dev"}-${buildFingerprint.digest("hex").slice(0, 8)}`;
const siteCssPath = `assets/site-${buildVersion}.css`;
const siteJsPath = `assets/site-${buildVersion}.js`;

await rm(siteDir, { recursive: true, force: true });
await mkdir(brandApiDir, { recursive: true });
await mkdir(historyApiDir, { recursive: true });
await mkdir(imageDir, { recursive: true });
await mkdir(contactDir, { recursive: true });
await mkdir(join(siteDir, "skills", "iptrust-live-update"), { recursive: true });
if (existsSync(join(root, "skills/iptrust-live-update/SKILL.md"))) {
  await copyFile(join(root, "skills/iptrust-live-update/SKILL.md"), join(siteDir, "skills/iptrust-live-update/SKILL.md"));
}
if (existsSync(join(root, "assets/contact/wecom-qr.png"))) {
  await copyFile(join(root, "assets/contact/wecom-qr.png"), join(contactDir, "wecom-qr.png"));
}

const brandPayloads = [];

for (const brand of brands) {
  const folderAbs = join(root, brand.folder);
  const files = await walk(folderAbs);
  const guides = [];
  const tokens = [];
  const images = [];

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
    if (isBrandImage(rel)) {
      const outputName = `${brand.slug}${extname(rel).toLowerCase()}`;
      await copyFile(full, join(imageDir, outputName));
      images.push({
        path: rel,
        sitePath: `assets/brand-images/${outputName}`,
        title: titleFromPath(rel),
      });
    }
  }

  guides.sort((a, b) => Number(b.primary) - Number(a.primary) || a.path.localeCompare(b.path));
  tokens.sort((a, b) => a.path.localeCompare(b.path));
  images.sort((a, b) => a.path.localeCompare(b.path));
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

  const payload = {
    ...brand,
    mainName: mainName(brand),
    mainLanguage: mainLanguage(brand),
    mainLocale: publicLanguageLabel(mainLanguage(brand)),
    profile: brandProfile,
    display,
    intro,
    notes: brandProfile.notes,
    version: versions[0] ?? null,
    historyUrl: `api/history/${brand.slug}.json`,
    history: history.slice(0, 6),
    url: `brand.html?brand=${brand.slug}`,
    apiUrl: `api/brands/${brand.slug}.json`,
    status: guides.length ? "documented" : "placeholder",
    guides,
    tokens,
    images,
    editablePaths: guides.map((g) => g.path),
    source: {
      github: `https://github.com/${adminConfig.owner ?? "fengurt"}/${adminConfig.repo ?? "tableai_designaha"}/tree/${adminConfig.branch ?? "main"}/${brand.folder}`,
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

const indexPayload = brandPayloads.map(({ guides, tokens, images, history, ...brand }) => ({
  ...brand,
  guideCount: guides.length,
  tokenCount: tokens.length,
  imageCount: images.length,
  heroImage: images[0]?.sitePath ?? "",
  primaryGuide: guides.find((g) => g.primary)?.path ?? guides[0]?.path ?? "",
  primaryExcerpt: guides.find((g) => g.primary)?.excerpt ?? guides[0]?.excerpt ?? brand.description,
}));
const searchPayload = brandPayloads.flatMap((brand) => {
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
await writeFile(join(apiDir, "brands.json"), JSON.stringify(indexPayload, null, 2));
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
    resources: "api/brands/{slug}.json",
    tools: ["list_brands", "get_brand", "get_guideline", "list_tokens", "get_token"],
  },
  schema: {
    apiUrl: "api/schema.json",
    allFieldsCallable: true,
    perBrandHistory: "api/history/{slug}.json",
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
    sourceOfTruth: `https://github.com/${adminConfig.owner ?? "fengurt"}/${adminConfig.repo ?? "tableai_designaha"}`,
    githubToWebsite: "GitHub Pages rebuilds site/ on push to main.",
    websiteToGithub: "admin.html commits edits through the GitHub Contents API.",
  },
  locales: {
    default: "CN",
    available: ["CN", "EN"],
    storageKey: "iptrust-locale",
  },
}, null, 2));

await writeFile(join(siteDir, "admin-config.json"), JSON.stringify({
  adminKeySha256: adminConfig.adminKeySha256 ?? "",
  owner: adminConfig.owner ?? "fengurt",
  repo: adminConfig.repo ?? "tableai_designaha",
  branch: adminConfig.branch ?? "main",
}, null, 2));

await writeFile(join(siteDir, "_headers"), [
  "/*",
  "  X-Content-Type-Options: nosniff",
  "  Referrer-Policy: strict-origin-when-cross-origin",
  "  Permissions-Policy: camera=(), microphone=(), geolocation=()",
  "",
  "/*.html",
  "  Cache-Control: public, max-age=0, must-revalidate",
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
  "/assets/brand-images/*",
  "  Cache-Control: public, max-age=86400, stale-while-revalidate=604800",
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
  "",
].join("\n"));

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

await writeFile(join(siteDir, "index.html"), html`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${hubName}</title>
  <meta name="description" content="${hubDescription}">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${siteCssPath}">
</head>
<body class="hub-home">
  <header class="topbar">
    <a class="brand" href="./" data-i18n="hub.name">${hubNameCn}</a>
    <div class="topbar-search" role="search">
      <input id="brandSearch" type="search" autocomplete="off" aria-label="Search IP">
      <div class="global-results" id="globalResults" aria-live="polite"></div>
    </div>
    <nav class="icon-nav" aria-label="Primary actions">
      <button class="nav-icon" type="button" id="apiConnectButton" aria-label="API connect" title="API connect" data-tip="API">${topbarIcon.api}<span class="api-pulse"></span></button>
      <a class="nav-icon" href="#agent-entry" aria-label="我是 Agent" title="我是 Agent" data-tip="Agent">${topbarIcon.agent}</a>
      <a class="nav-icon" href="#partner-entry" aria-label="我是合伙人" title="我是合伙人" data-tip="Partner">${topbarIcon.partner}</a>
      <a class="nav-icon" href="#collab-entry" aria-label="我想合作" title="我想合作" data-tip="Collab">${topbarIcon.collab}</a>
      <button class="lang-toggle nav-icon" type="button" id="langToggle" aria-label="Switch language" title="Switch language" data-tip="Language">${topbarIcon.globe}</button>
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
    <div class="api-connect-form" id="apiConnectForm">
      <label><span data-i18n="api.key">System API Key</span><input id="apiAdminKey" type="password" autocomplete="current-password"></label>
      <button class="portal-action" type="button" id="apiConnectSubmit" data-i18n="api.connect">Connect</button>
    </div>
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
        <button class="api-copy" type="button" data-api-copy="manifest" data-i18n="api.copyCurl">Copy cURL</button>
      </div>
    </div>
  </section>
  <main>
    <section class="hub-hero">
      <div class="hero-copy">
        <h1 data-i18n="hub.name">${hubNameCn}</h1>
        <p data-i18n="home.lead">高楼宾客似曾识，日光底下无新事。</p>
      </div>
      <div class="hero-index" id="heroIndex" aria-live="polite"></div>
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
        <p data-i18n="portal.collabBody">hi@tableai.ai</p>
        <button class="portal-action" type="button" data-portal-action="collab" data-portal-href="mailto:hi@tableai.ai" data-i18n="portal.collabAction">Email</button>
        <p class="portal-status" data-portal-status="collab" aria-live="polite"></p>
      </article>
    </section>
    <section class="section-head">
      <div>
        <h2 data-i18n="home.sectionTitle">IP</h2>
      </div>
      <span id="brandCount" class="count-pill"></span>
    </section>
    <section class="ip-grid" id="brandGrid" aria-live="polite"></section>
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
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${siteCssPath}">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="./" data-i18n="hub.name">${hubNameCn}</a>
    <div class="topbar-search" role="search">
      <input id="brandSearch" type="search" autocomplete="off" aria-label="Search IP">
      <div class="global-results" id="globalResults" aria-live="polite"></div>
    </div>
    <nav>
      <a href="api/brands.json">API</a>
      <a href="admin.html" data-i18n="nav.admin">Admin</a>
      <button class="lang-toggle" type="button" id="langToggle" aria-label="Switch language"><span class="is-active">CN</span><span class="lang-divider">/</span><span>EN</span></button>
    </nav>
  </header>
  <main id="brandPage" class="brand-page" aria-live="polite"></main>
  <script src="${siteJsPath}" type="module"></script>
</body>
</html>`);

await writeFile(join(siteDir, "admin.html"), html`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <base href="../">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin · ${hubName}</title>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${siteCssPath}">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="./" data-i18n="hub.name">${hubNameCn}</a>
    <nav>
      <a href="api/manifest.json" data-i18n="nav.manifest">Manifest</a>
      <a href="https://github.com/${adminConfig.owner ?? "fengurt"}/${adminConfig.repo ?? "tableai_designaha"}">GitHub</a>
      <button class="lang-toggle" type="button" id="langToggle" aria-label="Switch language"><span class="is-active">CN</span><span class="lang-divider">/</span><span>EN</span></button>
    </nav>
  </header>
  <main class="admin">
    <section class="panel" id="unlockPanel">
      <p class="eyebrow" data-i18n="nav.admin">管理</p>
      <h1 data-i18n="admin.unlockTitle">先输入 Key</h1>
      <p class="muted" data-i18n="admin.unlockBody">使用 API Key + Google Authenticator 登录；可按单个或多个 IP 授权。</p>
      <label><span data-i18n="admin.keyLabel">Key</span><input id="adminKey" type="password" autocomplete="current-password"></label>
      <label><span data-i18n="admin.totpLabel">Google Authenticator</span><input id="totpCode" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" maxlength="8" placeholder="000000"></label>
      <label><span data-i18n="admin.scopeLabel">IP 权限范围</span><select id="adminScopes" multiple size="4"></select></label>
      <button id="unlockButton" data-i18n="admin.unlockButton">继续</button>
      <p class="notice" id="unlockStatus"></p>
    </section>
    <section class="panel hidden" id="editorPanel">
      <p class="eyebrow" data-i18n="admin.sync">同步</p>
      <h1 data-i18n="admin.editTitle">编辑源文件</h1>
      <div class="form-grid">
        <label><span data-i18n="admin.githubToken">Token</span><input id="githubToken" type="password" autocomplete="off" placeholder="GitHub token" data-i18n-placeholder="admin.tokenPlaceholder"></label>
        <label><span data-i18n="admin.branch">分支</span><input id="branch" value="${adminConfig.branch ?? "main"}"></label>
        <label><span data-i18n="admin.brand">IP</span><select id="brandSelect"></select></label>
        <label><span data-i18n="admin.file">文件</span><select id="fileSelect"></select></label>
      </div>
      <div class="actions">
        <button id="loadFile" data-i18n="admin.loadFile">载入</button>
        <button id="saveFile" data-i18n="admin.saveFile">保存</button>
      </div>
      <textarea id="editor" spellcheck="false" placeholder="载入文件..." data-i18n-placeholder="admin.editorPlaceholder"></textarea>
      <label><span data-i18n="admin.commitMessage">提交信息</span><input id="commitMessage" value="Update brand guideline from admin site"></label>
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
.hub-home .icon-nav {
  gap: 8px;
  padding: 3px;
  border: 1px solid color-mix(in srgb, var(--ink) 9%, transparent);
  border-radius: 999px;
  background: rgba(255, 254, 250, .64);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .82);
}
.nav-icon {
  width: 36px;
  height: 36px;
  min-height: 36px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: color-mix(in srgb, var(--ink) 70%, var(--muted));
  display: inline-grid;
  place-items: center;
  position: relative;
  transition: background .16s ease, border-color .16s ease, color .16s ease, transform .16s ease;
}
.nav-icon svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.85;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.nav-icon:hover,
.nav-icon:focus-visible {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--paper);
  transform: translateY(-1px);
}
.nav-icon::after {
  content: attr(data-tip);
  position: absolute;
  right: 50%;
  top: calc(100% + 9px);
  transform: translateX(50%);
  padding: 5px 7px;
  border-radius: 6px;
  background: var(--ink);
  color: var(--paper);
  font-size: 11px;
  font-weight: 760;
  line-height: 1;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity .14s ease;
  z-index: 40;
}
.nav-icon:hover::after,
.nav-icon:focus-visible::after { opacity: 1; }
.nav-icon#apiConnectButton {
  color: #0E8C7B;
  background: rgba(14, 140, 123, .08);
  border-color: rgba(14, 140, 123, .18);
}
.nav-icon#apiConnectButton:hover,
.nav-icon#apiConnectButton:focus-visible,
.nav-icon#apiConnectButton.api-connected {
  background: #0E8C7B;
  border-color: #0E8C7B;
  color: white;
}
.api-pulse {
  position: absolute;
  right: 6px;
  top: 6px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #0E8C7B;
  box-shadow: 0 0 0 4px rgba(14, 140, 123, .13);
}
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
  grid-template-columns: minmax(0, 1fr) auto auto;
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
  color: inherit;
  min-width: 0;
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
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hero-index-colors { display: flex; gap: 5px; }
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
.brand-hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(280px, .95fr); gap: clamp(22px, 4vw, 48px); align-items: center; margin-bottom: 36px; }
.brand-hero img { width: 100%; border-radius: 8px; border: 1px solid var(--line); }
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
.panel { padding: 24px; margin-bottom: 18px; }
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
@media (max-width: 760px) {
  .topbar { align-items: flex-start; flex-direction: column; }
  .topbar-search { flex: 1 1 auto; width: 100%; max-width: none; order: 3; }
  nav { width: 100%; justify-content: space-between; gap: 10px; }
  .hub-hero, .brand-hero, .form-grid { grid-template-columns: 1fr; }
  .resource-grid { grid-template-columns: 1fr; }
  .hub-hero { min-height: auto; padding-top: 36px; }
  .hero-index { align-self: stretch; }
  .hero-index-row { grid-template-columns: minmax(0, 1fr) auto; }
  .hero-index-colors { display: none; }
  .entry-portals { grid-template-columns: 1fr; }
  .collab-card { grid-template-columns: 1fr; align-items: start; }
  .history-panel { grid-template-columns: 1fr; }
  .version-item { grid-template-columns: 70px minmax(0, 1fr); }
  .version-item time { display: none; }
  .section-head { display: grid; align-items: start; }
  .ip-grid { grid-template-columns: 1fr; }
  .ip-card { min-height: 320px; }
  h1 { font-size: 40px; }
  h2 { font-size: 28px; }
  .card-body h2 { font-size: 24px; }
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
    "home.searchPlaceholder": "搜索 IP / slug",
    "home.noResults": "没有匹配的 IP。",
    "status.documented": "已建档",
    "status.placeholder": "待建档",
    "meta.guides": "规范",
    "copy.reference": "复制",
    "copy.done": "已复制",
    "copy.selected": "已选中，请按 ⌘C / Ctrl+C 复制",
    "copy.fail": "复制失败",
    "copy.referenceDone": "已复制 IP Agent Reference",
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
    "brand.blank": "未填写",
    "brand.editable": "可编辑源文件",
    "brand.tokens": "Token 文件",
    "brand.noneGuide": "暂无规范文件",
    "brand.noneTokens": "暂无 token 文件",
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
    "api.copyCurl": "Copy cURL",
    "api.copiedCurl": "已复制 cURL 模板。",
    "history.title": "历史版本",
    "history.empty": "暂无版本记录",
    "search.global": "全局搜索",
    "admin.unlockTitle": "先输入 Key",
    "admin.unlockBody": "解锁，再编辑。",
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
    "home.searchPlaceholder": "Search IP / slug",
    "home.noResults": "No matching IP.",
    "status.documented": "Documented",
    "status.placeholder": "Pending",
    "meta.guides": "guides",
    "copy.reference": "Copy",
    "copy.done": "Copied",
    "copy.selected": "Selected. Press Cmd/Ctrl+C to copy.",
    "copy.fail": "Failed",
    "copy.referenceDone": "IP Agent Reference copied",
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
    "brand.blank": "Blank",
    "brand.editable": "Editable source",
    "brand.tokens": "Token files",
    "brand.noneGuide": "No guideline files yet",
    "brand.noneTokens": "No token files yet",
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
    "api.copyCurl": "Copy cURL",
    "api.copiedCurl": "cURL template copied.",
    "history.title": "Version history",
    "history.empty": "No version records yet",
    "search.global": "Global search",
    "admin.unlockTitle": "Key first",
    "admin.unlockBody": "Unlock. Then edit.",
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
  if (toggle.classList.contains("nav-icon")) {
    toggle.dataset.tip = localeMeta[currentLocale].label;
    return;
  }
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
  const url = new URL(path, location.href);
  url.searchParams.set("v", BUILD_VERSION);
  const res = await fetch(url);
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
  return {
    name,
    secondaryName: alternate.name,
    secondaryLanguage: alternate.language,
    intro: brand.intro?.[lang] || fallback.intro || brand.description || "",
    business: brand.profile?.business?.[lang] || brand.business?.[lang] || "",
    notes: brand.profile?.notes?.[lang] || brand.notes?.[lang] || "",
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
  const skillUrl = new URL("skills/iptrust-live-update/SKILL.md", location.href).href;
  return [
    "IPTrust Skill ✦",
    "Hub: " + location.origin + location.pathname,
    "Manifest: " + new URL("api/manifest.json", location.href).href,
    "Search API: " + new URL("api/search.json", location.href).href,
    \`Skill: \${skillUrl}\`,
    "",
    skill || "Use the IPTrust manifest and brand APIs to read each IP's latest name, colors, intro, business, language, and guideline files.",
  ].join("\\n");
}

async function portalSkillText() {
  const skillUrl = new URL("skills/iptrust-live-update/SKILL.md", location.href);
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
  const skillUrl = new URL("skills/iptrust-live-update/SKILL.md", location.href).href;
  const mcpSource = new URL("api/manifest.json", location.href).href;
  const colors = palette(brand.theme)
    .map(([label, value]) => \`\${label}: \${value} / \${rgbValue(value)}\`)
    .join("\\n");
  return [
    "IPTrust Agent Reference",
    "",
    "[IP Identity]",
    \`Name: \${localized.name}\`,
    localized.secondaryName ? \`Other name: \${localized.secondaryName}\` : "",
    \`Slug: \${brand.slug}\`,
    \`Main language: \${languageLabel(brand.mainLanguage || localized.language)}\`,
    "",
    "[Links]",
    \`IP page: \${ipPageUrl}\`,
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
    \`get_brand({ "slug": "\${brand.slug}" })\`,
    \`get_guideline({ "slug": "\${brand.slug}" })\`,
    \`list_tokens({ "slug": "\${brand.slug}" })\`,
    \`validate_color({ "slug": "\${brand.slug}", "hex": "\${brand.theme?.primary || "#000000"}" })\`,
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
    \`curl -X POST "\${new URL("api/admin/login", location.href).href}"\`,
    \`  -H "Content-Type: application/json"\`,
    \`  -H "X-Admin-Key: <ADMIN_API_KEY>"\`,
    \`  -d '{"adminKey":"<ADMIN_API_KEY>"}'\`,
  ].join("\\n");
}

const API_CONNECT_COOKIE = "iptrust_api_connected";

function setApiCookie(scopes = ["*"]) {
  const value = JSON.stringify({ connected: true, scopes, at: Date.now() });
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = API_CONNECT_COOKIE + "=" + encodeURIComponent(value) + "; path=/; max-age=604800; SameSite=Lax" + secure;
}

function clearApiCookie() {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = API_CONNECT_COOKIE + "=; path=/; max-age=0; SameSite=Lax" + secure;
}

function readApiCookie() {
  const entry = document.cookie
    .split("; ")
    .find((item) => item.startsWith(API_CONNECT_COOKIE + "="));
  if (!entry) return null;
  try {
    return JSON.parse(decodeURIComponent(entry.slice(API_CONNECT_COOKIE.length + 1)));
  } catch {
    return null;
  }
}

function renderApiConnected(scopes = ["*"]) {
  $("#apiConnectButton")?.classList.add("api-connected");
  $("#apiConnectPanel")?.classList.add("is-connected");
  $("#apiConnectForm")?.classList.add("hidden");
  $("#apiConnectedOps")?.classList.remove("hidden");
  const scopeText = $("#apiScopeText");
  if (scopeText) {
    scopeText.textContent = scopes.includes("*") ? t("api.allAccess") : \`\${t("api.scopesGranted")}\${scopes.join(", ")}\`;
  }
  apiStatus(t("api.connected"));
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

  const saved = readApiCookie();
  if (saved?.connected) renderApiConnected(saved.scopes?.length ? saved.scopes : ["*"]);

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

  submit?.addEventListener("click", async () => {
    const adminKey = $("#apiAdminKey")?.value || "";
    apiStatus(t("api.connecting"));
    try {
      const res = await fetch("api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ adminKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiErrorMessage(data.error));
      const scopes = data.scopes?.length ? data.scopes : data.allowedScopes || ["*"];
      setApiCookie(scopes);
      renderApiConnected(scopes);
      showToast(t("api.connected"));
    } catch (error) {
      clearApiCookie();
      button.classList.remove("api-connected");
      panel.classList.remove("is-connected");
      form?.classList.remove("hidden");
      ops?.classList.add("hidden");
      apiStatus(error.message || t("api.failed"), true);
      showToast(error.message || t("api.failed"));
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

function normalizeSearchText(value = "") {
  return String(value).toLowerCase();
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
      <small>\${escapeHtml(item.type)} · \${escapeHtml(item.slug)}</small>
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
          <span class="hero-index-title">\${escapeHtml(localized.name)}\${localized.secondaryName ? \` · \${escapeHtml(localized.secondaryName)}\` : ""}</span>
        </a>
        \${colorDots(brand.theme)}
        <button class="icon-copy" type="button" data-icon-only="true" data-copy-brand="\${escapeHtml(brand.slug)}" aria-label="\${escapeHtml(t("copy.reference"))} \${escapeHtml(localized.name)}">\${copyIcon()}</button>
      </div>
    \`;
  }).join("");
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
            <span class="art-code">\${escapeHtml(brand.slug)}</span>
            <span class="art-metric">\${brand.guideCount}G · \${brand.tokenCount}T</span>
          </div>
          <p class="eyebrow">\${escapeHtml(statusLabel(brand.status))}</p>
          <h2>\${escapeHtml(localized.name)}</h2>
          \${miniPalette(brand.theme)}
          <p class="muted alt-name">\${escapeHtml(localized.secondaryName || "")}</p>
          <p class="card-intro">\${escapeHtml(localized.intro || "")}</p>
          <div class="card-profile">
            <span>\${escapeHtml(t("brand.mainLanguage"))}: \${escapeHtml(languageLabel(brand.mainLanguage || localized.language))}</span>
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
  const hero = brand.images?.[0]?.sitePath;
  page.innerHTML = \`
    <div class="brand-shell \${themeClass(brand.theme)}" style="\${themeStyle(brand.theme)}">
      <section class="brand-hero">
        <div>
          <p class="eyebrow">\${escapeHtml(statusLabel(brand.status))}</p>
          <h1>\${escapeHtml(display.name)}</h1>
          <p class="muted alt-name">\${escapeHtml(display.secondaryName || "")}</p>
          <p>\${escapeHtml(localized.intro)}</p>
          \${swatches(brand.theme, true)}
          <div class="actions">
            <a class="button" href="\${brand.apiUrl}">\${t("brand.openJson")}</a>
            <a class="button ghost" href="\${brand.source.github}">\${t("brand.source")}</a>
          </div>
        </div>
        \${hero ? \`<img src="\${hero}" alt="">\` : ""}
      </section>
      <section class="resource-list">
        <div class="resource-grid">
          <div class="resource"><strong>\${t("brand.website")}</strong><br>\${brand.officialWebsite ? \`<a href="\${escapeHtml(brand.officialWebsite)}">\${escapeHtml(brand.officialWebsite)}</a>\` : escapeHtml(t("brand.blank"))}</div>
          <div class="resource"><strong>\${t("brand.mainLanguage")}</strong><br>\${escapeHtml(languageLabel(brand.mainLanguage || brand.profile?.mainLanguage) || t("brand.blank"))}</div>
          <div class="resource"><strong>\${t("brand.intro")}</strong><br>\${escapeHtml(localized.intro || t("brand.blank"))}</div>
          <div class="resource"><strong>\${t("brand.business")}</strong><br>\${escapeHtml(localized.business || t("brand.blank"))}</div>
          <div class="resource"><strong>\${t("brand.notes")}</strong><br>\${escapeHtml(localized.notes || t("brand.blank"))}</div>
        </div>
        <div class="resource"><strong>\${t("brand.colors")}</strong><br>\${escapeHtml(brand.theme?.keywords?.join(" · ") || "")}</div>
        <div class="resource"><strong>\${t("brand.editable")}</strong><br>\${brand.editablePaths?.map(escapeHtml).join("<br>") || t("brand.noneGuide")}</div>
        <div class="resource"><strong>\${t("brand.tokens")}</strong><br>\${brand.tokens?.map((token) => escapeHtml(token.path)).join("<br>") || t("brand.noneTokens")}</div>
      </section>
      \${brand.guides?.map((guide) => \`
        <article class="guide">
          <p class="eyebrow">\${escapeHtml(guide.format)} · \${escapeHtml(guide.path)}</p>
          <h2>\${escapeHtml(guide.title)}</h2>
          <pre>\${escapeHtml(guide.text)}</pre>
        </article>
      \`).join("") || ""}
    </div>
  \`;
}

applyI18n();
setupLanguageToggle();
setupSearch();
setupPortalActions();
setupApiConnect();
renderHeroIndex().catch(console.error);
renderIndex().catch(console.error);
renderBrand().catch(console.error);`);
await copyFile(join(assetsDir, "site.js"), join(siteDir, siteJsPath));

await writeFile(join(assetsDir, "admin.js"), html`const $ = (selector) => document.querySelector(selector);
const state = { config: null, brands: [], authScopes: [], currentFile: null, currentSha: null };
const adminCopy = {
  cn: {
    needToken: "先填 Token。",
    loaded: "已载入",
    saved: "已保存。等待部署。",
    noKey: "缺少 Key 配置。",
    badKey: "Key 不对。",
    totpRequired: "请填写 Google Authenticator 动态码。",
    apiLoginFailed: "API 登录失败。",
    apiNotConfigured: "后台 API 尚未配置 Cloudflare secrets。",
    unlocked: "已解锁。Token next.",
  },
  en: {
    needToken: "Token first.",
    loaded: "Loaded",
    saved: "Saved. Deploying.",
    noKey: "No key set.",
    badKey: "Wrong key.",
    totpRequired: "Enter the Google Authenticator code.",
    apiLoginFailed: "API login failed.",
    apiNotConfigured: "Admin API is not configured with Cloudflare secrets yet.",
    unlocked: "Unlocked. Token next.",
  },
};

function lang() {
  return document.documentElement.dataset.locale === "en" ? "en" : "cn";
}

function copy(key) {
  return adminCopy[lang()]?.[key] || adminCopy.cn[key] || key;
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(\`Could not load \${path}\`);
  return res.json();
}

function status(message, isError = false) {
  const node = $("#editorStatus") || $("#unlockStatus");
  node.textContent = message;
  node.style.color = isError ? "#b12137" : "#0e8c7b";
}

function b64DecodeUnicode(value) {
  const binary = atob(value.replace(/\\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function b64EncodeUnicode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary);
}

function githubHeaders() {
  const token = $("#githubToken").value.trim();
  if (!token) throw new Error(copy("needToken"));
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": \`Bearer \${token}\`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function contentsUrl(path, branch) {
  const { owner, repo } = state.config;
  return \`https://api.github.com/repos/\${owner}/\${repo}/contents/\${encodeURIComponent(path).replaceAll("%2F", "/")}?ref=\${encodeURIComponent(branch)}\`;
}

async function populateBrands() {
  state.brands = await loadJson("api/brands.json");
  const scopes = state.authScopes.length ? state.authScopes : ["*"];
  const brands = scopes.includes("*")
    ? state.brands
    : state.brands.filter((brand) => scopes.includes(brand.slug));
  $("#brandSelect").innerHTML = brands.map((brand) => \`<option value="\${brand.slug}">\${brand.mainName || brand.name}</option>\`).join("");
  await populateFiles();
}

async function populateAdminScopes() {
  const select = $("#adminScopes");
  if (!select) return;
  const brands = await loadJson("api/brands.json");
  select.innerHTML = [
    \`<option value="*">*</option>\`,
    ...brands.map((brand) => \`<option value="\${brand.slug}">\${brand.mainName || brand.name}</option>\`),
  ].join("");
  select.querySelector('option[value="*"]').selected = true;
}

function selectedAdminScopes() {
  const select = $("#adminScopes");
  if (!select) return ["*"];
  const values = [...select.selectedOptions].map((option) => option.value);
  return values.length ? values : ["*"];
}

async function populateFiles() {
  const slug = $("#brandSelect").value;
  const brand = await loadJson(\`api/brands/\${slug}.json\`);
  const paths = brand.editablePaths?.length ? brand.editablePaths : [brand.primaryGuide].filter(Boolean);
  $("#fileSelect").innerHTML = paths.map((path) => \`<option value="\${path}">\${path}</option>\`).join("");
  state.currentFile = null;
  state.currentSha = null;
  $("#editor").value = "";
}

async function loadFile() {
  const path = $("#fileSelect").value;
  const branch = $("#branch").value.trim() || state.config.branch;
  const res = await fetch(contentsUrl(path, branch), { headers: githubHeaders() });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  state.currentFile = path;
  state.currentSha = data.sha;
  $("#editor").value = b64DecodeUnicode(data.content);
  status(\`\${copy("loaded")} \${path}\`);
}

async function saveFile() {
  if (!state.currentFile || !state.currentSha) await loadFile();
  const branch = $("#branch").value.trim() || state.config.branch;
  const body = {
    message: $("#commitMessage").value.trim() || \`Update \${state.currentFile} from admin site\`,
    content: b64EncodeUnicode($("#editor").value),
    sha: state.currentSha,
    branch,
  };
  const res = await fetch(contentsUrl(state.currentFile, branch), {
    method: "PUT",
    headers: githubHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  state.currentSha = data.content.sha;
  status(copy("saved"));
}

async function apiUnlock(config) {
  const key = $("#adminKey").value;
  const totp = $("#totpCode")?.value.trim();
  if (!totp) throw new Error(copy("totpRequired"));
  const res = await fetch("api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": key,
    },
    body: JSON.stringify({
      adminKey: key,
      totp,
      scopes: selectedAdminScopes(),
      repo: config.repo,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === "admin_auth_not_configured") throw new Error(copy("apiNotConfigured"));
    if (data.error === "bad_api_key") throw new Error(copy("badKey"));
    if (data.error === "bad_totp") throw new Error(copy("totpRequired"));
    throw new Error(data.error || copy("apiLoginFailed"));
  }
  state.authScopes = data.scopes?.length ? data.scopes : data.allowedScopes || ["*"];
}

async function unlock() {
  state.config = await loadJson("admin-config.json");
  const totp = $("#totpCode")?.value.trim();
  if (totp) {
    await apiUnlock(state.config);
    $("#unlockPanel").classList.add("hidden");
    $("#editorPanel").classList.remove("hidden");
    await populateBrands();
    status(copy("unlocked"));
    return;
  }
  const expected = state.config.adminKeySha256;
  if (!expected) {
    $("#unlockStatus").textContent = copy("noKey");
    return;
  }
  const actual = await sha256($("#adminKey").value);
  if (actual !== expected) {
    $("#unlockStatus").textContent = copy("badKey");
    $("#unlockStatus").style.color = "#b12137";
    return;
  }
  $("#unlockPanel").classList.add("hidden");
  $("#editorPanel").classList.remove("hidden");
  await populateBrands();
  status(copy("unlocked"));
}

populateAdminScopes().catch(console.error);

$("#unlockButton")?.addEventListener("click", () => unlock().catch((err) => {
  $("#unlockStatus").textContent = err.message;
  $("#unlockStatus").style.color = "#b12137";
}));
$("#brandSelect")?.addEventListener("change", () => populateFiles().catch((err) => status(err.message, true)));
$("#loadFile")?.addEventListener("click", () => loadFile().catch((err) => status(err.message, true)));
$("#saveFile")?.addEventListener("click", () => saveFile().catch((err) => status(err.message, true)));`);

console.log(`Built site with ${brandPayloads.length} brands at ${relative(root, siteDir)}`);
