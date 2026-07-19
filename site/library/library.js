const initialParams = new URLSearchParams(location.search);
const initialType = ["organizations", "cases", "reports", "datasets"].includes(initialParams.get("type")) ? initialParams.get("type") : "organizations";
const state = {
  type: initialType,
  q: initialParams.get("q")?.trim() || "",
  source: initialParams.get("source")?.trim() || "",
  offset: 0,
  limit: 60,
  total: 0,
  items: [],
  locale: localStorage.getItem("iptrust-locale") === "en" ? "en" : "cn",
};
const $ = (selector) => document.querySelector(selector);
let searchTimer;

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function copy(cn, en) { return state.locale === "en" ? en : cn; }
function initials(name = "") { return name.trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join("").slice(0, 2).toUpperCase() || "IP"; }

async function fetchLibrary() {
  const params = new URLSearchParams({ limit: state.limit, offset: state.offset });
  if (state.q) params.set("q", state.q);
  if (state.source && state.type === "organizations") params.set("source", state.source);
  const dynamicUrl = `../api/library/${state.type}?${params}`;
  try {
    const response = await fetch(dynamicUrl, { cache: "no-cache" });
    if (!response.ok || !(response.headers.get("content-type") || "").includes("json")) throw new Error("dynamic unavailable");
    return response.json();
  } catch {
    const response = await fetch(`../api/library/${state.type}.json`, { cache: "no-cache" });
    let items = response.ok ? await response.json() : [];
    if (state.q) items = items.filter((item) => JSON.stringify(item).toLowerCase().includes(state.q.toLowerCase()));
    if (state.source && state.type === "organizations") items = items.filter((item) => item.sourceId === state.source);
    return { total: items.length, items: items.slice(state.offset, state.offset + state.limit), storage: "git-snapshot" };
  }
}

function mark(item) {
  const src = item.logoUrl || item.logoSourceUrl;
  return `<span class="organization-mark">${src ? `<img src="${escapeHtml(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove();this.parentElement.textContent='${escapeHtml(initials(item.name))}'">` : escapeHtml(initials(item.name))}</span>`;
}

function organizationCard(item) {
  return `<button class="organization-card" type="button" data-library-id="${escapeHtml(item.id)}">
    <span class="organization-card-head">${mark(item)}<span class="organization-rank">${item.rank ? `#${item.rank}` : "—"}</span></span>
    <h2>${escapeHtml(item.name)}</h2>
    <p>${escapeHtml(item.description || copy("资料待核验补充。", "Profile pending verification."))}</p>
    <span class="organization-meta"><span>${escapeHtml(item.industry || item.country || "—")}</span><span>${escapeHtml(item.year || "")}</span></span>
  </button>`;
}

function itemCard(item) {
  const title = item.title?.[state.locale === "en" ? "en" : "zh"] || item.title?.zh || item.title?.en || item.slug;
  const summary = item.summary?.[state.locale === "en" ? "en" : "zh"] || item.summary?.zh || item.summary?.en || "";
  return `<button class="organization-card" type="button" data-library-id="${escapeHtml(item.id)}">
    <span class="organization-card-head"><span class="organization-mark">${escapeHtml(item.type?.slice(0, 2).toUpperCase())}</span><span class="organization-rank">${escapeHtml(item.access || "metadata")}</span></span>
    <h2>${escapeHtml(title)}</h2><p>${escapeHtml(summary)}</p><span class="organization-meta"><span>${escapeHtml(item.sourcePublisher || "—")}</span><span>${escapeHtml(item.publishedAt || "")}</span></span>
  </button>`;
}

function render() {
  const grid = $("#libraryGrid");
  if (!state.items.length) {
    grid.innerHTML = `<div class="empty-library">${copy("暂无条目。连接 API 后可创建并关联。", "No items yet. Connect API to create and link one.")}</div>`;
  } else {
    grid.innerHTML = state.items.map(state.type === "organizations" ? organizationCard : itemCard).join("");
  }
  $("#libraryCount").textContent = state.total.toLocaleString();
  $("#libraryMore").classList.toggle("hidden", state.items.length >= state.total);
  grid.querySelectorAll("[data-library-id]").forEach((button) => button.addEventListener("click", () => openDetail(button.dataset.libraryId)));
}

async function load({ append = false } = {}) {
  $("#libraryStatus").textContent = copy("更新中…", "Updating…");
  const data = await fetchLibrary();
  state.total = data.total || 0;
  state.items = append ? [...state.items, ...(data.items || [])] : (data.items || []);
  $("#libraryStatus").textContent = `${copy("来源", "Source")}: ${data.storage === "d1" ? "Cloudflare D1" : "Git snapshot"}`;
  render();
}

function openDetail(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;
  const detail = $("#libraryDetail");
  if (state.type === "organizations") {
    $("#libraryDetailContent").innerHTML = `${mark(item).replace("organization-mark", "detail-mark")}
      <p class="eyebrow">${escapeHtml(item.sourcePublisher || "SOURCE")}${item.rank ? ` · #${item.rank}` : ""}</p>
      <h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.description || copy("资料待核验补充。", "Profile pending verification."))}</p>
      <div class="detail-data">
        <div><span>${copy("行业", "Industry")}</span>${escapeHtml(item.industry || "—")}</div>
        <div><span>${copy("国家", "Country")}</span>${escapeHtml(item.country || "—")}</div>
        <div><span>${copy("总部", "Headquarters")}</span>${escapeHtml(item.headquarters || "—")}</div>
        <div><span>${copy("核验", "Verification")}</span>${escapeHtml(item.verificationStatus || "—")}</div>
      </div><div class="detail-links">${item.officialWebsite ? `<a href="${escapeHtml(item.officialWebsite)}" target="_blank" rel="noreferrer">${copy("官网", "Website")}</a>` : ""}<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">${copy("出处", "Source")}</a></div>`;
  } else {
    const title = item.title?.[state.locale === "en" ? "en" : "zh"] || item.title?.zh || item.title?.en || item.slug;
    const summary = item.summary?.[state.locale === "en" ? "en" : "zh"] || item.summary?.zh || item.summary?.en || "";
    $("#libraryDetailContent").innerHTML = `<p class="eyebrow">${escapeHtml(item.type)}</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(summary)}</p><div class="detail-links">${item.sourceUrl ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">${copy("出处", "Source")}</a>` : ""}${item.fileUrl ? `<a href="${escapeHtml(item.fileUrl)}">${copy("文件", "File")}</a>` : ""}</div>`;
  }
  detail.classList.remove("hidden"); $("#detailScrim").classList.remove("hidden");
}

function closeDetail() { $("#libraryDetail").classList.add("hidden"); $("#detailScrim").classList.add("hidden"); }
function applyLocale() {
  document.documentElement.lang = state.locale === "en" ? "en" : "zh-CN";
  document.querySelectorAll("[data-cn][data-en]").forEach((node) => node.textContent = node.dataset[state.locale]);
  $("#librarySearch").placeholder = copy("搜索组织、案例、报告、数据集", "Search organizations, cases, reports, datasets");
  $("#libraryLang").innerHTML = `<span class="${state.locale === "cn" ? "is-active" : ""}">CN</span><span class="lang-divider">/</span><span class="${state.locale === "en" ? "is-active" : ""}">EN</span>`;
  render();
}

document.querySelectorAll("[data-library-type]").forEach((button) => {
  button.classList.toggle("is-active", button.dataset.libraryType === state.type);
  button.addEventListener("click", () => {
  document.querySelectorAll("[data-library-type]").forEach((node) => node.classList.toggle("is-active", node === button));
  state.type = button.dataset.libraryType; state.offset = 0; state.items = [];
  $("#sourceFilterLabel").classList.toggle("hidden", state.type !== "organizations"); load();
  });
});
$("#librarySearch").value = state.q;
$("#sourceFilter").value = state.source;
$("#sourceFilterLabel").classList.toggle("hidden", state.type !== "organizations");
$("#sourceFilter").addEventListener("change", (event) => { state.source = event.target.value; state.offset = 0; load(); });
$("#librarySearch").addEventListener("input", (event) => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.q = event.target.value.trim(); state.offset = 0; load(); }, 220); });
$("#libraryMore").addEventListener("click", () => { state.offset += state.limit; load({ append: true }); });
$("#libraryLang").addEventListener("click", () => { state.locale = state.locale === "cn" ? "en" : "cn"; localStorage.setItem("iptrust-locale", state.locale); applyLocale(); });
$("#detailClose").addEventListener("click", closeDetail); $("#detailScrim").addEventListener("click", closeDetail);
applyLocale(); load().catch((error) => $("#libraryStatus").textContent = error.message);
