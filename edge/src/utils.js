import { hmac, sha256 } from "./security.js";

export const PUBLIC_ORIGINS = new Set(["https://apuch.art", "https://www.apuch.art"]);

export function trustedOrigin(request) {
  const origin = request.headers.get("origin");
  return !origin || PUBLIC_ORIGINS.has(origin);
}

export function cors(request, authenticated = false) {
  const origin = request.headers.get("origin") || "";
  const allow = authenticated ? (PUBLIC_ORIGINS.has(origin) ? origin : "https://apuch.art") : (origin || "*");
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, If-Match, If-None-Match, Idempotency-Key, X-CSRF-Token, X-Admin-Key, MCP-Protocol-Version",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function json(request, data, init = {}, authenticated = false) {
  return Response.json(data, {
    ...init,
    headers: {
      ...cors(request, authenticated),
      "Cache-Control": authenticated ? "no-store" : "public, max-age=60, stale-while-revalidate=300",
      ...(init.headers || {}),
    },
  });
}

export function cleanSegment(value = "") {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

export function parseJson(value, fallback = {}) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export function now() { return new Date().toISOString(); }

export function entityEtag(type, id, version) {
  return `"${type}-${id}-v${version}"`;
}

export function parseBody(request) {
  return request.json().catch(() => ({}));
}

export function chineseNgrams(value = "") {
  const normalized = String(value).normalize("NFKC").toLowerCase();
  const words = normalized.match(/[a-z0-9]+/g) || [];
  const hanRuns = normalized.match(/[\u3400-\u9fff]+/g) || [];
  const grams = [];
  for (const run of hanRuns) {
    for (let index = 0; index < run.length; index += 1) {
      grams.push(run[index]);
      if (index + 1 < run.length) grams.push(run.slice(index, index + 2));
    }
  }
  return [...new Set([...words, ...grams])].join(" ");
}

export async function audit(env, request, actor, action, resourceType, resourceId, result, before = {}, after = {}) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  const ipHash = env.AUDIT_PEPPER ? await hmac(env.AUDIT_PEPPER, `${new Date().toISOString().slice(0, 10)}:${ip}`) : "";
  await env.DB.prepare("INSERT INTO audit_events(id,actor_id,action,resource_type,resource_id,request_id,ip_hash,user_agent,result,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), actor?.id || "anonymous", action, resourceType, resourceId || "", request.headers.get("cf-ray") || crypto.randomUUID(), ipHash, (request.headers.get("user-agent") || "").slice(0, 300), result, JSON.stringify(before), JSON.stringify(after), now()).run();
}

export async function checkIdempotency(env, request, actor, body) {
  const key = request.headers.get("idempotency-key") || "";
  if (!key || key.length > 128) return { error: "idempotency_key_required", status: 400 };
  const bodyHash = await sha256(JSON.stringify(body));
  const existing = await env.DB.prepare("SELECT * FROM idempotency_keys WHERE api_key_id=? AND key=? AND expires_at>?").bind(actor.id, key, now()).first();
  if (existing) {
    if (existing.method !== request.method || existing.path !== new URL(request.url).pathname || existing.body_hash !== bodyHash) return { error: "idempotency_key_conflict", status: 409 };
    return { replay: true, status: existing.response_status, data: parseJson(existing.response_json) };
  }
  return { key, bodyHash };
}

export async function storeIdempotency(env, request, actor, check, status, data) {
  const expires = new Date(Date.now() + 86400000).toISOString();
  await env.DB.prepare("INSERT INTO idempotency_keys(api_key_id,key,method,path,body_hash,response_status,response_json,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)")
    .bind(actor.id, check.key, request.method, new URL(request.url).pathname, check.bodyHash, status, JSON.stringify(data), now(), expires).run();
}

export async function enqueueOutbox(env, eventType, aggregateType, aggregateId, version, payload) {
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO outbox(id,event_type,aggregate_type,aggregate_id,aggregate_version,payload_json,status,next_attempt_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)")
    .bind(id, eventType, aggregateType, aggregateId, version, JSON.stringify(payload), "pending", now(), now()).run();
  return id;
}

export async function applyRateLimit(request, env, actor, kind = "read") {
  const binding = kind === "write" ? env.WRITE_LIMITER : actor ? env.AUTH_LIMITER : env.PUBLIC_LIMITER;
  if (!binding) return true;
  const identity = actor?.id || request.headers.get("cf-connecting-ip") || "anonymous";
  const route = new URL(request.url).pathname.split("/").slice(0, 5).join("/");
  const result = await binding.limit({ key: `${identity}:${kind}:${route}` });
  if (!result.success) env.METRICS?.writeDataPoint({ blobs: ["rate_limited", route], doubles: [1], indexes: [identity.slice(0, 32)] });
  return result.success;
}

export function deepMerge(target, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return patch;
  const result = target && typeof target === "object" && !Array.isArray(target) ? { ...target } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) continue;
    result[key] = value && typeof value === "object" && !Array.isArray(value) ? deepMerge(result[key], value) : value;
  }
  return result;
}
