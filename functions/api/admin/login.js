const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function base32Decode(value = "") {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  const bytes = [];

  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index < 0) continue;
    bits += index.toString(2).padStart(5, "0");
    while (bits.length >= 8) {
      bytes.push(parseInt(bits.slice(0, 8), 2));
      bits = bits.slice(8);
    }
  }

  return new Uint8Array(bytes);
}

function counterBytes(counter) {
  const bytes = new ArrayBuffer(8);
  const view = new DataView(bytes);
  view.setUint32(4, counter);
  return bytes;
}

async function hotp(secret, counter) {
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes(counter)));
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (
    ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff)
  ) % 1000000;
  return String(code).padStart(6, "0");
}

async function verifyTotp(secretBase32, code) {
  const normalized = String(code || "").replace(/\D/g, "").padStart(6, "0");
  if (!/^\d{6}$/.test(normalized)) return false;

  const secret = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 30000);
  const candidates = await Promise.all([-1, 0, 1].map((drift) => hotp(secret, counter + drift)));
  return candidates.includes(normalized);
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

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, { status: 405 });
  }

  if (!env.ADMIN_API_KEY || !env.ADMIN_TOTP_SECRET) {
    return json({
      error: "admin_auth_not_configured",
      hint: "Set ADMIN_API_KEY and ADMIN_TOTP_SECRET in Cloudflare Pages secrets.",
    }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const apiKey = request.headers.get("x-admin-key")
    || (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
    || body.adminKey;

  if (apiKey !== env.ADMIN_API_KEY) {
    return json({ error: "bad_api_key" }, { status: 401 });
  }

  const totpOk = await verifyTotp(env.ADMIN_TOTP_SECRET, body.totp);
  if (!totpOk) {
    return json({ error: "bad_totp" }, { status: 401 });
  }

  const allowedScopes = parseScopes(env.ADMIN_IP_SCOPES);
  const requestedScopes = Array.isArray(body.scopes) && body.scopes.length ? body.scopes : allowedScopes;
  const grantedScopes = allowedScopes.includes("*")
    ? requestedScopes
    : requestedScopes.filter((scope) => allowedScopes.includes(scope));

  return json({
    ok: true,
    auth: "api_key_totp",
    scopes: grantedScopes,
    allowedScopes,
  });
}
