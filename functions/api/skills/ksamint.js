const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Admin-Key",
  "Access-Control-Max-Age": "86400",
};

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

function isAuthorized(request, env) {
  const expected = env.ADMIN_API_KEY || env.IPTRUST_ADMIN_KEY;
  if (!expected) return false;

  const adminKey = request.headers.get("x-admin-key");
  const auth = request.headers.get("authorization") || "";
  return adminKey === expected || auth === `Bearer ${expected}`;
}

async function decryptPayload(payload, secret) {
  if (!payload?.ciphertext || !payload?.iv || !payload?.tag) {
    throw new Error("Invalid encrypted private skill payload.");
  }

  const enc = new TextEncoder();
  const keyDigest = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  const key = await crypto.subtle.importKey("raw", keyDigest, { name: "AES-GCM" }, false, ["decrypt"]);
  const iv = Uint8Array.from(atob(payload.iv), (char) => char.charCodeAt(0));
  const tag = Uint8Array.from(atob(payload.tag), (char) => char.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(payload.ciphertext), (char) => char.charCodeAt(0));
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

async function loadEncryptedSkills(request, env) {
  const assetUrl = new URL("/api/private/ksamint-skills.enc.json", request.url);
  const assetRequest = new Request(assetUrl, { headers: { "accept": "application/json" } });
  const response = env.ASSETS
    ? await env.ASSETS.fetch(assetRequest)
    : await fetch(assetRequest);

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("application/json")) return null;
  return response.json().catch(() => null);
}

function publicSkill(skill) {
  const { content, ...meta } = skill;
  return meta;
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (request.method !== "GET") {
    return json({ error: "method_not_allowed" }, { status: 405 });
  }

  if (!isAuthorized(request, env)) {
    return json({ error: "unauthorized" }, { status: 401 });
  }

  const secret = env.KSAMINT_SKILL_KEY || env.RESOURCE_ENCRYPTION_KEY || env.ADMIN_API_KEY || env.IPTRUST_ADMIN_KEY;
  if (!secret) {
    return json({ error: "private_skill_secret_not_configured" }, { status: 503 });
  }

  const encrypted = await loadEncryptedSkills(request, env);
  if (!encrypted) {
    return json({
      error: "private_skills_not_found",
      hint: "Run npm run encrypt:ksamint-skills with KSAMINT_SKILL_KEY, RESOURCE_ENCRYPTION_KEY, or ADMIN_API_KEY.",
    }, { status: 404 });
  }

  try {
    const payload = await decryptPayload(encrypted, secret);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const include = url.searchParams.get("include");

    if (id) {
      const skill = payload.skills?.find((item) => item.id === id);
      if (!skill) return json({ error: "private_skill_not_found", id }, { status: 404 });
      return json({ ...payload, skills: undefined, skill });
    }

    return json({
      ...payload,
      skills: include === "content" ? payload.skills : payload.skills?.map(publicSkill),
    });
  } catch {
    return json({
      error: "private_skill_decrypt_failed",
      hint: "KSAMINT_SKILL_KEY/RESOURCE_ENCRYPTION_KEY/ADMIN_API_KEY must match the encryption key.",
    }, { status: 500 });
  }
}
