const encoder = new TextEncoder();

export function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64url(value);
}

export async function sha256(value) {
  const data = typeof value === "string" ? encoder.encode(value) : value;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hmac(secret, value) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

export function constantTimeEqual(left = "", right = "") {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return diff === 0;
}

function base32Decode(value = "") {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  const bytes = [];
  for (const char of clean) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
    while (bits.length >= 8) {
      bytes.push(parseInt(bits.slice(0, 8), 2));
      bits = bits.slice(8);
    }
  }
  return new Uint8Array(bytes);
}

async function hotp(secret, counter) {
  const bytes = new ArrayBuffer(8);
  new DataView(bytes).setUint32(4, counter);
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes));
  const offset = digest.at(-1) & 0x0f;
  const code = (((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3]) % 1000000;
  return String(code).padStart(6, "0");
}

export async function verifyTotp(secret, code) {
  if (!secret) return true;
  const normalized = String(code || "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const counter = Math.floor(Date.now() / 30000);
  const decoded = base32Decode(secret);
  const candidates = await Promise.all([-1, 0, 1].map((offset) => hotp(decoded, counter + offset)));
  return candidates.some((candidate) => constantTimeEqual(candidate, normalized));
}

function cookies(request) {
  return Object.fromEntries((request.headers.get("cookie") || "").split(";").map((part) => part.trim().split(/=(.*)/s)).filter(([key]) => key));
}

function parseJson(value, fallback = []) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export function hasScope(actor, scope) {
  const scopes = actor?.scopes || [];
  return scopes.includes("system:*") || scopes.includes(scope) || scopes.includes(`${scope.split(":")[0]}:*`);
}

export function hasIpScope(actor, slug) {
  const scopes = actor?.ipScopes || [];
  return scopes.includes("*") || !slug || scopes.includes(slug);
}

function bearer(request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.replace(/^Bearer\s+/i, "") || request.headers.get("x-admin-key") || "";
}

async function actorFromApiKey(token, env) {
  if (!token) return null;
  const match = token.match(/^(ipt_(?:live|test)_[a-z0-9]{8,24})_([A-Za-z0-9_-]{24,})$/);
  if (!match || !env.API_KEY_PEPPER) return null;
  const row = await env.DB.prepare("SELECT * FROM api_keys WHERE prefix=? LIMIT 1").bind(match[1]).first();
  if (!row || row.revoked_at || (row.expires_at && row.expires_at <= new Date().toISOString())) return null;
  const expected = await hmac(env.API_KEY_PEPPER, token);
  if (!constantTimeEqual(row.key_hash, expected)) return null;
  env.DB.prepare("UPDATE api_keys SET last_used_at=? WHERE id=?").bind(new Date().toISOString(), row.id).run().catch(() => {});
  return { id: row.id, kind: row.kind, label: row.label, scopes: parseJson(row.scopes_json), ipScopes: parseJson(row.ip_scopes_json), prefix: row.prefix };
}

async function actorFromSession(request, env) {
  const token = cookies(request)["__Host-iptrust_session"];
  if (!token || !env.SESSION_PEPPER) return null;
  const hash = await hmac(env.SESSION_PEPPER, token);
  const row = await env.DB.prepare("SELECT * FROM sessions WHERE token_hash=? LIMIT 1").bind(hash).first();
  if (!row || row.revoked_at || row.expires_at <= new Date().toISOString()) return null;
  env.DB.prepare("UPDATE sessions SET last_seen_at=? WHERE id=?").bind(new Date().toISOString(), row.id).run().catch(() => {});
  return {
    id: row.api_key_id,
    sessionId: row.id,
    kind: "session",
    scopes: parseJson(row.scopes_json),
    ipScopes: parseJson(row.ip_scopes_json),
    csrfHash: row.csrf_hash,
  };
}

export async function authenticate(request, env) {
  const actor = await actorFromApiKey(bearer(request), env);
  return actor || actorFromSession(request, env);
}

export async function requireCsrf(request, actor, env) {
  if (!actor?.sessionId) return true;
  const supplied = request.headers.get("x-csrf-token") || "";
  if (!supplied || !env.SESSION_PEPPER) return false;
  return constantTimeEqual(await hmac(env.SESSION_PEPPER, supplied), actor.csrfHash);
}

export async function issueSession(env, actor) {
  const token = randomToken(32);
  const csrf = randomToken(24);
  const id = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + Number(env.SESSION_TTL_SECONDS || 604800) * 1000);
  await env.DB.prepare("INSERT INTO sessions(id,api_key_id,token_hash,csrf_hash,scopes_json,ip_scopes_json,totp_verified_at,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
    .bind(id, actor.id, await hmac(env.SESSION_PEPPER, token), await hmac(env.SESSION_PEPPER, csrf), JSON.stringify(actor.scopes), JSON.stringify(actor.ipScopes), now.toISOString(), expires.toISOString(), now.toISOString(), now.toISOString()).run();
  return {
    csrf,
    expiresAt: expires.toISOString(),
    cookie: `__Host-iptrust_session=${token}; Path=/; Max-Age=${Number(env.SESSION_TTL_SECONDS || 604800)}; HttpOnly; Secure; SameSite=Strict`,
  };
}

export async function createApiKey(env, { label, kind = "service", scopes = [], ipScopes = [], expiresAt = null, createdBy = "system" }) {
  const id = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
  const prefix = `ipt_live_${id}`;
  const token = `${prefix}_${randomToken(32)}`;
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO api_keys(id,prefix,key_hash,kind,label,scopes_json,ip_scopes_json,expires_at,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
    .bind(id, prefix, await hmac(env.API_KEY_PEPPER, token), kind, String(label || "API key").slice(0, 100), JSON.stringify(scopes), JSON.stringify(ipScopes), expiresAt, createdBy, now).run();
  return { id, prefix, token, label, kind, scopes, ipScopes, expiresAt, createdAt: now };
}
