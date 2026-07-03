import { mkdir, readFile, rm, writeFile, copyFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
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
const hubDescription = "A public IP trust hub for brand guidelines, design systems, assets, and agent-readable source files.";

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

function html(strings, ...values) {
  return String.raw({ raw: strings }, ...values);
}

await rm(siteDir, { recursive: true, force: true });
await mkdir(brandApiDir, { recursive: true });
await mkdir(imageDir, { recursive: true });

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

  const payload = {
    ...brand,
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

await writeFile(join(apiDir, "brands.json"), JSON.stringify(indexPayload, null, 2));
await writeFile(join(apiDir, "manifest.json"), JSON.stringify({
  name: hubName,
  description: hubDescription,
  generatedAt: new Date().toISOString(),
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
  "",
  "Machine-readable entry points:",
  "- /api/manifest.json",
  "- /api/brands.json",
  "- /api/brands/{slug}.json",
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
<html lang="en">
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
      <a href="api/manifest.json">Manifest</a>
      <a href="llms.txt">llms.txt</a>
      <a href="admin.html">Admin</a>
    </nav>
  </header>
  <main>
    <section class="hub-hero">
      <div class="hero-copy">
        <p class="eyebrow">IP trust registry · Agent-ready brand source</p>
        <h1>岁知社 IPTrust</h1>
        <p>One living hub for every IP: brand color, voice, image, design rule, token file, and machine-readable guideline stays synced from GitHub.</p>
        <div class="actions">
          <a class="button" href="api/brands.json">Open JSON index</a>
          <a class="button ghost" href="admin.html">Admin edit</a>
        </div>
      </div>
      <div class="hero-gallery" aria-hidden="true">
        <img src="assets/brand-images/tableai.png" alt="">
        <img src="assets/brand-images/vanahom.png" alt="">
        <img src="assets/brand-images/kind.png" alt="">
        <img src="assets/brand-images/sidera.png" alt="">
      </div>
    </section>
    <section class="section-head">
      <p class="eyebrow">Ten distinct IP systems</p>
      <h2>Each card behaves like its own brand room.</h2>
    </section>
    <section class="ip-grid" id="brandGrid" aria-live="polite"></section>
  </main>
  <script src="assets/site.js" type="module"></script>
</body>
</html>`);

await writeFile(join(siteDir, "brand.html"), html`<!doctype html>
<html lang="en">
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
      <a href="admin.html">Admin</a>
    </nav>
  </header>
  <main id="brandPage" class="brand-page" aria-live="polite"></main>
  <script src="assets/site.js" type="module"></script>
</body>
</html>`);

await writeFile(join(siteDir, "admin.html"), html`<!doctype html>
<html lang="en">
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
      <a href="api/manifest.json">Manifest</a>
      <a href="https://github.com/${adminConfig.owner ?? "fengurt"}/${adminConfig.repo ?? "tableai_designaha"}">GitHub</a>
    </nav>
  </header>
  <main class="admin">
    <section class="panel" id="unlockPanel">
      <p class="eyebrow">Admin</p>
      <h1>Unlock editor</h1>
      <p class="muted">The admin key unlocks this browser editor. Saving still requires a GitHub token with contents write access, so canonical edits flow back into the repo.</p>
      <label>Admin API key <input id="adminKey" type="password" autocomplete="current-password"></label>
      <button id="unlockButton">Unlock</button>
      <p class="notice" id="unlockStatus"></p>
    </section>
    <section class="panel hidden" id="editorPanel">
      <p class="eyebrow">Two-way sync</p>
      <h1>Edit GitHub source</h1>
      <div class="form-grid">
        <label>GitHub token <input id="githubToken" type="password" autocomplete="off" placeholder="Fine-grained PAT or classic token"></label>
        <label>Branch <input id="branch" value="${adminConfig.branch ?? "main"}"></label>
        <label>Brand <select id="brandSelect"></select></label>
        <label>File <select id="fileSelect"></select></label>
      </div>
      <div class="actions">
        <button id="loadFile">Load file</button>
        <button id="saveFile">Commit edit</button>
      </div>
      <textarea id="editor" spellcheck="false" placeholder="Load an editable guideline file..."></textarea>
      <label>Commit message <input id="commitMessage" value="Update brand guideline from admin site"></label>
      <p class="notice" id="editorStatus"></p>
    </section>
  </main>
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
    linear-gradient(180deg, rgba(255, 254, 250, .84), rgba(242, 240, 235, .98) 42%),
    radial-gradient(circle at top right, rgba(154, 122, 63, .18), transparent 34%),
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
main { width: min(1180px, calc(100vw - 36px)); margin: 0 auto; }
.hub-hero {
  min-height: calc(100vh - 74px);
  display: grid;
  grid-template-columns: minmax(0, .95fr) minmax(360px, .9fr);
  gap: 42px;
  align-items: center;
  padding: 54px 0 42px;
}
.hero-copy { max-width: 760px; }
.eyebrow { color: var(--accent); font-size: 12px; font-weight: 760; text-transform: uppercase; letter-spacing: .18em; }
h1 { font-size: 76px; line-height: .96; margin: 12px 0 18px; letter-spacing: 0; max-width: 980px; }
h2 { font-size: 36px; line-height: 1.08; margin: 0 0 12px; letter-spacing: 0; }
h3 { margin: 0 0 8px; }
p { line-height: 1.65; }
.hub-hero p:not(.eyebrow), .muted { color: var(--muted); font-size: 18px; max-width: 760px; }
.hero-gallery {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: stretch;
}
.hero-gallery img {
  width: 100%;
  height: 100%;
  min-height: 174px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(22, 20, 18, .12);
}
.hero-gallery img:first-child { grid-row: span 2; }
.section-head {
  display: flex;
  justify-content: space-between;
  gap: 28px;
  align-items: end;
  padding: 18px 0 22px;
  border-top: 1px solid var(--line);
}
.section-head h2 { max-width: 560px; }
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
.ip-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
  padding: 22px 0 88px;
}
.card, .panel, .guide, .resource {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.ip-card {
  overflow: hidden;
  text-decoration: none;
  display: grid;
  grid-template-rows: 220px 1fr;
  min-height: 520px;
  grid-column: span 4;
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--brand-primary) 12%, transparent), transparent 44%),
    var(--brand-paper, var(--paper));
  border-color: var(--brand-line, var(--line));
  color: var(--brand-ink, var(--ink));
  position: relative;
  border: 1px solid var(--brand-line, var(--line));
  border-radius: 8px;
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
}
.ip-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  background: var(--brand-primary, var(--accent));
  z-index: 2;
}
.ip-card:hover { transform: translateY(-4px); border-color: var(--brand-primary, var(--line)); box-shadow: 0 22px 60px rgba(22, 20, 18, .10); }
.ip-card.theme-dark { background: var(--brand-paper); color: var(--brand-ink); }
.ip-card.featured { grid-column: span 6; grid-template-rows: 300px 1fr; }
.ip-card[data-brand="sidera"],
.ip-card[data-brand="manaendless"] { background: var(--brand-paper); }
.ip-card[data-brand="fengzhi"] { border-radius: 0; }
.ip-card[data-brand="kind"] { border-radius: 18px; }
.ip-card[data-brand="vanahom"]::before { width: 3px; }
.card-media { position: relative; overflow: hidden; background: var(--brand-surface); }
.card-media::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 52%, color-mix(in srgb, var(--brand-paper) 82%, transparent));
}
.ip-card.theme-dark .card-media::after { background: linear-gradient(180deg, transparent 40%, color-mix(in srgb, var(--brand-paper) 88%, transparent)); }
.card-media img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.01); }
.brand-sigil {
  position: absolute;
  right: 16px;
  bottom: 14px;
  z-index: 1;
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
.card-body { padding: 20px 20px 22px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
.card-body .eyebrow { color: var(--brand-primary, var(--accent)); }
.card-body .muted, .card-body p { color: var(--brand-muted, var(--muted)); }
.card-body h2 { color: var(--brand-ink, var(--ink)); font-size: 32px; line-height: 1.05; }
.ip-card.featured .card-body h2 { font-size: 40px; }
.card-essence {
  min-height: 78px;
  display: -webkit-box;
  -webkit-line-clamp: 7;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ip-card.featured .card-essence { -webkit-line-clamp: 8; }
.keyword-row { display: flex; flex-wrap: wrap; gap: 7px; }
.keyword {
  border: 1px solid var(--brand-line);
  color: var(--brand-ink);
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--brand-paper));
  border-radius: 999px;
  padding: 5px 8px;
  font-size: 12px;
  line-height: 1;
}
.ip-card[data-brand="fengzhi"] .keyword,
.ip-card[data-brand="sidera"] .keyword { border-radius: 2px; }
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
  .hero-gallery { grid-template-columns: 1fr 1fr; }
  .section-head { display: block; }
  .ip-grid { grid-template-columns: 1fr; }
  .ip-card, .ip-card.featured { grid-column: auto; grid-template-rows: 210px 1fr; min-height: 0; }
  h1 { font-size: 40px; }
  h2 { font-size: 28px; }
  .card-body h2, .ip-card.featured .card-body h2 { font-size: 30px; }
}
@media (min-width: 761px) and (max-width: 1080px) {
  .hub-hero { grid-template-columns: 1fr; min-height: auto; }
  .ip-card, .ip-card.featured { grid-column: span 6; }
}`);

await writeFile(join(assetsDir, "site.js"), html`const $ = (selector) => document.querySelector(selector);

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(\`Could not load \${path}\`);
  return res.json();
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

function brandInitial(brand = {}) {
  if (brand.slug === "fengzhi") return "界";
  if (brand.slug === "sidera") return "侍";
  if (brand.slug === "vanahom") return "V";
  if (brand.slug === "kind") return "K";
  if (brand.slug === "tableai") return "AI";
  return String(brand.name || brand.slug || "IP").slice(0, 2);
}

function cardClass(brand = {}) {
  const featured = ["tableai", "vanahom", "fengzhi", "sidera"].includes(brand.slug) ? " featured" : "";
  return \`ip-card \${themeClass(brand.theme)}\${featured}\`;
}

function keywordChips(theme = {}) {
  const keywords = Array.isArray(theme.keywords) ? theme.keywords.slice(0, 4) : [];
  return \`<div class="keyword-row">\${keywords.map((keyword) => \`<span class="keyword">\${escapeHtml(keyword)}</span>\`).join("")}</div>\`;
}

async function renderIndex() {
  const grid = $("#brandGrid");
  if (!grid) return;
  const brands = await loadJson("api/brands.json");
  grid.innerHTML = brands.map((brand) => \`
    <a class="\${cardClass(brand)}" data-brand="\${escapeHtml(brand.slug)}" href="\${brand.url}" style="\${themeStyle(brand.theme)}">
      <div class="card-media">
        \${brand.heroImage ? \`<img src="\${brand.heroImage}" alt="">\` : ""}
        <span class="brand-sigil">\${escapeHtml(brandInitial(brand))}</span>
      </div>
      <div class="card-body">
        <p class="eyebrow">\${escapeHtml(brand.status)} · \${escapeHtml(brand.folder)}</p>
        <h2>\${escapeHtml(brand.name)}</h2>
        <p class="muted">\${escapeHtml(brand.nativeName || brand.description)}</p>
        <p class="card-essence">\${escapeHtml(brand.primaryExcerpt)}</p>
        \${keywordChips(brand.theme)}
        <div class="meta">
          <span class="pill">\${brand.guideCount} guides</span>
          <span class="pill">\${brand.tokenCount} token files</span>
          <span class="pill">JSON API</span>
        </div>
      </div>
    </a>
  \`).join("");
}

async function renderBrand() {
  const page = $("#brandPage");
  if (!page) return;
  const slug = new URLSearchParams(location.search).get("brand") || "tableai";
  const brand = await loadJson(\`api/brands/\${slug}.json\`);
  document.title = \`\${brand.name} · Brand Guidelines\`;
  const hero = brand.images?.[0]?.sitePath;
  page.innerHTML = \`
    <div class="brand-shell \${themeClass(brand.theme)}" style="\${themeStyle(brand.theme)}">
      <section class="brand-hero">
        <div>
          <p class="eyebrow">\${escapeHtml(brand.status)}</p>
          <h1>\${escapeHtml(brand.name)}</h1>
          <p class="muted">\${escapeHtml(brand.nativeName || "")}</p>
          <p>\${escapeHtml(brand.description)}</p>
          \${swatches(brand.theme, true)}
          <div class="actions">
            <a class="button" href="\${brand.apiUrl}">Open JSON endpoint</a>
            <a class="button ghost" href="\${brand.source.github}">Source folder</a>
          </div>
        </div>
        \${hero ? \`<img src="\${hero}" alt="">\` : ""}
      </section>
      <section class="resource-list">
        <div class="resource"><strong>Brand color tokens</strong><br>\${escapeHtml(brand.theme?.keywords?.join(" · ") || "No theme keywords yet.")}</div>
        <div class="resource"><strong>Editable source paths</strong><br>\${brand.editablePaths?.map(escapeHtml).join("<br>") || "No guideline files yet."}</div>
        <div class="resource"><strong>Token files</strong><br>\${brand.tokens?.map((token) => escapeHtml(token.path)).join("<br>") || "No token files yet."}</div>
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
