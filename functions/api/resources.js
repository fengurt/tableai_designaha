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
    throw new Error("Invalid encrypted resource payload.");
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

async function loadEncryptedResources(request, env) {
  const assetUrl = new URL("/api/cloud-resources.enc.json", request.url);
  const assetRequest = new Request(assetUrl, { headers: { "accept": "application/json" } });
  const response = env.ASSETS
    ? await env.ASSETS.fetch(assetRequest)
    : await fetch(assetRequest);

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("application/json")) return null;
  return response.json().catch(() => null);
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

  const secret = env.RESOURCE_ENCRYPTION_KEY || env.ADMIN_API_KEY || env.IPTRUST_ADMIN_KEY;
  if (!secret) {
    return json({ error: "resource_secret_not_configured" }, { status: 503 });
  }

  const encrypted = await loadEncryptedResources(request, env);
  if (!encrypted) {
    return json({
      error: "resource_inventory_not_found",
      hint: "Run npm run sync:cloud-resources with RESOURCE_ENCRYPTION_KEY or ADMIN_API_KEY.",
    }, { status: 404 });
  }

  try {
    return json(await decryptPayload(encrypted, secret));
  } catch (error) {
    return json({
      error: "resource_decrypt_failed",
      hint: "RESOURCE_ENCRYPTION_KEY/ADMIN_API_KEY must match the key used by sync:cloud-resources.",
    }, { status: 500 });
  }
}
