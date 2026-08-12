const $ = (selector) => document.querySelector(selector);
const BUILD_VERSION = "bcd28bc-446d4675";

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
    "library.label": "知名品牌资产",
    "library.title": "权威品牌、案例与数据。",
    "library.organizations": "组织",
    "library.centralEnterprises": "中央企业",
    "library.modules": "关联模块",
    "status.documented": "已建档",
    "status.placeholder": "待建档",
    "meta.guides": "规范",
    "copy.reference": "复制",
    "copy.done": "已复制",
    "copy.copying": "正在复制…",
    "copy.selected": "已选中，请按 ⌘C / Ctrl+C 复制",
    "copy.fail": "复制失败",
    "copy.referenceDone": "已复制 IP Agent Reference",
    "copy.assetUrl": "复制资产地址",
    "copy.assetDone": "已复制资产地址",
    "copy.colorDone": "已复制色值",
    "copy.pantoneDone": "已复制 Pantone 近似值",
    "brand.openJson": "打开 JSON",
    "brand.copyAgentPack": "复制 Agent Pack",
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
    "portal.agentTitle": "调用品牌标准。",
    "portal.agentBody": "通过 MCP 或 JSON 获取主名称、品牌色、Logo、素材与出处。",
    "portal.agentAction": "复制 Agent Pack",
    "portal.agentCopied": "Agent Pack 已复制",
    "portal.copyMcp": "复制 MCP 配置",
    "portal.mcpCopied": "MCP 配置已复制",
    "portal.openAgentGuide": "Agent 指南",
    "portal.agentChecking": "检查 MCP",
    "portal.agentOnline": "MCP 在线",
    "portal.agentOffline": "REST 可用",
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
    "fonts.label": "字体参考",
    "fonts.title": "开源可商用字体。",
    "fonts.lead": "官方来源、明确许可证与真实网页样张，供品牌表达和 Agent 调用参考。",
    "fonts.chinese": "中文",
    "fonts.size": "字号",
    "fonts.weight": "字重",
    "fonts.source": "官方出处",
    "fonts.license": "许可证",
    "fonts.copyCss": "复制 CSS",
    "fonts.cssCopied": "已复制字体 CSS",
    "fonts.ready": "滚动到此处加载真实字体",
    "fonts.loading": "正在加载真实字体…",
    "fonts.loaded": "真实字体已加载",
    "fonts.fallback": "字体加载失败，已使用系统字体",
    "fonts.licenseNote": "授权说明",
    "fonts.openApi": "打开字体 JSON",
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
    "library.label": "KNOWN BRAND ASSETS",
    "library.title": "Authoritative brands, cases, and data.",
    "library.organizations": "Organizations",
    "library.centralEnterprises": "Central enterprises",
    "library.modules": "Linked modules",
    "status.documented": "Documented",
    "status.placeholder": "Pending",
    "meta.guides": "guides",
    "copy.reference": "Copy",
    "copy.done": "Copied",
    "copy.copying": "Copying…",
    "copy.selected": "Selected. Press Cmd/Ctrl+C to copy.",
    "copy.fail": "Failed",
    "copy.referenceDone": "IP Agent Reference copied",
    "copy.assetUrl": "Copy asset URL",
    "copy.assetDone": "Asset URL copied",
    "copy.colorDone": "Color copied",
    "copy.pantoneDone": "Pantone approximation copied",
    "brand.openJson": "Open JSON",
    "brand.copyAgentPack": "Copy Agent Pack",
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
    "portal.agentTitle": "Call the brand standard.",
    "portal.agentBody": "Use MCP or JSON for the primary name, exact colors, logo, assets, and provenance.",
    "portal.agentAction": "Copy Agent Pack",
    "portal.agentCopied": "Agent Pack copied",
    "portal.copyMcp": "Copy MCP config",
    "portal.mcpCopied": "MCP config copied",
    "portal.openAgentGuide": "Agent guide",
    "portal.agentChecking": "Checking MCP",
    "portal.agentOnline": "MCP online",
    "portal.agentOffline": "REST available",
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
    "fonts.label": "TYPE REFERENCE",
    "fonts.title": "Open-source commercial-use fonts.",
    "fonts.lead": "Official provenance, explicit licenses and live web specimens for brand work and Agent use.",
    "fonts.chinese": "Chinese",
    "fonts.size": "Size",
    "fonts.weight": "Weight",
    "fonts.source": "Official source",
    "fonts.license": "License",
    "fonts.copyCss": "Copy CSS",
    "fonts.cssCopied": "Font CSS copied",
    "fonts.ready": "Scroll here to load the live font",
    "fonts.loading": "Loading live font…",
    "fonts.loaded": "Live font loaded",
    "fonts.fallback": "Font failed to load; using the system fallback",
    "fonts.licenseNote": "License note",
    "fonts.openApi": "Open font JSON",
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
let fontCatalogCache = null;
let fontSpecimenObserver = null;

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
  applyFontLibraryLocale();
  setupAgentGateway();
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
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), attempt ? 9000 : 6500);
    try {
      const res = await fetch(url, { cache: attempt ? "reload" : "force-cache", signal: controller.signal });
      if (!res.ok) throw new Error(`Could not load ${path}: ${res.status}`);
      return await res.json();
    } catch (error) {
      lastError = error;
      if (!attempt) await new Promise((resolve) => setTimeout(resolve, 240));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error(`Could not load ${path}`);
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
    const match = String(asset.dimensions).match(/(d+)s*[x×]s*(d+)/i);
    if (match) {
      width = Number(match[1]);
      height = Number(match[2]);
    }
  }
  return width > 0 && height > 0 ? 'width="' + width + '" height="' + height + '"' : "";
}

function copyIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="2"></rect><path d="M5 15V7a2 2 0 0 1 2-2h8"></path></svg>`;
}

function themeStyle(theme = {}) {
  const isDark = theme.mode === "dark";
  const buttonText = theme.buttonText || (isDark ? theme.surface || "#14100A" : "#ffffff");
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
  if (brand.slug === "kaoyu-shenhua") return "火";
  if (brand.slug === "vanahom") return "V";
  if (brand.slug === "kind") return "K";
  if (brand.slug === "tableai") return "AI";
  return String(brand.name || brand.slug || "IP").slice(0, 2);
}

function cardClass(brand = {}) {
  return `ip-card ${themeClass(brand.theme)}`;
}

function cardHeroImage(brand = {}, localized = {}) {
  if (!brand.heroImage) return "";
  return `<img ${responsiveImageAttributes(brand.heroImage, [320, 640, 1280], "(max-width: 760px) 100vw, 33vw")} alt="${escapeHtml(localized.name || brand.name || "")}" loading="lazy" decoding="async">`;
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
    "Hub: " + new URL("/", location.origin).href,
    "Agent Entry: " + new URL("agent.json", location.origin + "/").href,
    "Manifest: " + new URL("api/manifest.json", location.href).href,
    "Search API: " + new URL("api/search.json", location.href).href,
    "MCP: " + new URL("mcp", location.href).href,
    `Skill: ${skillUrl}`,
    "",
    skill || "Use the IPTrust manifest and brand APIs to read each IP's latest name, colors, intro, business, language, and guideline files.",
  ].join("\n");
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
  const ipPageUrl = new URL(brand.url || `brand.html?brand=${brand.slug}`, location.href).href;
  const apiUrl = new URL(brand.apiUrl || `api/brands/${brand.slug}.json`, location.href).href;
  const historyUrl = new URL(brand.historyUrl || `api/history/${brand.slug}.json`, location.href).href;
  const schemaUrl = new URL("api/schema.json", location.href).href;
  const skillUrl = new URL("skills/iptrust-live-update/SKILL.md", document.baseURI).href;
  const mcpSource = new URL("mcp", location.origin + "/").href;
  const assetApiUrl = new URL(`api/v2/assets?ownerType=owned-ip&ownerId=${encodeURIComponent(brand.slug)}`, location.href).href;
  const preferredLogo = preferredBrandImage(brand.images || []);
  const logoPath = brand.logoUrl || preferredLogo?.sitePath || brand.heroImage || "";
  const logoUrl = logoPath ? new URL(logoPath, location.href).href : "TBD";
  const publicAssetUrls = (brand.images || []).map((image) => image.sitePath).filter(Boolean).map((path) => new URL(path, location.href).href);
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
    `Logo URL: ${logoUrl}`,
    `Official website: ${brand.officialWebsite || "TBD"}`,
    `Brand API: ${apiUrl}`,
    `Assets API: ${assetApiUrl}`,
    `History API: ${historyUrl}`,
    `Field schema: ${schemaUrl}`,
    `IPTrust Skill: ${skillUrl}`,
    `MCP endpoint: ${mcpSource}`,
    publicAssetUrls.length ? `Public assets:\n${publicAssetUrls.map((url) => "- " + url).join("\n")}` : "",
    "",
    "[Core]",
    `Intro: ${localized.intro || "TBD"}`,
    `Business: ${localized.business || "TBD"}`,
    `Tracks: ${listText(localized.classification.tracks) || "TBD"}`,
    `Audiences: ${listText(localized.classification.audiences) || "TBD"}`,
    `Tags: ${listText(localized.classification.tags) || "TBD"}`,
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

function ipSystemApplyText(brand = {}) {
  const localized = mainBrand(brand);
  const brandUrl = new URL(brand.url || `brand.html?brand=${brand.slug}`, location.href).href;
  const brandApi = new URL(brand.apiUrl || `api/brands/${brand.slug}.json`, location.href).href;
  const framework = new URL("ip_sys.md", location.href).href;
  return [
    "Apply Brand IP System v2",
    "",
    `IP: ${localized.name}`,
    `IP ID: ${brand.assetKey || brand.slug}`,
    `Main language: ${languageLabel(brand.mainLanguage || localized.language)}`,
    `Tracks: ${listText(localized.classification.tracks) || "TBD"}`,
    `Audiences: ${listText(localized.classification.audiences) || "TBD"}`,
    `Tags: ${listText(localized.classification.tags) || "TBD"}`,
    "",
    `Framework: ${framework}`,
    `Brand page: ${brandUrl}`,
    `Brand API: ${brandApi}`,
    "",
    "Instruction:",
    "Use Brand IP System v2 as the universal operating framework. Apply it to this IP's latest API fields, then produce: 0) brand architecture judgment, 1) IP core, 2) expression system, 3) asset ladder, 4) governance and measurement loop. Keep all recommendations aligned with the IP's main language, tracks, audiences, tags, colors, intro, business, and notes.",
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

function fontCatalogData() {
  if (fontCatalogCache) return fontCatalogCache;
  const node = $("#fontCatalogData");
  if (!node) return null;
  try {
    fontCatalogCache = JSON.parse(node.textContent || "{}");
  } catch (error) {
    console.warn("Font catalog could not be parsed.", error);
    fontCatalogCache = { fonts: [] };
  }
  return fontCatalogCache;
}

function applyFontLibraryLocale() {
  document.querySelectorAll("[data-font-zh][data-font-en]").forEach((node) => {
    node.textContent = currentLocale === "en" ? node.dataset.fontEn : node.dataset.fontZh;
  });
  document.querySelectorAll("[data-font-load-state]").forEach((node) => {
    node.textContent = t(node.dataset.fontState || "fonts.ready");
  });
}

function setFontLoadState(article, key) {
  const state = article.querySelector("[data-font-load-state]");
  if (!state) return;
  state.dataset.fontState = key;
  state.textContent = t(key);
}

async function loadFontSpecimen(article) {
  if (article.dataset.fontLoaded || article.hidden) return;
  const catalog = fontCatalogData();
  const font = catalog?.fonts?.find((item) => item.id === article.dataset.fontId);
  if (!font) {
    article.classList.add("is-fallback");
    setFontLoadState(article, "fonts.fallback");
    return;
  }
  article.dataset.fontLoaded = "loading";
  setFontLoadState(article, "fonts.loading");
  const alias = `IPTrustDemo-${font.id}`;
  const style = document.createElement("style");
  style.dataset.fontFace = font.id;
  style.textContent = font.assets.map((asset) => `@font-face{font-family:"${alias}";src:url("${String(asset.mediaUrl).replaceAll('"', "%22")}") format("woff2");font-style:${asset.style || "normal"};font-weight:${asset.weight};font-display:swap;}`).join("\\n");
  document.head.appendChild(style);
  article.style.setProperty("--demo-font", `"${alias}", ${font.cssStack}`);
  try {
    if (document.fonts?.load) {
      const weight = $("[data-font-weight]")?.value || "400";
      await Promise.race([
        document.fonts.load(`${weight} 32px "${alias}"`, font.sample.slice(0, 80)),
        new Promise((_, reject) => setTimeout(() => reject(new Error("font_timeout")), 7000)),
      ]);
    }
    article.dataset.fontLoaded = "true";
    article.classList.add("is-loaded");
    setFontLoadState(article, "fonts.loaded");
  } catch (error) {
    article.dataset.fontLoaded = "fallback";
    article.classList.add("is-fallback");
    setFontLoadState(article, "fonts.fallback");
    console.warn(`Font specimen failed: ${font.id}`, error);
  }
}

function setupFontLibrary() {
  const root = $("#open-source-type");
  if (!root || root.dataset.ready) return;
  root.dataset.ready = "true";
  const catalog = fontCatalogData();
  const specimens = [...root.querySelectorAll(".font-specimen")];
  const filterButtons = [...root.querySelectorAll("[data-font-filter]")];
  const size = root.querySelector("[data-font-size]");
  const sizeOutput = root.querySelector("[data-font-size-output]");
  const weight = root.querySelector("[data-font-weight]");

  const applyFilter = (group) => {
    filterButtons.forEach((button) => button.setAttribute("aria-selected", String(button.dataset.fontFilter === group)));
    specimens.forEach((article) => {
      article.hidden = article.dataset.fontGroup !== group;
      if (!article.hidden && !fontSpecimenObserver) loadFontSpecimen(article);
    });
  };

  filterButtons.forEach((button) => button.addEventListener("click", () => applyFilter(button.dataset.fontFilter)));
  size?.addEventListener("input", () => {
    root.style.setProperty("--font-demo-size", `${size.value}px`);
    if (sizeOutput) sizeOutput.textContent = size.value;
  });
  weight?.addEventListener("change", () => root.style.setProperty("--font-demo-weight", weight.value));
  root.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy-font]");
    if (!button) return;
    const font = catalog?.fonts?.find((item) => item.id === button.dataset.copyFont);
    if (!font) return;
    const result = await writeClipboardText(`font-family: ${font.cssStack};\nfont-weight: ${weight?.value || "400"};`);
    const message = result === "selected" ? t("copy.selected") : t("fonts.cssCopied");
    showToast(message);
    const previous = button.textContent;
    button.textContent = message;
    setTimeout(() => { button.textContent = previous; }, 1600);
  });

  if ("IntersectionObserver" in window) {
    fontSpecimenObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadFontSpecimen(entry.target);
        fontSpecimenObserver.unobserve(entry.target);
      });
    }, { rootMargin: "240px 0px" });
    specimens.forEach((article) => fontSpecimenObserver.observe(article));
  }

  applyFilter("zh");
  applyFontLibraryLocale();
}

async function copyReference(brand, button) {
  const previous = button.textContent;
  if (!button.dataset.iconOnly) button.textContent = t("copy.copying");
  button.classList.add("copying");
  button.setAttribute("aria-busy", "true");
  const result = await writeClipboardText(referenceText(brand));
  const message = feedbackMessage(result, "copy.referenceDone");
  if (!button.dataset.iconOnly) button.textContent = message;
  button.classList.remove("copying");
  button.dataset.feedback = message;
  button.classList.add("copied");
  button.removeAttribute("aria-busy");
  showToast(message);
  setTimeout(() => {
    if (!button.dataset.iconOnly) button.textContent = previous || t("copy.reference");
    button.classList.remove("copied");
    delete button.dataset.feedback;
  }, 1200);
}

function mcpConfigText() {
  return JSON.stringify({
    mcpServers: {
      iptrust: {
        type: "http",
        url: new URL("mcp", location.origin + "/").href,
      },
    },
  }, null, 2);
}

function setupAgentGateway() {
  const copyButton = document.querySelector("[data-copy-mcp-config]");
  if (copyButton && !copyButton.dataset.ready) {
    copyButton.dataset.ready = "true";
    copyButton.addEventListener("click", async () => {
      const result = await writeClipboardText(mcpConfigText());
      const message = result === "selected" ? t("copy.selected") : t("portal.mcpCopied");
      copyButton.classList.add("copied");
      showToast(message);
      const statusNode = document.querySelector('[data-portal-status="agent"]');
      if (statusNode) statusNode.textContent = message;
      setTimeout(() => copyButton.classList.remove("copied"), 1000);
    });
  }
  const health = document.querySelector("[data-agent-health]");
  if (!health) return;
  const label = health.querySelector("span");
  if (health.dataset.state === "online" && label) label.textContent = t("portal.agentOnline");
  if (health.dataset.state === "fallback" && label) label.textContent = t("portal.agentOffline");
  if (health.dataset.ready) return;
  health.dataset.ready = "true";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3600);
  fetch(new URL("mcp", location.origin + "/"), {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok) throw new Error("MCP unavailable");
      health.dataset.state = "online";
      health.classList.add("is-online");
      if (label) label.textContent = t("portal.agentOnline");
    })
    .catch(() => {
      health.dataset.state = "fallback";
      if (label) label.textContent = t("portal.agentOffline");
    })
    .finally(() => clearTimeout(timeout));
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
    `curl -X POST "${new URL("api/v2/auth/exchange", location.href).href}"`,
    `  -H "Content-Type: application/json"`,
    `  -d '{"apiKey":"<SYSTEM_API_KEY>","totp":"<TOTP>"}'`,
  ].join("\n");
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
    scopeText.textContent = scopes.includes("system:*") || ipScopes.includes("*") ? t("api.allAccess") : `${t("api.scopesGranted")}${ipScopes.join(", ")}`;
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
  const node = form.querySelector(`[data-profile-field="${name}"]`);
  return node ? node.value : "";
}

function fieldListValue(form, name) {
  return fieldPatchValue(form, name)
    .split(/[,\n·]+/)
    .map((item) => item.trim())
    .filter(Boolean);
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
          <label><span>${escapeHtml(t("brand.tracks"))} · CN</span><textarea data-profile-field="classification.tracks.zh" rows="2">${escapeHtml((classification.tracks?.zh || []).join(" · "))}</textarea></label>
          <label><span>${escapeHtml(t("brand.tracks"))} · EN</span><textarea data-profile-field="classification.tracks.en" rows="2">${escapeHtml((classification.tracks?.en || []).join(" · "))}</textarea></label>
          <label><span>${escapeHtml(t("brand.audiences"))} · CN</span><textarea data-profile-field="classification.audiences.zh" rows="2">${escapeHtml((classification.audiences?.zh || []).join(" · "))}</textarea></label>
          <label><span>${escapeHtml(t("brand.audiences"))} · EN</span><textarea data-profile-field="classification.audiences.en" rows="2">${escapeHtml((classification.audiences?.en || []).join(" · "))}</textarea></label>
          <label><span>${escapeHtml(t("brand.tags"))} · CN</span><textarea data-profile-field="classification.tags.zh" rows="2">${escapeHtml((classification.tags?.zh || []).join(" · "))}</textarea></label>
          <label><span>${escapeHtml(t("brand.tags"))} · EN</span><textarea data-profile-field="classification.tags.en" rows="2">${escapeHtml((classification.tags?.en || []).join(" · "))}</textarea></label>
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
      const current = await fetch(`api/v2/brands/${encodeURIComponent(brand.slug)}`, { credentials: "include" });
      if (!current.ok) throw new Error(t("brand.saveFailed"));
      const etag = current.headers.get("etag");
      const res = await fetch(`api/v2/brands/${encodeURIComponent(brand.slug)}`, {
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

function setupAssetCopyButtons() {
  document.querySelectorAll("[data-copy-asset-url]").forEach((button) => {
    if (button.dataset.ready) return;
    button.dataset.ready = "true";
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.classList.add("copying");
      button.setAttribute("aria-busy", "true");
      button.title = t("copy.copying");
      const assetUrl = new URL(button.dataset.copyAssetUrl, location.href).href;
      const result = await writeClipboardText(assetUrl);
      button.classList.remove("copying");
      button.removeAttribute("aria-busy");
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
  return `
    <section class="brand-assets" aria-label="Brand visual assets">
      <p class="eyebrow">${escapeHtml(t("brand.visualAssets"))}</p>
      <div class="brand-asset-strip">
        ${images.map((image) => `
          <div class="brand-asset" title="${escapeHtml(image.title || image.path || "")}">
            <a class="brand-asset-link ${image.colorway ? `asset-colorway-${escapeHtml(image.colorway)}` : ""}" href="${escapeHtml(image.sitePath)}">
              <img ${responsiveImageAttributes(image.sitePath, [320, 640, 1280], "(max-width: 760px) 54vw, 240px")} alt="${escapeHtml(image.title || "")}" loading="lazy" decoding="async">
            </a>
            <button class="asset-copy-button icon-copy" type="button" data-icon-only="true" data-copy-asset-url="${escapeHtml(image.sitePath)}" aria-label="${escapeHtml(t("copy.assetUrl"))}">${copyIcon()}</button>
            <div class="brand-asset-info">
              <span class="brand-asset-name">${escapeHtml(image.title || image.path || "Asset")}</span>
              <span class="brand-asset-meta">
                ${image.format ? `<span>${escapeHtml(image.format)}</span>` : ""}
                ${image.size ? `<span>${escapeHtml(image.size)}</span>` : ""}
                ${image.dimensions ? `<span class="brand-asset-dimensions">${escapeHtml(image.dimensions.replace(" x ", " × "))}</span>` : ""}
              </span>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function adobeAssetPanel(adobeAssets = []) {
  if (!adobeAssets.length) return "";
  return `
    <section class="adobe-assets" aria-label="Adobe source assets">
      <div class="adobe-assets-head">
        <div><p class="eyebrow">ADOBE</p><h2>${escapeHtml(t("brand.adobeAssets"))}</h2></div>
        <span class="asset-key">AI / EPS / PS / PDF / PSD</span>
      </div>
      ${adobeAssets.map((asset) => `
        <article class="adobe-source-file">
          <div class="adobe-source-preview">
            ${asset.preview?.sitePath ? `<img ${responsiveImageAttributes(asset.preview.sitePath, [320, 640, 1280], "(max-width: 760px) 100vw, 42vw")} alt="${escapeHtml(asset.title || "Adobe asset")}" loading="lazy" decoding="async">` : ""}
            ${asset.preview?.sitePath ? `<button class="asset-copy-button icon-copy" type="button" data-icon-only="true" data-copy-asset-url="${escapeHtml(asset.preview.sitePath)}" aria-label="${escapeHtml(t("copy.assetUrl"))}">${copyIcon()}</button>` : ""}
          </div>
          <div class="adobe-source-body">
            <p class="eyebrow">${escapeHtml(asset.source?.format || "ADOBE")}</p>
            <h3>${escapeHtml(asset.title || asset.id || "Adobe asset")}</h3>
            <p class="adobe-source-meta">${escapeHtml([asset.source?.format, asset.source?.size, asset.pipeline].filter(Boolean).join(" · "))}</p>
            <div class="adobe-downloads">
              ${asset.source?.sitePath ? `<a href="${escapeHtml(asset.source.sitePath)}" download>${escapeHtml(t("brand.original"))}</a>` : ""}
              ${asset.preview?.sitePath ? `<a href="${escapeHtml(asset.preview.sitePath)}" target="_blank">${escapeHtml(t("brand.preview"))}</a>` : ""}
              ${(asset.exports || []).flatMap((page) => [
                page.png?.sitePath ? `<a href="${escapeHtml(page.png.sitePath)}" download>p${page.page} · ${escapeHtml(t("brand.exportPng"))}</a>` : "",
                page.jpg?.sitePath ? `<a href="${escapeHtml(page.jpg.sitePath)}" download>p${page.page} · ${escapeHtml(t("brand.exportJpg"))}</a>` : "",
              ]).filter(Boolean).join("")}
            </div>
          </div>
        </article>
      `).join("")}
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
        ${endpoints.adobe ? endpointCard(t("brand.adobeAssets"), endpoints.adobe, `adobeAssets[]`) : ""}
        ${endpointCard(t("brand.historyApi"), endpoints.history || brand.historyUrl, `versions[]`)}
        ${endpointCard(t("brand.ipSystem"), "ip-evolution", `apply_ip_system`)}
        ${endpointCard(t("brand.agentUse"), brand.apiUrl, `get_brand({ "assetKey": "${key}" })`)}
      </div>
    </section>
  `;
}

function ipSystemPanel(brand = {}) {
  return `
    <section class="ip-system-panel" aria-label="IP System">
      <div class="ip-system-head">
        <div>
          <p class="eyebrow">${escapeHtml(t("brand.ipSystem"))}</p>
          <h2>${escapeHtml(t("brand.ipSystem"))}</h2>
        </div>
        <div class="actions">
          <a class="button ghost" href="ip-evolution">${escapeHtml(t("brand.openIpSystem"))}</a>
          <button class="button" type="button" data-apply-ip-system="${escapeHtml(brand.slug)}">${escapeHtml(t("brand.copyIpSystem"))}</button>
        </div>
      </div>
      <p>${escapeHtml(t("brand.ipSystemBody"))}</p>
    </section>
  `;
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
          <span class="hero-index-title">${escapeHtml(localized.name)}${localized.secondaryName ? ` <span class="hero-index-secondary">· ${escapeHtml(localized.secondaryName)}</span>` : ""}</span>
        </a>
        ${colorDots(brand.theme)}
        <button class="icon-copy" type="button" data-icon-only="true" data-copy-brand="${escapeHtml(brand.slug)}" aria-label="${escapeHtml(t("copy.reference"))} ${escapeHtml(localized.name)}">${copyIcon()}</button>
      </div>
    `;
  }).join("");
  index.scrollTop = 0;
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
            ${cardHeroImage(brand, localized)}
            <span class="art-code">${escapeHtml(brand.assetKey || brand.slug)}</span>
          </div>
          <p class="eyebrow">${escapeHtml(statusLabel(brand.status))}</p>
          <h2>${escapeHtml(localized.name)}</h2>
          ${miniPalette(brand.theme)}
          <p class="muted alt-name">${escapeHtml(localized.secondaryName || "")}</p>
          <p class="card-intro">${escapeHtml(localized.intro || "")}</p>
          <div class="card-profile">
            <span>${escapeHtml(t("brand.mainLanguage"))}: ${escapeHtml(languageLabel(brand.mainLanguage || localized.language))}</span>
            <span>${escapeHtml(t("brand.tracks"))}: ${escapeHtml(listText(localized.classification.tracks))}</span>
            <span>${escapeHtml(t("brand.audiences"))}: ${escapeHtml(listText(localized.classification.audiences))}</span>
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
  const isSidera = brand.slug === "sidera";
  const isKaoyu = brand.slug === "kaoyu-shenhua";
  const heroName = isSidera ? "侍天" : display.name;
  const heroSecondaryName = isSidera ? "智慧餐饮 · tiansight" : isKaoyu ? "KAOYUSHENHUA · 一炉火，烧了三十多年" : display.secondaryName;
  const heroEyebrow = isSidera ? "智慧领航者 · WISDOM NAVIGATOR" : isKaoyu ? (currentLocale === "en" ? "Charcoal fire · Live fish · No prefab" : "老灶火 · 活鱼现烤 · 无预制") : statusLabel(brand.status);
  const sideraPrinciples = currentLocale === "en" ? ["SEE CLEARLY", "MOVE DECISIVELY", "COMPOUND VALUE"] : ["看得清", "改得动", "能复利"];
  const kaoyuPrinciples = currentLocale === "en"
    ? ["Live fish, grilled to order", "Home cooking, wok-hot", "No prefab dishes"]
    : ["活鱼现点现烤", "家常菜现炒现做", "全店无预制菜"];
  const kaoyuSlogan = currentLocale === "en"
    ? "Thirty-plus years of plain truth becomes the myth."
    : "把实话坚持三十多年，就成了神话。";
  const kaoyuStoryLead = currentLocale === "en"
    ? "Since 1990 at the stove, since 2015 in Changping, Beijing — one live fish, one charcoal fire, one plain promise for the neighborhood."
    : "1990年入行，2015年落地北京昌平。一条活鱼，一炉旺火，一句实在话——让街坊吃口新鲜的、热乎的。";
  document.title = `${display.name} · Brand Guidelines`;
  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) descriptionMeta.setAttribute("content", localized.intro || brand.description || "IPTrust brand guideline and assets.");
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute("href", new URL(`brand?brand=${encodeURIComponent(brand.slug)}`, location.origin + "/").href);
  const hero = brand.adobeAssets?.[0]?.hero?.sitePath
    ? brand.adobeAssets[0].hero
    : preferredBrandImage(brand.images || []);
  page.innerHTML = `
    <div class="brand-shell ${themeClass(brand.theme)} brand-${escapeHtml(brand.slug)}" style="${themeStyle(brand.theme)}">
      <section class="brand-hero">
        <div>
          <p class="eyebrow">${escapeHtml(heroEyebrow)}</p>
          <h1>${escapeHtml(heroName)}</h1>
          <p class="muted alt-name">${escapeHtml(heroSecondaryName || "")}</p>
          <p>${escapeHtml(localized.intro)}</p>
          <div class="profile-tags">
            ${display.classification.tracks.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
            ${display.classification.audiences.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
          ${swatches(brand.theme, true)}
          <div class="actions">
            ${isKaoyu ? `<a class="button" href="kaoyu-shenhua/">${currentLocale === "en" ? "Brand story" : "品牌故事"}</a>` : ""}
            <button class="button" type="button" data-copy-brand="${escapeHtml(brand.slug)}">${escapeHtml(t("brand.copyAgentPack"))}</button>
            <a class="button${isKaoyu ? " ghost" : ""}" href="${brand.apiUrl}">${t("brand.openJson")}</a>
            <a class="button ghost" href="${brand.source.github}">${t("brand.source")}</a>
          </div>
        </div>
        ${hero ? `
          <div class="brand-visual">
            <img ${responsiveImageAttributes(hero.sitePath, [640, 1280, 2400], "(max-width: 900px) 100vw, 52vw")} ${imageDimensionAttributes(hero)} alt="${escapeHtml(hero.title || display.name)}" loading="eager" fetchpriority="high" decoding="async">
            <button class="asset-copy-button icon-copy" type="button" data-icon-only="true" data-copy-asset-url="${escapeHtml(hero.sitePath)}" aria-label="${escapeHtml(t("copy.assetUrl"))}">${copyIcon()}</button>
            <div class="brand-visual-meta">
              <strong>${escapeHtml(hero.title || display.name)}</strong>
              <span>${escapeHtml([hero.format, hero.size].filter(Boolean).join(" · "))}</span>
              ${hero.dimensions ? `<span>${escapeHtml(hero.dimensions.replace(" x ", " × "))}</span>` : ""}
            </div>
          </div>
        ` : isSidera ? `
          <div class="brand-visual sidera-compass-visual" role="img" aria-label="侍天智慧领航罗盘">
            <div class="sidera-compass-ring" aria-hidden="true"><div class="sidera-compass-core"><span class="sidera-compass-mark">侍</span></div></div>
            <span class="sidera-seal" aria-hidden="true">侍天</span>
            <p class="sidera-compass-caption">TIANSIGHT / WISDOM NAVIGATOR</p>
          </div>
        ` : isKaoyu ? `
          <div class="brand-visual kaoyu-fire-visual" role="img" aria-label="烤鱼神话炉火">
            <span class="kaoyu-fire-mark">火</span>
            <p class="kaoyu-fire-caption">KAOYUSHENHUA / CHARCOAL FIRE</p>
          </div>
        ` : ""}
      </section>
      ${isSidera ? `<section class="sidera-principles">${sideraPrinciples.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</section>` : ""}
      ${isKaoyu ? `
        <section class="kaoyu-principles">${kaoyuPrinciples.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</section>
        <section class="kaoyu-story" id="kaoyu-story">
          <h2>${currentLocale === "en" ? "One fire, thirty-plus years" : "一炉火，烧了三十多年"}</h2>
          <p class="lead">${escapeHtml(kaoyuStoryLead)}</p>
          <p class="slogan">${escapeHtml(kaoyuSlogan)}</p>
          <div class="kaoyu-story-links actions">
            <a class="button" href="kaoyu-shenhua/">${currentLocale === "en" ? "Open story page" : "打开故事页"}</a>
            <a class="button ghost" href="#kaoyu-shenhua-guide-1-品牌叙事-完整版">${currentLocale === "en" ? "Full narrative" : "完整版叙事"}</a>
          </div>
        </section>
      ` : ""}
      ${profileEditor(brand)}
      <section class="brand-architecture" id="brandArchitecture" aria-live="polite"></section>
      ${ipSystemPanel(brand)}
      ${brandAssetHub(brand)}
      ${adobeAssetPanel(brand.adobeAssets || [])}
      ${moodBoard(brand)}
      <section class="resource-list">
        <div class="resource-grid">
          <div class="resource"><strong>${t("brand.website")}</strong><br>${brand.officialWebsite ? `<a href="${escapeHtml(brand.officialWebsite)}">${escapeHtml(brand.officialWebsite)}</a>` : escapeHtml(t("brand.blank"))}</div>
          <div class="resource"><strong>${t("brand.mainLanguage")}</strong><br>${escapeHtml(languageLabel(brand.mainLanguage || brand.profile?.mainLanguage) || t("brand.blank"))}</div>
          <div class="resource"><strong>${t("brand.intro")}</strong><br>${escapeHtml(localized.intro || t("brand.blank"))}</div>
          <div class="resource"><strong>${t("brand.business")}</strong><br>${escapeHtml(localized.business || t("brand.blank"))}</div>
          <div class="resource"><strong>${t("brand.notes")}</strong><br>${escapeHtml(localized.notes || t("brand.blank"))}</div>
          <div class="resource"><strong>${t("brand.tracks")}</strong><br>${escapeHtml(listText(display.classification.tracks) || t("brand.blank"))}</div>
          <div class="resource"><strong>${t("brand.audiences")}</strong><br>${escapeHtml(listText(display.classification.audiences) || t("brand.blank"))}</div>
          <div class="resource"><strong>${t("brand.tags")}</strong><br>${escapeHtml(listText(display.classification.tags) || t("brand.blank"))}</div>
        </div>
        <div class="resource"><strong>${t("brand.colors")}</strong><br>${escapeHtml(brand.theme?.keywords?.join(" · ") || "")}</div>
        <div class="resource"><strong>${t("brand.editable")}</strong><br>${brand.editablePaths?.map(escapeHtml).join("<br>") || t("brand.noneGuide")}</div>
        <div class="resource"><strong>${t("brand.tokens")}</strong><br>${brand.tokens?.map((token) => escapeHtml(token.path)).join("<br>") || t("brand.noneTokens")}</div>
      </section>
      ${brand.guides?.map((guide) => `
        <article class="guide guide-rendered">
          <p class="eyebrow">${escapeHtml(t("brand.guideline"))}</p>
          <div class="rendered-document brand-guide-document">${guide.html || ("<p>" + escapeHtml(guide.excerpt || "") + "</p>")}</div>
        </article>
      `).join("") || ""}
    </div>
  `;
  page.setAttribute("aria-busy", "false");
  setupCopyButtons([brand]);
  setupProfileEditor(brand);
  setupIpSystemPanel(brand);
  setupAssetCopyButtons();
  renderBrandArchitecture(slug).catch(console.error);
}

function renderBrandFailure(error) {
  console.error(error);
  const page = $("#brandPage");
  if (!page) return;
  page.setAttribute("aria-busy", "false");
  page.innerHTML = `
    <section class="brand-load-error" role="alert">
      <p>IPTrust · Connection</p>
      <h1>载入中断。</h1>
      <p>Brand data could not be loaded.</p>
      <button class="button" type="button" id="brandReload">重新载入 · Retry</button>
    </section>
  `;
  $("#brandReload")?.addEventListener("click", () => location.reload());
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
  return `<option value="">${escapeHtml(empty)}</option>${items.map((item) => `<option value="${escapeHtml(item.id)}" ${active === item.id ? "selected" : ""}>${escapeHtml(taxonomyLabel(item))}</option>`).join("")}`;
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
  page.innerHTML = `
    <header class="directory-hero"><p class="eyebrow">IPTrust Directory</p><h1>${currentLocale === "en" ? "IP, clearly structured." : "IP，一目了然。"}</h1><p>${data.ips.length} IP · ${data.applications.length} ${currentLocale === "en" ? "applications" : "项目应用"}</p></header>
    <form class="directory-filters" id="directoryFilters">
      <input name="q" value="${escapeHtml(params.get("q") || "")}" placeholder="${currentLocale === "en" ? "Search IP" : "搜索 IP"}">
      <select name="industry">${selectOptions(data.taxonomy.industries || [], industry, currentLocale === "en" ? "All industries" : "全部行业")}</select>
      <select name="type">${selectOptions(data.taxonomy.ipTypes || [], ipType, currentLocale === "en" ? "All IP types" : "全部类型")}</select>
      <select name="architectureRole"><option value="">${currentLocale === "en" ? "All architecture roles" : "全部架构"}</option><option value="parent" ${architectureRole === "parent" ? "selected" : ""}>${currentLocale === "en" ? "Parent IP" : "母 IP"}</option><option value="child" ${architectureRole === "child" ? "selected" : ""}>${currentLocale === "en" ? "Child IP" : "子 IP"}</option><option value="standalone" ${architectureRole === "standalone" ? "selected" : ""}>${currentLocale === "en" ? "Standalone" : "独立 IP"}</option></select>
      <select name="parent"><option value="">${currentLocale === "en" ? "All parent IPs" : "全部母 IP"}</option>${parentIps.map((ip) => `<option value="${ip.slug}" ${parent === ip.slug ? "selected" : ""}>${escapeHtml(primaryIpName(ip))}</option>`).join("")}</select>
      <button type="submit">${currentLocale === "en" ? "Apply" : "筛选"}</button>
    </form>
    <section class="directory-list">${filtered.map((ip) => {
      const parentIp = data.ips.find((candidate) => candidate.slug === parents.get(ip.slug));
      const href = ip.recordClass === "owned" ? (ip.url || `brand.html?brand=${ip.slug}`) : `ip?ip=${ip.slug}`;
      return `<a class="directory-row" href="${escapeHtml(href)}"><span class="directory-name"><strong>${escapeHtml(primaryIpName(ip))}</strong>${secondaryIpName(ip) ? `<small>${escapeHtml(secondaryIpName(ip))}</small>` : ""}</span><span>${escapeHtml(taxonomyLabel((data.taxonomy.industries || []).find((item) => item.id === ip.primaryIndustry)))}</span><span>${escapeHtml(taxonomyLabel((data.taxonomy.ipTypes || []).find((item) => item.id === ip.ipType)))}</span><span>${parentIp ? `↳ ${escapeHtml(primaryIpName(parentIp))}` : ""}</span><b>↗</b></a>`;
    }).join("") || `<p class="empty-state">${escapeHtml(t("home.noResults"))}</p>`}</section>
    <section class="application-directory"><header><p class="eyebrow">Applications</p><h2>${currentLocale === "en" ? "Project applications" : "项目应用"}</h2></header>${data.applications.map((app) => `<a href="application?application=${escapeHtml(app.slug)}"><strong>${escapeHtml(app.mainLanguage === "en" ? (app.names?.en || app.names?.zh) : (app.names?.zh || app.names?.en))}</strong><span>${escapeHtml(app.applicationType)}</span><b>↗</b></a>`).join("")}</section>
  `;
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
  try { return await loadJson(`api/v2/ips/${encodeURIComponent(slug)}/graph`); } catch { return fallbackGraph(slug); }
}

async function renderIpRecord() {
  const page = $("#ipRecordPage");
  if (!page) return;
  const slug = new URLSearchParams(location.search).get("ip") || "";
  const graph = await loadGraph(slug);
  if (!graph) { page.innerHTML = `<p class="empty-state">IP not found.</p>`; return; }
  const ip = graph.ip;
  page.innerHTML = `<article class="record-detail"><p class="eyebrow">${escapeHtml(ip.recordClass)} · ${escapeHtml(ip.ipType)}</p><h1>${escapeHtml(primaryIpName(ip))}</h1><p class="record-secondary">${escapeHtml(secondaryIpName(ip))}</p><div class="record-facts"><span>${escapeHtml(ip.primaryIndustry)}</span><span>${escapeHtml(ip.lifecycleStatus)}</span><span>${escapeHtml(ip.guidelineMode)}</span></div>${ip.sourceUrl ? `<a class="button" href="${escapeHtml(ip.sourceUrl)}" rel="noreferrer">Official source ↗</a>` : ""}</article>${graph.parents?.length ? `<section class="lineage-block"><p class="eyebrow">Parent IP</p>${graph.parents.map((relation) => `<a href="ip?ip=${relation.parent}">${escapeHtml(relation.parentNames?.zh || relation.parentNames?.en || relation.parent)}</a>`).join("")}</section>` : ""}${graph.children?.length ? `<section class="lineage-block"><p class="eyebrow">Child IP</p>${graph.children.map((relation) => `<a href="ip?ip=${relation.child}">${escapeHtml(relation.childNames?.zh || relation.childNames?.en || relation.child)}</a>`).join("")}</section>` : ""}${graph.applications?.length ? `<section class="lineage-block"><p class="eyebrow">Applications</p>${graph.applications.map((app) => `<a href="application?application=${app.slug}">${escapeHtml(primaryIpName(app))}</a>`).join("")}</section>` : ""}`;
}

async function renderApplicationPage() {
  const page = $("#applicationPage");
  if (!page) return;
  const slug = new URLSearchParams(location.search).get("application") || "";
  const ipSystemData = await loadIpSystem();
  let app;
  try { app = await loadJson(`api/v2/applications/${encodeURIComponent(slug)}`); } catch { app = ipSystemData.applications.find((item) => item.slug === slug); }
  if (!app) { page.innerHTML = `<p class="empty-state">Application not found.</p>`; return; }
  const title = app.mainLanguage === "en" ? (app.names?.en || app.names?.zh) : (app.names?.zh || app.names?.en);
  const primary = app.links?.find((link) => link.role === "primary")?.ip || "";
  const primaryRecord = ipSystemData.ips.find((item) => item.slug === primary);
  page.innerHTML = `<article class="record-detail"><p class="eyebrow">${escapeHtml(app.applicationType)} · Application</p><h1>${escapeHtml(title)}</h1><p class="record-secondary">${escapeHtml(app.description?.[currentLocale === "en" ? "en" : "zh"] || app.description?.zh || app.description?.en || "")}</p><div class="record-facts"><a href="ip?ip=${escapeHtml(primary)}">Primary IP · ${escapeHtml(primaryRecord ? primaryIpName(primaryRecord) : primary)}</a><span>${escapeHtml(app.guidelineMode)} guidelines</span><span>${escapeHtml([app.location?.province, app.location?.city].filter(Boolean).join(" · "))}</span></div></article>`;
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
  node.innerHTML = `<header><p class="eyebrow">Architecture</p><h2>${currentLocale === "en" ? "Brand lineage" : "品牌谱系"}</h2></header><div class="lineage-grid">${graph.parents.map((relation) => `<a href="ip?ip=${relation.parent}"><small>Parent IP</small><strong>${escapeHtml(relation.parentNames?.zh || relation.parentNames?.en || relation.parent)}</strong></a>`).join("")}${graph.children.map((relation) => `<a href="ip?ip=${relation.child}"><small>Child IP</small><strong>${escapeHtml(relation.childNames?.zh || relation.childNames?.en || relation.child)}</strong></a>`).join("")}${graph.applications.map((app) => `<a href="application?application=${app.slug}"><small>Application</small><strong>${escapeHtml(app.names?.zh || app.names?.en || app.slug)}</strong></a>`).join("")}</div>`;
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
setupAgentGateway();
setupApiConnect();
setupFontLibrary();
renderHeroIndex().catch(console.error);
renderIndex().catch(console.error);
renderBrand().catch(renderBrandFailure);
renderDirectory().catch(console.error);
renderIpRecord().catch(console.error);
renderApplicationPage().catch(console.error);
setupWebVitals();