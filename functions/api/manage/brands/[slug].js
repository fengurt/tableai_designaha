const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Admin-Key",
  "Access-Control-Max-Age": "86400",
};

const CONFIG_PATH = "config/brands.json";
const STRING_FIELDS = ["name", "nativeName", "description", "officialWebsite"];
const LOCALE_FIELDS = ["intro", "business", "notes"];
const CLASSIFICATION_FIELDS = ["tracks", "audiences", "tags"];
const THEME_FIELDS = ["primary", "accent", "secondary", "surface", "paper", "ink", "muted", "line"];

function json(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "no-store",
      ...(init.headers ?? {}),
    },
  });
}

function authKey(request) {
  return request.headers.get("x-admin-key")
    || (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
}

function isAuthorized(request, env) {
  const expected = env.ADMIN_API_KEY || env.IPTRUST_ADMIN_KEY;
  return Boolean(expected && authKey(request) === expected);
}

function parseScopes(value) {
  if (!value) return ["*"];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : ["*"];
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
}

function hasScope(slug, env) {
  const scopes = parseScopes(env.ADMIN_IP_SCOPES);
  return scopes.includes("*") || scopes.includes(slug);
}

function githubConfig(env) {
  const token = env.GITHUB_ADMIN_TOKEN || env.GITHUB_TOKEN || env.GH_TOKEN;
  return {
    token,
    owner: env.GITHUB_OWNER || "fengurt",
    repo: env.GITHUB_REPO || "tableai_designaha",
    branch: env.GITHUB_BRANCH || "main",
  };
}

function githubHeaders(token) {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "iptrust-admin-api",
  };
}

function decodeBase64Utf8(value) {
  const binary = atob(String(value || "").replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary);
}

function contentUrl({ owner, repo }, path, branch) {
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replaceAll("%2F", "/")}?ref=${encodeURIComponent(branch)}`;
}

async function readBrands(config) {
  const response = await fetch(contentUrl(config, CONFIG_PATH, config.branch), {
    headers: githubHeaders(config.token),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "github_read_failed");
  return {
    sha: data.sha,
    brands: JSON.parse(decodeBase64Utf8(data.content)),
  };
}

async function writeBrands(config, sha, brands, slug, message) {
  const response = await fetch(contentUrl(config, CONFIG_PATH, config.branch), {
    method: "PUT",
    headers: githubHeaders(config.token),
    body: JSON.stringify({
      message: message || `Update ${slug} profile from IPTrust API`,
      content: encodeBase64Utf8(`${JSON.stringify(brands, null, 2)}\n`),
      sha,
      branch: config.branch,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "github_write_failed");
  return data;
}

function cleanText(value, max = 1200) {
  if (value == null) return "";
  return String(value).replace(/\r\n/g, "\n").slice(0, max);
}

function cleanList(value, maxItems = 16) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item, 120)).filter(Boolean).slice(0, maxItems);
  }
  return cleanText(value, 1200)
    .split(/[,\n·]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function applyLocalePatch(target, patch, key) {
  if (!patch[key] || typeof patch[key] !== "object") return;
  target[key] = target[key] && typeof target[key] === "object" ? { ...target[key] } : {};
  for (const lang of ["zh", "en"]) {
    if (Object.prototype.hasOwnProperty.call(patch[key], lang)) {
      target[key][lang] = cleanText(patch[key][lang], 2400);
    }
  }
}

function applyClassificationPatch(target, patch) {
  if (!patch.classification || typeof patch.classification !== "object") return;
  target.classification = target.classification && typeof target.classification === "object" ? { ...target.classification } : {};
  for (const field of CLASSIFICATION_FIELDS) {
    if (!patch.classification[field] || typeof patch.classification[field] !== "object") continue;
    target.classification[field] = target.classification[field] && typeof target.classification[field] === "object"
      ? { ...target.classification[field] }
      : {};
    for (const lang of ["zh", "en"]) {
      if (Object.prototype.hasOwnProperty.call(patch.classification[field], lang)) {
        target.classification[field][lang] = cleanList(patch.classification[field][lang]);
      }
    }
  }
}

function updateBrand(brand, patch) {
  const next = { ...brand };
  for (const field of STRING_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, field)) next[field] = cleanText(patch[field]);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "mainLanguage")) {
    const lang = String(patch.mainLanguage || "").toLowerCase();
    if (!["zh", "en"].includes(lang)) throw new Error("invalid_main_language");
    next.mainLanguage = lang;
  }
  for (const field of LOCALE_FIELDS) applyLocalePatch(next, patch, field);
  applyClassificationPatch(next, patch);
  if (patch.theme && typeof patch.theme === "object") {
    next.theme = next.theme && typeof next.theme === "object" ? { ...next.theme } : {};
    for (const field of THEME_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(patch.theme, field)) {
        next.theme[field] = cleanText(patch.theme[field], 160);
      }
    }
    if (Array.isArray(patch.theme.keywords)) {
      next.theme.keywords = patch.theme.keywords.map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 12);
    }
  }
  return next;
}

export async function onRequest({ request, env, params }) {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (!["GET", "PATCH"].includes(request.method)) return json({ error: "method_not_allowed" }, { status: 405 });
  if (!isAuthorized(request, env)) return json({ error: "unauthorized" }, { status: 401 });

  const slug = params.slug;
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) return json({ error: "bad_slug" }, { status: 400 });
  if (!hasScope(slug, env)) return json({ error: "forbidden_scope", slug }, { status: 403 });

  const config = githubConfig(env);
  if (!config.token) {
    return json({
      error: "github_token_not_configured",
      hint: "Set GITHUB_ADMIN_TOKEN or GITHUB_TOKEN in Cloudflare Pages secrets.",
    }, { status: 503 });
  }

  try {
    const { sha, brands } = await readBrands(config);
    const index = brands.findIndex((brand) => brand.slug === slug);
    if (index < 0) return json({ error: "brand_not_found", slug }, { status: 404 });

    if (request.method === "GET") {
      return json({ ok: true, brand: brands[index], sha, branch: config.branch });
    }

    const body = await request.json().catch(() => ({}));
    brands[index] = updateBrand(brands[index], body.patch || {});
    const saved = await writeBrands(config, sha, brands, slug, body.message);
    return json({
      ok: true,
      slug,
      brand: brands[index],
      branch: config.branch,
      commit: {
        sha: saved.commit?.sha,
        url: saved.commit?.html_url,
      },
    });
  } catch (error) {
    return json({ error: error.message || "brand_update_failed" }, { status: 500 });
  }
}
