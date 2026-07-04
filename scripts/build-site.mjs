import { mkdir, readFile, rm, writeFile, copyFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const siteDir = join(root, "site");
const apiDir = join(siteDir, "api");
const brandApiDir = join(apiDir, "brands");
const assetsDir = join(siteDir, "assets");
const imageDir = join(assetsDir, "brand-images");

const brands = JSON.parse(await readFile(join(root, "config/brands.json"), "utf8"));
const adminConfig = existsSync(join(root, "config/site-admin.public.json"))
  ? JSON.parse(await readFile(join(root, "config/site-admin.public.json"), "utf8"))
  : {};
const hubName = "岁知社 IPTrust";
const hubDescription = "岁知社 IPTrust 是一个面向人和 Agent 的 IP 品牌信任中枢。";

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
  return hasCjk(brand.name) ? "zh" : "en";
}

function mainName(brand) {
  return brand.name;
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

await rm(siteDir, { recursive: true, force: true });
await mkdir(brandApiDir, { recursive: true });
await mkdir(imageDir, { recursive: true });
await mkdir(join(siteDir, "skills", "iptrust-live-update"), { recursive: true });
if (existsSync(join(root, "skills/iptrust-live-update/SKILL.md"))) {
  await copyFile(join(root, "skills/iptrust-live-update/SKILL.md"), join(siteDir, "skills/iptrust-live-update/SKILL.md"));
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

  const display = {
    default: { language: mainLanguage(brand), name: mainName(brand) },
    zh: { name: zhName(brand), secondaryName: secondaryName(zhName(brand), enName(brand)) },
    en: { name: enName(brand), secondaryName: secondaryName(enName(brand), zhName(brand)) },
  };
  const intro = {
    zh: liveIntro(brand, guides, "zh"),
    en: liveIntro(brand, guides, "en"),
  };

  const payload = {
    ...brand,
    mainName: mainName(brand),
    mainLanguage: mainLanguage(brand),
    display,
    intro,
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
  await writeFile(join(brandApiDir, `${brand.slug}.json`), JSON.stringify(payload, null, 2));
}

const indexPayload = brandPayloads.map(({ guides, tokens, images, ...brand }) => ({
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
    text: [brand.intro?.zh, brand.intro?.en, brand.description, brand.theme?.keywords?.join(" ")].filter(Boolean).join(" "),
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
const versions = loadVersions();

await writeFile(join(apiDir, "brands.json"), JSON.stringify(indexPayload, null, 2));
await writeFile(join(apiDir, "search.json"), JSON.stringify(searchPayload, null, 2));
await writeFile(join(apiDir, "versions.json"), JSON.stringify(versions, null, 2));
await writeFile(join(apiDir, "manifest.json"), JSON.stringify({
  name: hubName,
  description: hubDescription,
  generatedAt: new Date().toISOString(),
  version: versions[0] ?? null,
  brands: indexPayload.map((brand) => ({
    slug: brand.slug,
    name: brand.name,
    apiUrl: `api/brands/${brand.slug}.json`,
    guideUrl: `brand.html?brand=${brand.slug}`,
  })),
  mcp: {
    local: "mcp/src/index.ts",
    resources: "api/brands/{slug}.json",
    tools: ["list_brands", "get_brand", "get_guideline", "list_tokens", "get_token"],
  },
  skills: [{
    name: "iptrust-live-update",
    path: "skills/iptrust-live-update/SKILL.md",
    description: "Agent workflow for refreshing IP introductions from the latest brand source files.",
  }],
  history: {
    apiUrl: "api/versions.json",
    latest: versions[0] ?? null,
  },
  sync: {
    sourceOfTruth: `https://github.com/${adminConfig.owner ?? "fengurt"}/${adminConfig.repo ?? "tableai_designaha"}`,
    githubToWebsite: "GitHub Pages rebuilds site/ on push to main.",
    websiteToGithub: "admin.html commits edits through the GitHub Contents API.",
  },
}, null, 2));

await writeFile(join(siteDir, "admin-config.json"), JSON.stringify({
  adminKeySha256: adminConfig.adminKeySha256 ?? "",
  owner: adminConfig.owner ?? "fengurt",
  repo: adminConfig.repo ?? "tableai_designaha",
  branch: adminConfig.branch ?? "main",
}, null, 2));

await writeFile(join(siteDir, "llms.txt"), [
  `# ${hubName}`,
  "",
  hubDescription,
  "English: A fast, minimal IP trust hub for brand guidelines, design systems, assets, and agent-readable source files.",
  "",
  "Machine-readable entry points:",
  "- /api/manifest.json",
  "- /api/brands.json",
  "- /api/brands/{slug}.json",
  "- /api/search.json",
  "- /api/versions.json",
  "- /skills/iptrust-live-update/SKILL.md",
  "",
  "Brands:",
  ...indexPayload.map((brand) => `- ${brand.name} (${brand.slug}): /api/brands/${brand.slug}.json · palette ${brand.theme?.primary ?? "n/a"} / ${brand.theme?.accent ?? "n/a"}`),
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

await writeFile(join(siteDir, "index.html"), html`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${hubName}</title>
  <meta name="description" content="${hubDescription}">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/site.css">
</head>
<body class="hub-home">
  <header class="topbar">
    <a class="brand" href="./">${hubName}</a>
    <nav>
      <a href="#agent-entry" data-i18n="nav.agent">我是 Agent</a>
      <a href="#partner-entry" data-i18n="nav.partner">我是合伙人</a>
      <a href="#collab-entry" data-i18n="nav.collab">我想合作</a>
      <button class="lang-toggle" type="button" id="langToggle" aria-label="Switch language">EN</button>
    </nav>
  </header>
  <main>
    <section class="hub-hero">
      <div class="hero-copy">
        <p class="eyebrow" data-i18n="home.eyebrow">IP 信任索引 · Agent 可读品牌源</p>
        <h1>岁知社 IPTrust</h1>
        <p data-i18n="home.lead">高楼宾客似曾识，日光底下无新事。</p>
        <div class="actions">
          <a class="button" href="#agent-entry" data-i18n="nav.agent">我是 Agent</a>
          <a class="button ghost" href="#collab-entry" data-i18n="nav.collab">我想合作</a>
        </div>
      </div>
      <div class="hero-index" id="heroIndex" aria-live="polite"></div>
    </section>
    <section class="entry-portals" aria-label="IPTrust entries">
      <article class="portal" id="agent-entry">
        <p class="eyebrow">Agent</p>
        <h3 data-i18n="portal.agentTitle">我是 Agent</h3>
        <p data-i18n="portal.agentBody">读取最新 IP 规范、API、llms 与 skill。</p>
        <div class="portal-links">
          <a href="api/brands.json">JSON</a>
          <a href="llms.txt">llms.txt</a>
          <a href="skills/iptrust-live-update/SKILL.md">Skill</a>
          <a href="api/manifest.json">Manifest</a>
          <a href="api/search.json" data-i18n="portal.searchApi">搜索 API</a>
          <a href="#version-history" data-i18n="history.title">历史版本</a>
        </div>
      </article>
      <article class="portal" id="partner-entry">
        <p class="eyebrow">Partner</p>
        <h3 data-i18n="portal.partnerTitle">我是合伙人</h3>
        <p data-i18n="portal.partnerBody">查看 IP 组合、品牌资产与协作入口。</p>
        <div class="portal-links">
          <a href="#brandGrid" data-i18n="portal.openIps">查看 IP</a>
          <a href="admin.html" data-i18n="portal.admin">管理入口</a>
        </div>
      </article>
      <article class="portal" id="collab-entry">
        <p class="eyebrow">Collab</p>
        <h3 data-i18n="portal.collabTitle">我想合作</h3>
        <p data-i18n="portal.collabBody">提交新 IP、共创品牌系统或接入 Agent 工作流。</p>
        <div class="portal-links">
          <a href="https://github.com/${adminConfig.owner ?? "fengurt"}/${adminConfig.repo ?? "tableai_designaha"}/issues/new" data-i18n="portal.github">发起合作</a>
          <a href="#brandGrid" data-i18n="portal.explore">先看 IP</a>
        </div>
      </article>
    </section>
    <section class="history-panel" id="version-history">
      <div>
        <p class="eyebrow">History</p>
        <h2 data-i18n="history.title">历史版本</h2>
      </div>
      <div class="version-list" id="versionList" aria-live="polite"></div>
    </section>
    <section class="section-head">
      <div>
        <p class="eyebrow" data-i18n="home.systems">IP 系统</p>
        <h2 data-i18n="home.sectionTitle">直接进入 IP。</h2>
      </div>
      <div class="home-tools">
        <input id="brandSearch" type="search" autocomplete="off" aria-label="Search IP">
        <span id="brandCount" class="count-pill"></span>
        <div class="global-results" id="globalResults" aria-live="polite"></div>
      </div>
    </section>
    <section class="ip-grid" id="brandGrid" aria-live="polite"></section>
  </main>
  <script src="assets/site.js" type="module"></script>
</body>
</html>`);

await writeFile(join(siteDir, "brand.html"), html`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Brand Guidelines</title>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/site.css">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="./">${hubName}</a>
    <nav>
      <a href="api/brands.json">API</a>
      <a href="admin.html" data-i18n="nav.admin">Admin</a>
      <button class="lang-toggle" type="button" id="langToggle" aria-label="Switch language">EN</button>
    </nav>
  </header>
  <main id="brandPage" class="brand-page" aria-live="polite"></main>
  <script src="assets/site.js" type="module"></script>
</body>
</html>`);

await writeFile(join(siteDir, "admin.html"), html`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin · ${hubName}</title>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/site.css">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="./">${hubName}</a>
    <nav>
      <a href="api/manifest.json" data-i18n="nav.manifest">Manifest</a>
      <a href="https://github.com/${adminConfig.owner ?? "fengurt"}/${adminConfig.repo ?? "tableai_designaha"}">GitHub</a>
      <button class="lang-toggle" type="button" id="langToggle" aria-label="Switch language">EN</button>
    </nav>
  </header>
  <main class="admin">
    <section class="panel" id="unlockPanel">
      <p class="eyebrow" data-i18n="nav.admin">管理</p>
      <h1 data-i18n="admin.unlockTitle">解锁编辑器</h1>
      <p class="muted" data-i18n="admin.unlockBody">Admin key 用于解锁浏览器编辑器；保存仍需 GitHub 写入令牌，确保修改回到仓库。</p>
      <label><span data-i18n="admin.keyLabel">Admin API key</span><input id="adminKey" type="password" autocomplete="current-password"></label>
      <button id="unlockButton" data-i18n="admin.unlockButton">解锁</button>
      <p class="notice" id="unlockStatus"></p>
    </section>
    <section class="panel hidden" id="editorPanel">
      <p class="eyebrow" data-i18n="admin.sync">双向同步</p>
      <h1 data-i18n="admin.editTitle">编辑 GitHub 源文件</h1>
      <div class="form-grid">
        <label><span data-i18n="admin.githubToken">GitHub token</span><input id="githubToken" type="password" autocomplete="off" placeholder="Fine-grained PAT or classic token"></label>
        <label><span data-i18n="admin.branch">分支</span><input id="branch" value="${adminConfig.branch ?? "main"}"></label>
        <label><span data-i18n="admin.brand">IP</span><select id="brandSelect"></select></label>
        <label><span data-i18n="admin.file">文件</span><select id="fileSelect"></select></label>
      </div>
      <div class="actions">
        <button id="loadFile" data-i18n="admin.loadFile">载入文件</button>
        <button id="saveFile" data-i18n="admin.saveFile">提交修改</button>
      </div>
      <textarea id="editor" spellcheck="false" placeholder="Load an editable guideline file..."></textarea>
      <label><span data-i18n="admin.commitMessage">提交信息</span><input id="commitMessage" value="Update brand guideline from admin site"></label>
      <p class="notice" id="editorStatus"></p>
    </section>
  </main>
  <script src="assets/site.js" type="module"></script>
  <script src="assets/admin.js" type="module"></script>
</body>
</html>`);

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
nav { display: flex; gap: 18px; color: var(--muted); font-size: 14px; }
nav a { text-decoration: none; }
nav a:hover { color: var(--ink); }
.lang-toggle {
  min-height: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-weight: 750;
}
main { width: min(1180px, calc(100vw - 36px)); margin: 0 auto; }
.hub-hero {
  min-height: 62vh;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, .72fr);
  gap: 42px;
  align-items: center;
  padding: clamp(48px, 8vw, 96px) 0 36px;
}
.hero-copy { max-width: 760px; }
.eyebrow { color: var(--accent); font-size: 12px; font-weight: 760; text-transform: uppercase; letter-spacing: .18em; }
h1 { font-size: 76px; line-height: .96; margin: 12px 0 18px; letter-spacing: 0; max-width: 980px; }
h2 { font-size: 36px; line-height: 1.08; margin: 0 0 12px; letter-spacing: 0; }
h3 { margin: 0 0 8px; }
p { line-height: 1.65; }
.hub-hero p:not(.eyebrow), .muted { color: var(--muted); font-size: 18px; max-width: 760px; }
.hero-index {
  display: grid;
  gap: 0;
  align-self: end;
  border-top: 1px solid var(--line);
}
.hero-index-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--line);
  color: var(--brand-primary);
  padding: 8px 0;
  font-size: 14px;
  font-weight: 760;
  text-decoration: none;
  transform: translateY(8px);
  opacity: 0;
  animation: row-rise .54s cubic-bezier(.2,.8,.2,1) forwards;
  animation-delay: calc(var(--row-index, 0) * 32ms);
}
.hero-index-link {
  color: inherit;
  min-width: 0;
  text-decoration: none;
}
.hero-index-row:hover {
  background: color-mix(in srgb, var(--brand-primary) 7%, transparent);
  padding-left: 8px;
  padding-right: 8px;
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
@keyframes row-rise {
  to { opacity: 1; transform: translateY(0); }
}
.section-head {
  display: flex;
  justify-content: space-between;
  gap: 28px;
  align-items: end;
  padding: 18px 0 22px;
  border-top: 1px solid var(--line);
}
.entry-portals {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 0 0 42px;
}
.portal {
  border-top: 1px solid var(--line);
  padding: 18px 0 0;
}
.portal h3 {
  font-size: 24px;
  line-height: 1.1;
  margin: 10px 0 8px;
}
.portal p:not(.eyebrow) {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.55;
  margin: 0;
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
.home-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: min(360px, 100%);
  position: relative;
}
.home-tools input {
  min-height: 42px;
  border-radius: 999px;
  background: rgba(255, 254, 250, .78);
}
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
  .hub-hero, .brand-hero, .form-grid { grid-template-columns: 1fr; }
  .hub-hero { min-height: auto; padding-top: 36px; }
  .hero-index { align-self: stretch; }
  .hero-index-row { grid-template-columns: minmax(0, 1fr) auto; }
  .hero-index-colors { display: none; }
  .entry-portals { grid-template-columns: 1fr; }
  .history-panel { grid-template-columns: 1fr; }
  .version-item { grid-template-columns: 70px minmax(0, 1fr); }
  .version-item time { display: none; }
  .section-head { display: grid; align-items: start; }
  .home-tools { width: 100%; }
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

await writeFile(join(assetsDir, "site.js"), html`const $ = (selector) => document.querySelector(selector);

const i18n = {
  zh: {
    "nav.manifest": "清单",
    "nav.admin": "管理",
    "nav.agent": "我是 Agent",
    "nav.partner": "我是合伙人",
    "nav.collab": "我想合作",
    "home.eyebrow": "IP 信任索引 · Agent 可读品牌源",
    "home.lead": "高楼宾客似曾识，日光底下无新事。",
    "home.openJson": "打开 JSON 索引",
    "home.adminEdit": "管理编辑",
    "home.systems": "IP 系统",
    "home.sectionTitle": "直接进入 IP。",
    "home.searchPlaceholder": "搜索 IP / slug",
    "home.noResults": "没有匹配的 IP。",
    "status.documented": "已建档",
    "status.placeholder": "待建档",
    "meta.guides": "规范",
    "copy.reference": "复制",
    "copy.done": "已复制",
    "copy.selected": "已选中",
    "copy.fail": "复制失败",
    "brand.openJson": "打开 JSON",
    "brand.source": "源文件",
    "brand.colors": "品牌颜色",
    "brand.editable": "可编辑源文件",
    "brand.tokens": "Token 文件",
    "brand.noneGuide": "暂无规范文件",
    "brand.noneTokens": "暂无 token 文件",
    "portal.agentTitle": "我是 Agent",
    "portal.agentBody": "读取最新 IP 规范、API、llms 与 skill。",
    "portal.partnerTitle": "我是合伙人",
    "portal.partnerBody": "查看 IP 组合、品牌资产与协作入口。",
    "portal.collabTitle": "我想合作",
    "portal.collabBody": "提交新 IP、共创品牌系统或接入 Agent 工作流。",
    "portal.openIps": "查看 IP",
    "portal.admin": "管理入口",
    "portal.github": "发起合作",
    "portal.explore": "先看 IP",
    "portal.searchApi": "搜索 API",
    "history.title": "历史版本",
    "history.empty": "暂无版本记录",
    "search.global": "全局搜索",
    "admin.unlockTitle": "解锁编辑器",
    "admin.unlockBody": "Admin key 用于解锁浏览器编辑器；保存仍需 GitHub 写入令牌，确保修改回到仓库。",
    "admin.keyLabel": "Admin API key",
    "admin.unlockButton": "解锁",
    "admin.sync": "双向同步",
    "admin.editTitle": "编辑 GitHub 源文件",
    "admin.githubToken": "GitHub token",
    "admin.branch": "分支",
    "admin.brand": "IP",
    "admin.file": "文件",
    "admin.loadFile": "载入文件",
    "admin.saveFile": "提交修改",
    "admin.commitMessage": "提交信息"
  },
  en: {
    "nav.manifest": "Manifest",
    "nav.admin": "Admin",
    "nav.agent": "I am an Agent",
    "nav.partner": "I am a Partner",
    "nav.collab": "Work with Us",
    "home.eyebrow": "IP trust index · Agent-readable brand source",
    "home.lead": "Old guests in high halls; nothing new under the sun.",
    "home.openJson": "Open JSON index",
    "home.adminEdit": "Admin edit",
    "home.systems": "IP systems",
    "home.sectionTitle": "Enter the IP directly.",
    "home.searchPlaceholder": "Search IP / slug",
    "home.noResults": "No matching IP.",
    "status.documented": "Documented",
    "status.placeholder": "Pending",
    "meta.guides": "guides",
    "copy.reference": "Copy",
    "copy.done": "Copied",
    "copy.selected": "Selected",
    "copy.fail": "Failed",
    "brand.openJson": "Open JSON",
    "brand.source": "Source",
    "brand.colors": "Brand colors",
    "brand.editable": "Editable source",
    "brand.tokens": "Token files",
    "brand.noneGuide": "No guideline files yet",
    "brand.noneTokens": "No token files yet",
    "portal.agentTitle": "I am an Agent",
    "portal.agentBody": "Read the latest IP guidelines, APIs, llms, and skill.",
    "portal.partnerTitle": "I am a Partner",
    "portal.partnerBody": "Explore IP portfolios, brand assets, and collaboration paths.",
    "portal.collabTitle": "Work with Us",
    "portal.collabBody": "Submit a new IP, co-create a brand system, or connect an Agent workflow.",
    "portal.openIps": "View IPs",
    "portal.admin": "Admin entry",
    "portal.github": "Start on GitHub",
    "portal.explore": "Explore first",
    "portal.searchApi": "Search API",
    "history.title": "Version history",
    "history.empty": "No version records yet",
    "search.global": "Global search",
    "admin.unlockTitle": "Unlock editor",
    "admin.unlockBody": "The admin key unlocks this browser editor. Saving still requires a GitHub token with contents write access.",
    "admin.keyLabel": "Admin API key",
    "admin.unlockButton": "Unlock",
    "admin.sync": "Two-way sync",
    "admin.editTitle": "Edit GitHub source",
    "admin.githubToken": "GitHub token",
    "admin.branch": "Branch",
    "admin.brand": "IP",
    "admin.file": "File",
    "admin.loadFile": "Load file",
    "admin.saveFile": "Commit edit",
    "admin.commitMessage": "Commit message"
  }
};

let currentLang = localStorage.getItem("iptrust-lang") || "zh";
let cachedBrands = null;
let cachedSearch = null;
let cachedVersions = null;
let currentQuery = "";

function t(key) {
  return i18n[currentLang]?.[key] || i18n.zh[key] || key;
}

function applyI18n() {
  document.documentElement.lang = currentLang === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  const toggle = $("#langToggle");
  if (toggle) toggle.textContent = currentLang === "zh" ? "EN" : "中";
  const search = $("#brandSearch");
  if (search) search.placeholder = t("home.searchPlaceholder");
}

function setupLanguageToggle() {
  const toggle = $("#langToggle");
  if (!toggle) return;
  toggle.addEventListener("click", async () => {
    currentLang = currentLang === "zh" ? "en" : "zh";
    localStorage.setItem("iptrust-lang", currentLang);
    applyI18n();
    await renderHeroIndex();
    await renderIndex();
    await renderBrand();
    await renderVersions();
  });
}

function setupSearch() {
  const search = $("#brandSearch");
  if (!search || search.dataset.ready) return;
  search.dataset.ready = "true";
  search.placeholder = t("home.searchPlaceholder");
  search.addEventListener("input", async () => {
    currentQuery = search.value.trim().toLowerCase();
    await renderIndex();
  });
}

async function loadJson(path) {
  const url = new URL(path, location.href);
  url.searchParams.set("v", Date.now().toString());
  const res = await fetch(url, { cache: "no-store" });
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
  const display = brand.display?.[currentLang] || {};
  return {
    name: display.name || brand.name || brand.slug,
    secondaryName: display.secondaryName || brand.nativeName || "",
    intro: brand.intro?.[currentLang] || brand.primaryExcerpt || brand.description || "",
  };
}

function referenceText(brand = {}) {
  const localized = localizedBrand(brand);
  const apiUrl = new URL(brand.apiUrl || \`api/brands/\${brand.slug}.json\`, location.href).href;
  const skillUrl = new URL("skills/iptrust-live-update/SKILL.md", location.href).href;
  return [
    \`IP: \${localized.name}\${localized.secondaryName ? \` / \${localized.secondaryName}\` : ""}\`,
    \`Slug: \${brand.slug}\`,
    \`Intro: \${localized.intro}\`,
    \`Brand API: \${apiUrl}\`,
    \`Skill: \${skillUrl}\`,
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

async function writeClipboardText(text) {
  if (copyWithTextarea(text)) return "copied";
  try {
    if (navigator.clipboard?.writeText) {
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Clipboard timeout.")), 900)),
      ]);
      return "copied";
    }
  } catch (error) {
    console.warn("Clipboard API unavailable, falling back to manual selection.", error);
  }
  showManualCopy(text);
  return "selected";
}

async function copyReference(brand, button) {
  const result = await writeClipboardText(referenceText(brand));
  const previous = button.textContent;
  if (!button.dataset.iconOnly) button.textContent = result === "selected" ? t("copy.selected") : t("copy.done");
  button.classList.add("copied");
  setTimeout(() => {
    if (!button.dataset.iconOnly) button.textContent = previous || t("copy.reference");
    button.classList.remove("copied");
  }, 1200);
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
      button.classList.add("copied");
      button.title = result === "selected" ? t("copy.selected") : t("copy.done");
      setTimeout(() => button.classList.remove("copied"), 900);
    });
    button.addEventListener("keydown", async (event) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      event.stopPropagation();
      const result = await writeClipboardText(button.dataset.copyPantone);
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
    const localized = localizedBrand(brand);
    return \`
      <div class="hero-index-row" data-brand="\${escapeHtml(brand.slug)}" style="\${themeStyle(brand.theme)};--row-index:\${idx}">
        <a class="hero-index-link" href="\${brand.url}">
          <span class="hero-index-title">\${String(idx + 1).padStart(2, "0")} \${escapeHtml(localized.name)}</span>
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
      <time>\${escapeHtml(new Date(version.date).toLocaleDateString(currentLang === "zh" ? "zh-CN" : "en-US"))}</time>
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
        const localized = localizedBrand(brand);
        return [
          brand.slug,
          brand.name,
          brand.nativeName,
          localized.name,
          localized.secondaryName,
          localized.intro,
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
  grid.innerHTML = filtered.map((brand) => \`
    <article class="\${cardClass(brand)}" data-brand="\${escapeHtml(brand.slug)}" style="\${themeStyle(brand.theme)}">
      <a class="ip-card-link" href="\${brand.url}" aria-label="\${escapeHtml(localizedBrand(brand).name)}">
        <div class="card-body">
          <div class="card-art">
            <span class="art-code">\${escapeHtml(brand.slug)}</span>
            <span class="art-metric">\${brand.guideCount}G · \${brand.tokenCount}T</span>
          </div>
          <p class="eyebrow">\${escapeHtml(statusLabel(brand.status))}</p>
          <h2>\${escapeHtml(localizedBrand(brand).name)}</h2>
          \${miniPalette(brand.theme)}
          <p class="muted">\${escapeHtml(localizedBrand(brand).secondaryName || "")}</p>
          <p class="card-intro">\${escapeHtml(localizedBrand(brand).intro || "")}</p>
          <div class="meta">
            <span class="pill">\${brand.guideCount} \${t("meta.guides")}</span>
            <span class="pill">API</span>
          </div>
        </div>
      </a>
      <button class="copy-reference icon-copy" type="button" data-icon-only="true" data-copy-brand="\${escapeHtml(brand.slug)}" aria-label="\${escapeHtml(t("copy.reference"))} \${escapeHtml(localizedBrand(brand).name)}">\${copyIcon()}</button>
    </article>
  \`).join("");
  setupCopyButtons(filtered);
}

async function renderBrand() {
  const page = $("#brandPage");
  if (!page) return;
  const slug = new URLSearchParams(location.search).get("brand") || "tableai";
  const brand = await loadJson(\`api/brands/\${slug}.json\`);
  const localized = localizedBrand(brand);
  document.title = \`\${localized.name} · Brand Guidelines\`;
  const hero = brand.images?.[0]?.sitePath;
  page.innerHTML = \`
    <div class="brand-shell \${themeClass(brand.theme)}" style="\${themeStyle(brand.theme)}">
      <section class="brand-hero">
        <div>
          <p class="eyebrow">\${escapeHtml(statusLabel(brand.status))}</p>
          <h1>\${escapeHtml(localized.name)}</h1>
          <p class="muted">\${escapeHtml(localized.secondaryName || "")}</p>
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
renderHeroIndex().catch(console.error);
renderVersions().catch(console.error);
renderIndex().catch(console.error);
renderBrand().catch(console.error);`);

await writeFile(join(assetsDir, "admin.js"), html`const $ = (selector) => document.querySelector(selector);
const state = { config: null, brands: [], currentFile: null, currentSha: null };

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
  if (!token) throw new Error("Paste a GitHub token with contents write access.");
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
  $("#brandSelect").innerHTML = state.brands.map((brand) => \`<option value="\${brand.slug}">\${brand.name}</option>\`).join("");
  await populateFiles();
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
  status(\`Loaded \${path}\`);
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
  status(\`Committed \${state.currentFile}. GitHub Pages will rebuild after the push.\`);
}

async function unlock() {
  state.config = await loadJson("admin-config.json");
  const expected = state.config.adminKeySha256;
  if (!expected) {
    $("#unlockStatus").textContent = "No admin key hash is configured. Run npm run provision:admin-key, rebuild, and redeploy.";
    return;
  }
  const actual = await sha256($("#adminKey").value);
  if (actual !== expected) {
    $("#unlockStatus").textContent = "Admin key did not match.";
    $("#unlockStatus").style.color = "#b12137";
    return;
  }
  $("#unlockPanel").classList.add("hidden");
  $("#editorPanel").classList.remove("hidden");
  await populateBrands();
  status("Unlocked. Paste a GitHub token to load and save canonical source files.");
}

$("#unlockButton")?.addEventListener("click", () => unlock().catch((err) => {
  $("#unlockStatus").textContent = err.message;
  $("#unlockStatus").style.color = "#b12137";
}));
$("#brandSelect")?.addEventListener("change", () => populateFiles().catch((err) => status(err.message, true)));
$("#loadFile")?.addEventListener("click", () => loadFile().catch((err) => status(err.message, true)));
$("#saveFile")?.addEventListener("click", () => saveFile().catch((err) => status(err.message, true)));`);

console.log(`Built site with ${brandPayloads.length} brands at ${relative(root, siteDir)}`);
