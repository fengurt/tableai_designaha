const $ = (selector) => document.querySelector(selector);

const i18n = {
  zh: {
    "nav.manifest": "清单",
    "nav.admin": "管理",
    "home.eyebrow": "IP 信任索引 · Agent 可读品牌源",
    "home.lead": "极速、极简地进入每个 IP：颜色、语气、规范、资产与机器可读源文件都从 GitHub 同步。",
    "home.openJson": "打开 JSON 索引",
    "home.adminEdit": "管理编辑",
    "home.systems": "IP 系统",
    "home.sectionTitle": "直接进入 IP。",
    "status.documented": "已建档",
    "status.placeholder": "待建档",
    "meta.guides": "规范",
    "brand.openJson": "打开 JSON",
    "brand.source": "源文件",
    "brand.colors": "品牌颜色",
    "brand.editable": "可编辑源文件",
    "brand.tokens": "Token 文件",
    "brand.noneGuide": "暂无规范文件",
    "brand.noneTokens": "暂无 token 文件",
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
    "home.eyebrow": "IP trust index · Agent-readable brand source",
    "home.lead": "Fast, minimal access to every IP: color, voice, guidelines, assets, and machine-readable source stay synced from GitHub.",
    "home.openJson": "Open JSON index",
    "home.adminEdit": "Admin edit",
    "home.systems": "IP systems",
    "home.sectionTitle": "Enter the IP directly.",
    "status.documented": "Documented",
    "status.placeholder": "Pending",
    "meta.guides": "guides",
    "brand.openJson": "Open JSON",
    "brand.source": "Source",
    "brand.colors": "Brand colors",
    "brand.editable": "Editable source",
    "brand.tokens": "Token files",
    "brand.noneGuide": "No guideline files yet",
    "brand.noneTokens": "No token files yet",
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
}

function setupLanguageToggle() {
  const toggle = $("#langToggle");
  if (!toggle) return;
  toggle.addEventListener("click", async () => {
    currentLang = currentLang === "zh" ? "en" : "zh";
    localStorage.setItem("iptrust-lang", currentLang);
    applyI18n();
    await renderIndex();
    await renderBrand();
  });
}

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
  return `ip-card ${themeClass(brand.theme)}`;
}

function statusLabel(status) {
  return status === "documented" ? t("status.documented") : t("status.placeholder");
}

async function renderIndex() {
  const grid = $("#brandGrid");
  if (!grid) return;
  const brands = await loadJson("api/brands.json");
  grid.innerHTML = brands.map((brand) => `
    <a class="${cardClass(brand)}" data-brand="${escapeHtml(brand.slug)}" href="${brand.url}" style="${themeStyle(brand.theme)}">
      <div class="card-body">
        <span class="brand-sigil">${escapeHtml(brandInitial(brand))}</span>
        <p class="eyebrow">${escapeHtml(statusLabel(brand.status))}</p>
        <h2>${escapeHtml(brand.name)}</h2>
        <p class="muted">${escapeHtml(brand.nativeName || "")}</p>
        <div class="meta">
          <span class="pill">${brand.guideCount} ${t("meta.guides")}</span>
          <span class="pill">API</span>
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
            <a class="button" href="${brand.apiUrl}">${t("brand.openJson")}</a>
            <a class="button ghost" href="${brand.source.github}">${t("brand.source")}</a>
          </div>
        </div>
        ${hero ? `<img src="${hero}" alt="">` : ""}
      </section>
      <section class="resource-list">
        <div class="resource"><strong>${t("brand.colors")}</strong><br>${escapeHtml(brand.theme?.keywords?.join(" · ") || "")}</div>
        <div class="resource"><strong>${t("brand.editable")}</strong><br>${brand.editablePaths?.map(escapeHtml).join("<br>") || t("brand.noneGuide")}</div>
        <div class="resource"><strong>${t("brand.tokens")}</strong><br>${brand.tokens?.map((token) => escapeHtml(token.path)).join("<br>") || t("brand.noneTokens")}</div>
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

applyI18n();
setupLanguageToggle();
renderIndex().catch(console.error);
renderBrand().catch(console.error);