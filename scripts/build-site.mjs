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
  name: "Table AI Design Aha",
  description: "Public, agent-friendly design guidelines for Table AI Alliance brands.",
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
  "# Table AI Design Aha",
  "",
  "Agent-friendly design guidelines for Table AI Alliance brands.",
  "",
  "Machine-readable entry points:",
  "- /api/manifest.json",
  "- /api/brands.json",
  "- /api/brands/{slug}.json",
  "",
  "Brands:",
  ...indexPayload.map((brand) => `- ${brand.name} (${brand.slug}): /api/brands/${brand.slug}.json`),
  "",
  "Admin workflow:",
  "- /admin.html unlocks with the generated admin key.",
  "- Edits are committed back to GitHub via the GitHub Contents API.",
  "- GitHub Pages rebuilds from main after changes land.",
].join("\n"));

await writeFile(join(siteDir, "index.html"), html`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Table AI Design Aha</title>
  <meta name="description" content="Agent-friendly design guidelines for Table AI Alliance brands.">
  <link rel="stylesheet" href="assets/site.css">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="./">Table AI Design Aha</a>
    <nav>
      <a href="api/manifest.json">Manifest</a>
      <a href="llms.txt">llms.txt</a>
      <a href="admin.html">Admin</a>
    </nav>
  </header>
  <main>
    <section class="hero">
      <p class="eyebrow">Design systems for people and agents</p>
      <h1>All brand guidelines in one public, machine-readable website.</h1>
      <p>Each brand has a human page, a JSON API endpoint, source links, generated brand imagery, and editable canonical files in GitHub.</p>
      <div class="actions">
        <a class="button" href="api/brands.json">Open JSON index</a>
        <a class="button ghost" href="admin.html">Admin edit</a>
      </div>
    </section>
    <section class="grid" id="brandGrid" aria-live="polite"></section>
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
  <link rel="stylesheet" href="assets/site.css">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="./">Table AI Design Aha</a>
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
  <title>Admin · Table AI Design Aha</title>
  <link rel="stylesheet" href="assets/site.css">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="./">Table AI Design Aha</a>
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
  --bg: #f7f6f3;
  --paper: #fffefa;
  --ink: #171717;
  --muted: #60656f;
  --line: rgba(20, 20, 20, .12);
  --accent: #a88b52;
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
a { color: inherit; }
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 18px clamp(18px, 4vw, 48px);
  border-bottom: 1px solid var(--line);
  background: rgba(255, 254, 250, .86);
  backdrop-filter: blur(16px);
  position: sticky;
  top: 0;
  z-index: 10;
}
.brand { font-weight: 750; text-decoration: none; letter-spacing: 0; }
nav { display: flex; gap: 18px; color: var(--muted); font-size: 14px; }
nav a { text-decoration: none; }
main { width: min(1180px, calc(100vw - 36px)); margin: 0 auto; }
.hero { padding: clamp(56px, 8vw, 108px) 0 44px; max-width: 920px; }
.eyebrow { color: var(--accent); font-size: 12px; font-weight: 760; text-transform: uppercase; letter-spacing: .18em; }
h1 { font-size: clamp(38px, 6vw, 78px); line-height: 1.02; margin: 12px 0 18px; letter-spacing: 0; max-width: 980px; }
h2 { font-size: clamp(26px, 3vw, 38px); margin: 0 0 12px; letter-spacing: 0; }
h3 { margin: 0 0 8px; }
p { line-height: 1.65; }
.hero p:not(.eyebrow), .muted { color: var(--muted); font-size: 17px; max-width: 760px; }
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
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; padding: 22px 0 80px; }
.card, .panel, .guide, .resource {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.card { overflow: hidden; text-decoration: none; display: flex; flex-direction: column; min-height: 350px; }
.card img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: #eceae4; border-bottom: 1px solid var(--line); }
.card-body { padding: 18px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; color: var(--muted); font-size: 13px; }
.pill { border: 1px solid var(--line); border-radius: 999px; padding: 4px 8px; background: white; }
.brand-page { padding: 36px 0 90px; }
.brand-hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(280px, .95fr); gap: clamp(22px, 4vw, 48px); align-items: center; margin-bottom: 36px; }
.brand-hero img { width: 100%; border-radius: 8px; border: 1px solid var(--line); }
.resource-list { display: grid; gap: 14px; margin: 24px 0; }
.resource { padding: 18px; }
.guide { margin: 18px 0; padding: 22px; }
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: #262626;
  background: #f5f3ee;
  padding: 18px;
  border-radius: 6px;
  border: 1px solid var(--line);
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
  .brand-hero, .form-grid { grid-template-columns: 1fr; }
  h1 { font-size: 40px; }
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

async function renderIndex() {
  const grid = $("#brandGrid");
  if (!grid) return;
  const brands = await loadJson("api/brands.json");
  grid.innerHTML = brands.map((brand) => \`
    <a class="card" href="\${brand.url}">
      \${brand.heroImage ? \`<img src="\${brand.heroImage}" alt="">\` : ""}
      <div class="card-body">
        <p class="eyebrow">\${escapeHtml(brand.status)}</p>
        <h2>\${escapeHtml(brand.name)}</h2>
        <p class="muted">\${escapeHtml(brand.nativeName || brand.description)}</p>
        <p>\${escapeHtml(brand.primaryExcerpt)}</p>
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
    <section class="brand-hero">
      <div>
        <p class="eyebrow">\${escapeHtml(brand.status)}</p>
        <h1>\${escapeHtml(brand.name)}</h1>
        <p class="muted">\${escapeHtml(brand.nativeName || "")}</p>
        <p>\${escapeHtml(brand.description)}</p>
        <div class="actions">
          <a class="button" href="\${brand.apiUrl}">Open JSON endpoint</a>
          <a class="button ghost" href="\${brand.source.github}">Source folder</a>
        </div>
      </div>
      \${hero ? \`<img src="\${hero}" alt="">\` : ""}
    </section>
    <section class="resource-list">
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
