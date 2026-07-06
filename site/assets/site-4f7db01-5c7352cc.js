const $ = (selector) => document.querySelector(selector);
const BUILD_VERSION = "4f7db01-5c7352cc";

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
    "brand.assetHub": "IP 资产调用",
    "brand.assetKey": "IP ID",
    "brand.brandJson": "品牌 JSON",
    "brand.imageAssets": "图片资产",
    "brand.historyApi": "历史版本",
    "brand.agentUse": "Agent 调用",
    "brand.moodBoard": "Mood Board",
    "brand.visualAssets": "视觉资产",
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
    "home.searchPlaceholder": "Search IP / Asset Key",
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
    "brand.assetHub": "IP Asset Calls",
    "brand.assetKey": "IP ID",
    "brand.brandJson": "Brand JSON",
    "brand.imageAssets": "Image assets",
    "brand.historyApi": "History",
    "brand.agentUse": "Agent call",
    "brand.moodBoard": "Mood Board",
    "brand.visualAssets": "Visual assets",
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
  toggle.setAttribute("aria-label", `Language: ${localeMeta[currentLocale].label}`);
  toggle.innerHTML = `
    <span class="${currentLocale === "cn" ? "is-active" : ""}">CN</span>
    <span class="lang-divider">/</span>
    <span class="${currentLocale === "en" ? "is-active" : ""}">EN</span>
  `;
}

function applyI18n() {
  document.documentElement.lang = localeMeta[currentLocale].htmlLang;
  document.documentElement.dataset.locale = currentLocale;
  if (document.body.classList.contains("hub-home")) {
    document.title = t("hub.name");
  } else if (document.querySelector(".admin")) {
    document.title = `Admin · ${t("hub.name")}`;
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
  if (!res.ok) throw new Error(`Could not load ${path}`);
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
  return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : hex;
}

function pantoneApprox(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `PANTONE approx ${hex}`;
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
  return `<span class="hero-index-colors">${palette(theme).map(([label, value]) => `
    <button class="color-dot" type="button" data-copy-rgb="${escapeHtml(rgbValue(value))}" data-copy-pantone="${escapeHtml(pantoneApprox(value))}" data-color-tooltip="${escapeHtml(label)} · ${escapeHtml(rgbValue(value))} · Tab ${escapeHtml(pantoneApprox(value))}" aria-label="Copy ${escapeHtml(label)} ${escapeHtml(rgbValue(value))}" title="${escapeHtml(label)} ${escapeHtml(rgbValue(value))}" style="--dot:${escapeHtml(value)}"></button>
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
    `Skill: ${skillUrl}`,
    "",
    skill || "Use the IPTrust manifest and brand APIs to read each IP's latest name, colors, intro, business, language, and guideline files.",
  ].join("\n");
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
  const ipPageUrl = new URL(brand.url || `brand.html?brand=${brand.slug}`, location.href).href;
  const apiUrl = new URL(brand.apiUrl || `api/brands/${brand.slug}.json`, location.href).href;
  const historyUrl = new URL(brand.historyUrl || `api/history/${brand.slug}.json`, location.href).href;
  const schemaUrl = new URL("api/schema.json", location.href).href;
  const skillUrl = new URL("skills/iptrust-live-update/SKILL.md", location.href).href;
  const mcpSource = new URL("api/manifest.json", location.href).href;
  const colors = palette(brand.theme)
    .map(([label, value]) => `${label}: ${value} / ${rgbValue(value)}`)
    .join("\n");
  return [
    "IPTrust Agent Reference",
    "",
    "[IP Identity]",
    `Name: ${localized.name}`,
    localized.secondaryName ? `Other name: ${localized.secondaryName}` : "",
    `IP ID / Asset Key: ${brand.assetKey || brand.slug}`,
    `Main language: ${languageLabel(brand.mainLanguage || localized.language)}`,
    "",
    "[Links]",
    `IP page: ${ipPageUrl}`,
    `Official website: ${brand.officialWebsite || "TBD"}`,
    `Brand API: ${apiUrl}`,
    `History API: ${historyUrl}`,
    `Field schema: ${schemaUrl}`,
    `IPTrust Skill: ${skillUrl}`,
    `MCP manifest: ${mcpSource}`,
    "",
    "[Core]",
    `Intro: ${localized.intro || "TBD"}`,
    `Business: ${localized.business || "TBD"}`,
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
    `list_brands({})`,
    `get_brand({ "assetKey": "${brand.assetKey || brand.slug}" })`,
    `get_guideline({ "assetKey": "${brand.assetKey || brand.slug}" })`,
    `list_tokens({ "assetKey": "${brand.assetKey || brand.slug}" })`,
    `validate_color({ "assetKey": "${brand.assetKey || brand.slug}", "hex": "${brand.theme?.primary || "#000000"}" })`,
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
      const statusNode = document.querySelector(`[data-portal-status="${action}"]`);
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
    `curl -X POST "${new URL("api/admin/login", location.href).href}"`,
    `  -H "Content-Type: application/json"`,
    `  -H "X-Admin-Key: <ADMIN_API_KEY>"`,
    `  -d '{"adminKey":"<ADMIN_API_KEY>"}'`,
  ].join("\n");
}

const API_CONNECT_COOKIE = "iptrust_api_connected";
const API_KEY_SESSION = "iptrust_api_key";

function setApiCookie(scopes = ["*"]) {
  const value = JSON.stringify({ connected: true, scopes, at: Date.now() });
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = API_CONNECT_COOKIE + "=" + encodeURIComponent(value) + "; path=/; max-age=604800; SameSite=Lax" + secure;
}

function clearApiCookie() {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = API_CONNECT_COOKIE + "=; path=/; max-age=0; SameSite=Lax" + secure;
  sessionStorage.removeItem(API_KEY_SESSION);
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
    scopeText.textContent = scopes.includes("*") ? t("api.allAccess") : `${t("api.scopesGranted")}${scopes.join(", ")}`;
  }
  apiStatus(t("api.connected"));
  window.dispatchEvent(new CustomEvent("iptrust:api-connected", { detail: { scopes } }));
}

async function loadProtectedResources() {
  const key = sessionStorage.getItem(API_KEY_SESSION) || $("#apiAdminKey")?.value || "";
  const summary = $("#apiResourceSummary");
  if (!summary) return;
  if (!key) {
    summary.classList.remove("hidden");
    summary.textContent = t("api.reconnectForResources");
    return;
  }
  summary.classList.remove("hidden");
  summary.textContent = t("api.loadingResources");
  try {
    const res = await fetch("api/resources", { headers: { "X-Admin-Key": key } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.hint || data.error || t("api.failed"));
    summary.textContent = JSON.stringify({
      updatedAt: data.updatedAt,
      summary: data.summary,
      providers: data.providers,
      ipDomainCandidates: data.ipDomainCandidates?.length || 0,
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
  $("#apiResourcesButton")?.addEventListener("click", loadProtectedResources);

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
      sessionStorage.setItem(API_KEY_SESSION, adminKey);
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

function apiKeyForWrite() {
  return sessionStorage.getItem(API_KEY_SESSION) || "";
}

function apiScopesForWrite() {
  const saved = readApiCookie();
  return saved?.scopes?.length ? saved.scopes : [];
}

function canManageBrand(slug) {
  const scopes = apiScopesForWrite();
  return Boolean(apiKeyForWrite()) && (scopes.includes("*") || scopes.includes(slug));
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
  const node = form.querySelector(`[data-profile-field="${name}"]`);
  return node ? node.value : "";
}

function profilePatchFromForm(form) {
  const keywords = fieldPatchValue(form, "theme.keywords")
    .split(/[,\n·]+/)
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
  const theme = brand.theme || {};
  return `
    <section class="profile-editor" id="profileEditor" data-brand="${escapeHtml(brand.slug)}" data-locked="true">
      <div class="profile-editor-head">
        <div>
          <p class="eyebrow">API</p>
          <h2>${escapeHtml(t("brand.editProfile"))}</h2>
        </div>
        <button class="button ghost" type="button" id="profileEditButton">${escapeHtml(t("brand.edit"))}</button>
      </div>
      <form class="profile-edit-form hidden" id="profileEditForm">
        <div class="profile-form-grid">
          <label><span>${escapeHtml(t("brand.name"))}</span><input data-profile-field="name" value="${escapeHtml(brand.name || "")}"></label>
          <label><span>${escapeHtml(t("brand.nativeName"))}</span><input data-profile-field="nativeName" value="${escapeHtml(brand.nativeName || "")}"></label>
          <label><span>${escapeHtml(t("brand.website"))}</span><input data-profile-field="officialWebsite" value="${escapeHtml(brand.officialWebsite || "")}"></label>
          <label><span>${escapeHtml(t("brand.mainLanguage"))}</span><select data-profile-field="mainLanguage">
            <option value="zh" ${(brand.mainLanguage || profile.mainLanguage) === "zh" ? "selected" : ""}>CN</option>
            <option value="en" ${(brand.mainLanguage || profile.mainLanguage) === "en" ? "selected" : ""}>EN</option>
          </select></label>
          <label class="span-2"><span>${escapeHtml(t("brand.description"))}</span><textarea data-profile-field="description" rows="2">${escapeHtml(brand.description || "")}</textarea></label>
          <label><span>${escapeHtml(t("brand.intro"))} · CN</span><textarea data-profile-field="intro.zh" rows="4">${escapeHtml(intro.zh || "")}</textarea></label>
          <label><span>${escapeHtml(t("brand.intro"))} · EN</span><textarea data-profile-field="intro.en" rows="4">${escapeHtml(intro.en || "")}</textarea></label>
          <label><span>${escapeHtml(t("brand.business"))} · CN</span><textarea data-profile-field="business.zh" rows="3">${escapeHtml(business.zh || "")}</textarea></label>
          <label><span>${escapeHtml(t("brand.business"))} · EN</span><textarea data-profile-field="business.en" rows="3">${escapeHtml(business.en || "")}</textarea></label>
          <label><span>${escapeHtml(t("brand.notes"))} · CN</span><textarea data-profile-field="notes.zh" rows="3">${escapeHtml(notes.zh || "")}</textarea></label>
          <label><span>${escapeHtml(t("brand.notes"))} · EN</span><textarea data-profile-field="notes.en" rows="3">${escapeHtml(notes.en || "")}</textarea></label>
          <label><span>Primary</span><input data-profile-field="theme.primary" value="${escapeHtml(theme.primary || "")}"></label>
          <label><span>Accent</span><input data-profile-field="theme.accent" value="${escapeHtml(theme.accent || "")}"></label>
          <label><span>Secondary</span><input data-profile-field="theme.secondary" value="${escapeHtml(theme.secondary || "")}"></label>
          <label class="span-2"><span>${escapeHtml(t("brand.keywords"))}</span><textarea data-profile-field="theme.keywords" rows="2">${escapeHtml((theme.keywords || []).join(" · "))}</textarea></label>
        </div>
        <div class="actions">
          <button class="button" type="submit" id="profileSaveButton">${escapeHtml(t("brand.saveProfile"))}</button>
          <button class="button ghost" type="button" id="profileCancelButton">${escapeHtml(t("brand.cancelEdit"))}</button>
        </div>
      </form>
      <p class="notice" id="profileEditStatus" aria-live="polite"></p>
    </section>
  `;
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
      const res = await fetch(`api/manage/brands/${encodeURIComponent(brand.slug)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": key,
        },
        body: JSON.stringify({
          message: `Update ${brand.slug} profile from IPTrust API`,
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
        if (!brand) throw new Error(`Unknown brand ${button.dataset.copyBrand}`);
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
  return `
    <section class="brand-assets" aria-label="Brand visual assets">
      <p class="eyebrow">${escapeHtml(t("brand.visualAssets"))}</p>
      <div class="brand-asset-strip">
        ${images.map((image) => `
          <a class="brand-asset" href="${escapeHtml(image.sitePath)}" title="${escapeHtml(image.title || image.path || "")}">
            <img src="${escapeHtml(image.sitePath)}" alt="${escapeHtml(image.title || "")}" loading="lazy">
          </a>
        `).join("")}
      </div>
    </section>
  `;
}

function endpointCard(label, href, code) {
  return `
    <a class="endpoint-card" href="${escapeHtml(href)}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(code)}</strong>
      <code>${escapeHtml(href)}</code>
    </a>
  `;
}

function brandAssetHub(brand = {}) {
  const key = brand.assetKey || brand.slug;
  const endpoints = brand.assetKit?.endpoints || {};
  return `
    <section class="asset-hub" aria-label="IP asset calls">
      <div class="asset-hub-head">
        <div>
          <p class="eyebrow">${escapeHtml(t("brand.assetHub"))}</p>
          <h2>${escapeHtml(t("brand.assetHub"))}</h2>
        </div>
        <div class="asset-key">${escapeHtml(t("brand.assetKey"))}: <code>${escapeHtml(key)}</code></div>
      </div>
      <div class="endpoint-grid">
        ${endpointCard(t("brand.brandJson"), endpoints.brand || brand.apiUrl, `get_brand`)}
        ${endpointCard(t("brand.imageAssets"), endpoints.images || brand.apiUrl, `images[]`)}
        ${endpointCard(t("brand.historyApi"), endpoints.history || brand.historyUrl, `versions[]`)}
        ${endpointCard(t("brand.agentUse"), brand.apiUrl, `get_brand({ "assetKey": "${key}" })`)}
      </div>
    </section>
  `;
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
  return `--mood-color:${escapeHtml(value)};--mood-ink:${ink}`;
}

function moodBoard(brand = {}) {
  const colors = palette(brand.theme).slice(0, 7);
  const keywords = brand.moodboard?.keywords?.length ? brand.moodboard.keywords : brand.theme?.keywords || [];
  return `
    <section class="mood-board" aria-label="Mood board">
      <div class="mood-head">
        <div>
          <p class="eyebrow">${escapeHtml(t("brand.moodBoard"))}</p>
          <h2>${escapeHtml(t("brand.moodBoard"))}</h2>
        </div>
        <div class="asset-key">${escapeHtml(t("brand.assetKey"))}: <code>${escapeHtml(brand.assetKey || brand.slug)}</code></div>
      </div>
      <div class="mood-grid">
        <div>
          <div class="mood-colors">
            ${colors.map(([label, value]) => `
              <div class="mood-color" style="${moodColorStyle(value)}">
                <strong>${escapeHtml(label)}</strong>
                <code>${escapeHtml(value)}</code>
              </div>
            `).join("")}
          </div>
          <div class="mood-keywords" aria-label="${escapeHtml(t("brand.keywords"))}">
            ${keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}
          </div>
        </div>
        <div>
          ${brandAssetStrip(brand.images || []) || `<p class="muted">${escapeHtml(t("brand.blank"))}</p>`}
        </div>
      </div>
    </section>
  `;
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
    panel.innerHTML = `<div class="global-result"><span>${escapeHtml(t("home.noResults"))}</span></div>`;
    return;
  }
  panel.classList.add("is-open");
  panel.innerHTML = results.map((item) => `
    <a class="global-result" href="${escapeHtml(item.url)}">
      <small>${escapeHtml(item.type)} · IP ID ${escapeHtml(item.slug)}</small>
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.subtitle || item.text || "")}</span>
    </a>
  `).join("");
}

async function renderHeroIndex() {
  const index = $("#heroIndex");
  if (!index) return;
  cachedBrands ??= await loadJson("api/brands.json");
  index.innerHTML = cachedBrands.map((brand, idx) => {
    const localized = mainBrand(brand);
    return `
      <div class="hero-index-row" data-brand="${escapeHtml(brand.slug)}" style="${themeStyle(brand.theme)};--row-index:${idx}">
        <a class="hero-index-link" href="${brand.url}">
          <span class="hero-index-title">${escapeHtml(localized.name)}${localized.secondaryName ? ` · ${escapeHtml(localized.secondaryName)}` : ""}</span>
        </a>
        ${colorDots(brand.theme)}
        <button class="icon-copy" type="button" data-icon-only="true" data-copy-brand="${escapeHtml(brand.slug)}" aria-label="${escapeHtml(t("copy.reference"))} ${escapeHtml(localized.name)}">${copyIcon()}</button>
      </div>
    `;
  }).join("");
  setupCopyButtons(cachedBrands);
}

async function renderVersions() {
  const list = $("#versionList");
  if (!list) return;
  cachedVersions ??= await loadJson("api/versions.json");
  if (!cachedVersions.length) {
    list.innerHTML = `<p class="muted">${escapeHtml(t("history.empty"))}</p>`;
    return;
  }
  list.innerHTML = cachedVersions.slice(0, 6).map((version) => `
    <a class="version-item" href="${escapeHtml(version.url)}">
      <strong>${escapeHtml(version.shortHash)}</strong>
      <span>${escapeHtml(version.message)}</span>
      <time>${escapeHtml(new Date(version.date).toLocaleDateString(localeMeta[currentLocale].dateLocale))}</time>
    </a>
  `).join("");
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
  if (count) count.textContent = currentQuery ? `${filtered.length}/${brands.length} IP` : `${brands.length} IP`;
  await renderGlobalResults(currentQuery);
  if (!filtered.length) {
    grid.innerHTML = `<p class="empty-state">${escapeHtml(t("home.noResults"))}</p>`;
    return;
  }
  grid.innerHTML = filtered.map((brand) => {
    const localized = mainBrand(brand);
    return `
    <article class="${cardClass(brand)}" data-brand="${escapeHtml(brand.slug)}" style="${themeStyle(brand.theme)}">
      <a class="ip-card-link" href="${brand.url}" aria-label="${escapeHtml(localized.name)}">
        <div class="card-body">
          <div class="card-art">
            <span class="art-code">ID · ${escapeHtml(brand.assetKey || brand.slug)}</span>
            <span class="art-metric">${brand.guideCount}G · ${brand.tokenCount}T</span>
          </div>
          <p class="eyebrow">${escapeHtml(statusLabel(brand.status))}</p>
          <h2>${escapeHtml(localized.name)}</h2>
          ${miniPalette(brand.theme)}
          <p class="muted alt-name">${escapeHtml(localized.secondaryName || "")}</p>
          <p class="card-intro">${escapeHtml(localized.intro || "")}</p>
          <div class="card-profile">
            <span>${escapeHtml(t("brand.mainLanguage"))}: ${escapeHtml(languageLabel(brand.mainLanguage || localized.language))}</span>
            <span>${escapeHtml(t("brand.business"))}: ${escapeHtml(localized.business || "")}</span>
          </div>
          <div class="meta">
            <span class="pill">${brand.guideCount} ${t("meta.guides")}</span>
            <span class="pill">API</span>
          </div>
        </div>
      </a>
      <button class="copy-reference icon-copy" type="button" data-icon-only="true" data-copy-brand="${escapeHtml(brand.slug)}" aria-label="${escapeHtml(t("copy.reference"))} ${escapeHtml(localized.name)}">${copyIcon()}</button>
    </article>
  `;
  }).join("");
  setupCopyButtons(filtered);
}

async function renderBrand() {
  const page = $("#brandPage");
  if (!page) return;
  const slug = new URLSearchParams(location.search).get("brand") || "tableai";
  const brand = await loadJson(`api/brands/${slug}.json`);
  const display = mainBrand(brand);
  const localized = localizedBrand(brand);
  document.title = `${display.name} · Brand Guidelines`;
  const hero = preferredBrandImage(brand.images || []);
  page.innerHTML = `
    <div class="brand-shell ${themeClass(brand.theme)}" style="${themeStyle(brand.theme)}">
      <section class="brand-hero">
        <div>
          <p class="eyebrow">${escapeHtml(statusLabel(brand.status))}</p>
          <h1>${escapeHtml(display.name)}</h1>
          <p class="muted alt-name">${escapeHtml(display.secondaryName || "")}</p>
          <p>${escapeHtml(localized.intro)}</p>
          ${swatches(brand.theme, true)}
          <div class="actions">
            <a class="button" href="${brand.apiUrl}">${t("brand.openJson")}</a>
            <a class="button ghost" href="${brand.source.github}">${t("brand.source")}</a>
          </div>
        </div>
        ${hero ? `<div class="brand-visual"><img src="${escapeHtml(hero.sitePath)}" alt="${escapeHtml(hero.title || display.name)}"></div>` : ""}
      </section>
      ${profileEditor(brand)}
      ${brandAssetHub(brand)}
      ${moodBoard(brand)}
      <section class="resource-list">
        <div class="resource-grid">
          <div class="resource"><strong>${t("brand.website")}</strong><br>${brand.officialWebsite ? `<a href="${escapeHtml(brand.officialWebsite)}">${escapeHtml(brand.officialWebsite)}</a>` : escapeHtml(t("brand.blank"))}</div>
          <div class="resource"><strong>${t("brand.mainLanguage")}</strong><br>${escapeHtml(languageLabel(brand.mainLanguage || brand.profile?.mainLanguage) || t("brand.blank"))}</div>
          <div class="resource"><strong>${t("brand.intro")}</strong><br>${escapeHtml(localized.intro || t("brand.blank"))}</div>
          <div class="resource"><strong>${t("brand.business")}</strong><br>${escapeHtml(localized.business || t("brand.blank"))}</div>
          <div class="resource"><strong>${t("brand.notes")}</strong><br>${escapeHtml(localized.notes || t("brand.blank"))}</div>
        </div>
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
  setupProfileEditor(brand);
}

applyI18n();
setupLanguageToggle();
setupSearch();
setupPortalActions();
setupApiConnect();
renderHeroIndex().catch(console.error);
renderIndex().catch(console.error);
renderBrand().catch(console.error);