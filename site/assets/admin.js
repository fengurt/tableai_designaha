const $ = (selector) => document.querySelector(selector);
const state = { config: null, brands: [], authScopes: [], currentFile: null, currentSha: null };
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

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
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

function b64DecodeUnicode(value) {
  const binary = atob(value.replace(/\n/g, ""));
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
  if (!token) throw new Error(copy("needToken"));
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function contentsUrl(path, branch) {
  const { owner, repo } = state.config;
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replaceAll("%2F", "/")}?ref=${encodeURIComponent(branch)}`;
}

async function populateBrands() {
  state.brands = await loadJson("api/brands.json");
  const scopes = state.authScopes.length ? state.authScopes : ["*"];
  const brands = scopes.includes("*")
    ? state.brands
    : state.brands.filter((brand) => scopes.includes(brand.slug));
  $("#brandSelect").innerHTML = brands.map((brand) => `<option value="${brand.slug}">${brand.mainName || brand.name}</option>`).join("");
  await populateFiles();
}

async function populateAdminScopes() {
  const select = $("#adminScopes");
  if (!select) return;
  const brands = await loadJson("api/brands.json");
  select.innerHTML = [
    `<option value="*">*</option>`,
    ...brands.map((brand) => `<option value="${brand.slug}">${brand.mainName || brand.name}</option>`),
  ].join("");
  select.querySelector('option[value="*"]').selected = true;
}

function selectedAdminScopes() {
  const select = $("#adminScopes");
  if (!select) return ["*"];
  const values = [...select.selectedOptions].map((option) => option.value);
  return values.length ? values : ["*"];
}

async function populateFiles() {
  const slug = $("#brandSelect").value;
  const brand = await loadJson(`api/brands/${slug}.json`);
  const paths = brand.editablePaths?.length ? brand.editablePaths : [brand.primaryGuide].filter(Boolean);
  $("#fileSelect").innerHTML = paths.map((path) => `<option value="${path}">${path}</option>`).join("");
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
  status(`${copy("loaded")} ${path}`);
}

async function saveFile() {
  if (!state.currentFile || !state.currentSha) await loadFile();
  const branch = $("#branch").value.trim() || state.config.branch;
  const body = {
    message: $("#commitMessage").value.trim() || `Update ${state.currentFile} from admin site`,
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
  status(copy("saved"));
}

async function apiUnlock(config) {
  const key = $("#adminKey").value;
  const totp = $("#totpCode")?.value.trim();
  if (!totp) throw new Error(copy("totpRequired"));
  const res = await fetch("api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": key,
    },
    body: JSON.stringify({
      adminKey: key,
      totp,
      scopes: selectedAdminScopes(),
      repo: config.repo,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === "admin_auth_not_configured") throw new Error(copy("apiNotConfigured"));
    if (data.error === "bad_api_key") throw new Error(copy("badKey"));
    if (data.error === "bad_totp") throw new Error(copy("totpRequired"));
    throw new Error(data.error || copy("apiLoginFailed"));
  }
  state.authScopes = data.scopes?.length ? data.scopes : data.allowedScopes || ["*"];
}

async function unlock() {
  state.config = await loadJson("admin-config.json");
  const totp = $("#totpCode")?.value.trim();
  if (totp) {
    await apiUnlock(state.config);
    $("#unlockPanel").classList.add("hidden");
    $("#editorPanel").classList.remove("hidden");
    await populateBrands();
    status(copy("unlocked"));
    return;
  }
  const expected = state.config.adminKeySha256;
  if (!expected) {
    $("#unlockStatus").textContent = copy("noKey");
    return;
  }
  const actual = await sha256($("#adminKey").value);
  if (actual !== expected) {
    $("#unlockStatus").textContent = copy("badKey");
    $("#unlockStatus").style.color = "#b12137";
    return;
  }
  $("#unlockPanel").classList.add("hidden");
  $("#editorPanel").classList.remove("hidden");
  await populateBrands();
  status(copy("unlocked"));
}

populateAdminScopes().catch(console.error);

$("#unlockButton")?.addEventListener("click", () => unlock().catch((err) => {
  $("#unlockStatus").textContent = err.message;
  $("#unlockStatus").style.color = "#b12137";
}));
$("#brandSelect")?.addEventListener("change", () => populateFiles().catch((err) => status(err.message, true)));
$("#loadFile")?.addEventListener("click", () => loadFile().catch((err) => status(err.message, true)));
$("#saveFile")?.addEventListener("click", () => saveFile().catch((err) => status(err.message, true)));