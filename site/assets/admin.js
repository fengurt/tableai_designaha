const $ = (selector) => document.querySelector(selector);
const state = { brands: [], authScopes: [], csrf: "", slug: "", etag: "" };
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

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path}`);
  return res.json();
}

function status(message, isError = false) {
  const node = $("#editorStatus") || $("#unlockStatus");
  node.textContent = message;
  node.style.color = isError ? "#b12137" : "#0e8c7b";
}

async function populateBrands() {
  state.brands = await loadJson("api/brands.json");
  const scopes = state.authScopes.length ? state.authScopes : ["*"];
  const brands = scopes.includes("*")
    ? state.brands
    : state.brands.filter((brand) => scopes.includes(brand.slug));
  $("#brandSelect").innerHTML = brands.map((brand) => `<option value="${brand.slug}">${brand.mainName || brand.name}</option>`).join("");
  await loadBrand();
}

async function loadBrand() {
  const slug = $("#brandSelect").value;
  if (!slug) return;
  const res = await fetch(`api/v2/brands/${encodeURIComponent(slug)}`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  state.slug = slug;
  state.etag = res.headers.get("etag") || "";
  $("#editor").value = JSON.stringify(await res.json(), null, 2);
  $("#recordVersion").textContent = state.etag;
  status("Loaded.");
}

async function saveBrand() {
  if (!state.slug || !state.etag) await loadBrand();
  const patch = JSON.parse($("#editor").value);
  const res = await fetch(`api/v2/brands/${encodeURIComponent(state.slug)}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": state.etag,
      "Idempotency-Key": crypto.randomUUID(),
      "X-CSRF-Token": state.csrf,
    },
    body: JSON.stringify({ patch }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  state.etag = res.headers.get("etag") || `brand-${state.slug}-v${data.version}`;
  $("#editor").value = JSON.stringify(data.brand, null, 2);
  $("#recordVersion").textContent = state.etag;
  status("Saved.");
}

async function apiUnlock() {
  const key = $("#adminKey").value;
  const totp = $("#totpCode")?.value.trim();
  if (!totp) throw new Error(copy("totpRequired"));
  const res = await fetch("api/v2/auth/exchange", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      apiKey: key,
      totp,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === "admin_auth_not_configured") throw new Error(copy("apiNotConfigured"));
    if (data.error === "bad_api_key") throw new Error(copy("badKey"));
    if (data.error === "bad_totp") throw new Error(copy("totpRequired"));
    throw new Error(data.error || copy("apiLoginFailed"));
  }
  state.authScopes = data.ipScopes?.length ? data.ipScopes : ["*"];
  state.csrf = data.csrfToken || "";
  sessionStorage.setItem("iptrust_csrf", state.csrf);
  $("#adminKey").value = "";
}

async function unlock() {
  await apiUnlock();
  $("#unlockPanel").classList.add("hidden");
  $("#editorPanel").classList.remove("hidden");
  await populateBrands();
  status(copy("unlocked"));
}

$("#unlockButton")?.addEventListener("click", () => unlock().catch((err) => {
  $("#unlockStatus").textContent = err.message;
  $("#unlockStatus").style.color = "#b12137";
}));
$("#brandSelect")?.addEventListener("change", () => loadBrand().catch((err) => status(err.message, true)));
$("#loadBrand")?.addEventListener("click", () => loadBrand().catch((err) => status(err.message, true)));
$("#saveBrand")?.addEventListener("click", () => saveBrand().catch((err) => status(err.message, true)));