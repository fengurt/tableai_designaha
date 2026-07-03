const $ = (selector) => document.querySelector(selector);

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path}`);
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
    .map(([key, value]) => `${key}:${value}`)
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
  return `<div class="swatches">${colors.map(([label, value]) => `
    <span class="swatch" title="${escapeHtml(label)} ${escapeHtml(value)}" style="background:${escapeHtml(value)}"></span>
    ${labeled ? `<span class="swatch-label">${escapeHtml(label)} ${escapeHtml(value)}</span>` : ""}
  `).join("")}</div>`;
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
  return `ip-card ${themeClass(brand.theme)}${featured}`;
}

function keywordChips(theme = {}) {
  const keywords = Array.isArray(theme.keywords) ? theme.keywords.slice(0, 4) : [];
  return `<div class="keyword-row">${keywords.map((keyword) => `<span class="keyword">${escapeHtml(keyword)}</span>`).join("")}</div>`;
}

async function renderIndex() {
  const grid = $("#brandGrid");
  if (!grid) return;
  const brands = await loadJson("api/brands.json");
  grid.innerHTML = brands.map((brand) => `
    <a class="${cardClass(brand)}" data-brand="${escapeHtml(brand.slug)}" href="${brand.url}" style="${themeStyle(brand.theme)}">
      <div class="card-media">
        ${brand.heroImage ? `<img src="${brand.heroImage}" alt="">` : ""}
        <span class="brand-sigil">${escapeHtml(brandInitial(brand))}</span>
      </div>
      <div class="card-body">
        <p class="eyebrow">${escapeHtml(brand.status)} · ${escapeHtml(brand.folder)}</p>
        <h2>${escapeHtml(brand.name)}</h2>
        <p class="muted">${escapeHtml(brand.nativeName || brand.description)}</p>
        <p class="card-essence">${escapeHtml(brand.primaryExcerpt)}</p>
        ${keywordChips(brand.theme)}
        <div class="meta">
          <span class="pill">${brand.guideCount} guides</span>
          <span class="pill">${brand.tokenCount} token files</span>
          <span class="pill">JSON API</span>
        </div>
      </div>
    </a>
  `).join("");
}

async function renderBrand() {
  const page = $("#brandPage");
  if (!page) return;
  const slug = new URLSearchParams(location.search).get("brand") || "tableai";
  const brand = await loadJson(`api/brands/${slug}.json`);
  document.title = `${brand.name} · Brand Guidelines`;
  const hero = brand.images?.[0]?.sitePath;
  page.innerHTML = `
    <div class="brand-shell ${themeClass(brand.theme)}" style="${themeStyle(brand.theme)}">
      <section class="brand-hero">
        <div>
          <p class="eyebrow">${escapeHtml(brand.status)}</p>
          <h1>${escapeHtml(brand.name)}</h1>
          <p class="muted">${escapeHtml(brand.nativeName || "")}</p>
          <p>${escapeHtml(brand.description)}</p>
          ${swatches(brand.theme, true)}
          <div class="actions">
            <a class="button" href="${brand.apiUrl}">Open JSON endpoint</a>
            <a class="button ghost" href="${brand.source.github}">Source folder</a>
          </div>
        </div>
        ${hero ? `<img src="${hero}" alt="">` : ""}
      </section>
      <section class="resource-list">
        <div class="resource"><strong>Brand color tokens</strong><br>${escapeHtml(brand.theme?.keywords?.join(" · ") || "No theme keywords yet.")}</div>
        <div class="resource"><strong>Editable source paths</strong><br>${brand.editablePaths?.map(escapeHtml).join("<br>") || "No guideline files yet."}</div>
        <div class="resource"><strong>Token files</strong><br>${brand.tokens?.map((token) => escapeHtml(token.path)).join("<br>") || "No token files yet."}</div>
      </section>
      ${brand.guides?.map((guide) => `
        <article class="guide">
          <p class="eyebrow">${escapeHtml(guide.format)} · ${escapeHtml(guide.path)}</p>
          <h2>${escapeHtml(guide.title)}</h2>
          <pre>${escapeHtml(guide.text)}</pre>
        </article>
      `).join("") || ""}
    </div>
  `;
}

renderIndex().catch(console.error);
renderBrand().catch(console.error);