const $ = (selector) => document.querySelector(selector);

const i18n = {
  zh: {
    "nav.manifest": "清单",
    "nav.admin": "管理",
    "home.eyebrow": "IP 信任索引 · Agent 可读品牌源",
    "home.lead": "进入每个 IP。",
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
    "home.lead": "Enter every IP.",
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

function copyIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="2"></rect><path d="M5 15V7a2 2 0 0 1 2-2h8"></path></svg>`;
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

function palette(theme = {}) {
  return [
    ["Primary", theme.primary],
    ["Accent", theme.accent],
    ["Secondary", theme.secondary],
  ].filter(([, value]) => value);
}

function colorDots(theme = {}) {
  return `<span class="hero-index-colors">${palette(theme).map(([label, value]) => `
    <button class="color-dot" type="button" data-copy-color="${escapeHtml(value)}" aria-label="Copy ${escapeHtml(label)} ${escapeHtml(value)}" title="${escapeHtml(label)} ${escapeHtml(value)}" style="--dot:${escapeHtml(value)}"></button>
  `).join("")}</span>`;
}

function miniPalette(theme = {}) {
  return `<span class="mini-palette" aria-hidden="true">${palette(theme).map(([, value]) => `
    <span class="mini-swatch" style="--dot:${escapeHtml(value)}"></span>
  `).join("")}</span>`;
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
  const apiUrl = new URL(brand.apiUrl || `api/brands/${brand.slug}.json`, location.href).href;
  const skillUrl = new URL("skills/iptrust-live-update/SKILL.md", location.href).href;
  return [
    `IP: ${localized.name}${localized.secondaryName ? ` / ${localized.secondaryName}` : ""}`,
    `Slug: ${brand.slug}`,
    `Intro: ${localized.intro}`,
    `Brand API: ${apiUrl}`,
    `Skill: ${skillUrl}`,
  ].join("\n");
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
  panel.innerHTML = `<textarea readonly></textarea><button type="button" aria-label="Close">×</button>`;
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
        if (!brand) throw new Error(`Unknown brand ${button.dataset.copyBrand}`);
        await copyReference(brand, button);
      } catch (error) {
        button.textContent = t("copy.fail");
        console.error(error);
      }
    });
  });
  document.querySelectorAll("[data-copy-color]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const result = await writeClipboardText(button.dataset.copyColor);
      button.classList.add("copied");
      button.title = result === "selected" ? t("copy.selected") : t("copy.done");
      setTimeout(() => button.classList.remove("copied"), 900);
    });
  });
}

async function renderHeroIndex() {
  const index = $("#heroIndex");
  if (!index) return;
  cachedBrands ??= await loadJson("api/brands.json");
  index.innerHTML = cachedBrands.map((brand, idx) => {
    const localized = localizedBrand(brand);
    return `
      <div class="hero-index-row" data-brand="${escapeHtml(brand.slug)}" style="${themeStyle(brand.theme)};--row-index:${idx}">
        <a class="hero-index-link" href="${brand.url}">
          <span class="hero-index-title">${String(idx + 1).padStart(2, "0")} ${escapeHtml(localized.name)}</span>
        </a>
        ${colorDots(brand.theme)}
        <button class="icon-copy" type="button" data-icon-only="true" data-copy-brand="${escapeHtml(brand.slug)}" aria-label="${escapeHtml(t("copy.reference"))} ${escapeHtml(localized.name)}">${copyIcon()}</button>
      </div>
    `;
  }).join("");
  setupCopyButtons(cachedBrands);
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
  if (count) count.textContent = currentQuery ? `${filtered.length}/${brands.length} IP` : `${brands.length} IP`;
  if (!filtered.length) {
    grid.innerHTML = `<p class="empty-state">${escapeHtml(t("home.noResults"))}</p>`;
    return;
  }
  grid.innerHTML = filtered.map((brand) => `
    <article class="${cardClass(brand)}" data-brand="${escapeHtml(brand.slug)}" style="${themeStyle(brand.theme)}">
      <a class="ip-card-link" href="${brand.url}" aria-label="${escapeHtml(localizedBrand(brand).name)}">
        <div class="card-body">
          <div class="card-art">
            <span class="art-code">${escapeHtml(brand.slug)}</span>
            <span class="art-metric">${brand.guideCount}G · ${brand.tokenCount}T</span>
          </div>
          <p class="eyebrow">${escapeHtml(statusLabel(brand.status))}</p>
          <h2>${escapeHtml(localizedBrand(brand).name)}</h2>
          ${miniPalette(brand.theme)}
          <p class="muted">${escapeHtml(localizedBrand(brand).secondaryName || "")}</p>
          <p class="card-intro">${escapeHtml(localizedBrand(brand).intro || "")}</p>
          <div class="meta">
            <span class="pill">${brand.guideCount} ${t("meta.guides")}</span>
            <span class="pill">API</span>
          </div>
        </div>
      </a>
      <button class="copy-reference icon-copy" type="button" data-icon-only="true" data-copy-brand="${escapeHtml(brand.slug)}" aria-label="${escapeHtml(t("copy.reference"))} ${escapeHtml(localizedBrand(brand).name)}">${copyIcon()}</button>
    </article>
  `).join("");
  setupCopyButtons(filtered);
}

async function renderBrand() {
  const page = $("#brandPage");
  if (!page) return;
  const slug = new URLSearchParams(location.search).get("brand") || "tableai";
  const brand = await loadJson(`api/brands/${slug}.json`);
  const localized = localizedBrand(brand);
  document.title = `${localized.name} · Brand Guidelines`;
  const hero = brand.images?.[0]?.sitePath;
  page.innerHTML = `
    <div class="brand-shell ${themeClass(brand.theme)}" style="${themeStyle(brand.theme)}">
      <section class="brand-hero">
        <div>
          <p class="eyebrow">${escapeHtml(statusLabel(brand.status))}</p>
          <h1>${escapeHtml(localized.name)}</h1>
          <p class="muted">${escapeHtml(localized.secondaryName || "")}</p>
          <p>${escapeHtml(localized.intro)}</p>
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
setupSearch();
renderHeroIndex().catch(console.error);
renderIndex().catch(console.error);
renderBrand().catch(console.error);