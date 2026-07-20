import { constantTimeEqual, hmac } from "./security.js";
import { json } from "./utils.js";

const WIDTHS = { "320": 320, "640": 640, "1280": 1280, "2400": 2400 };

function negotiatedFormat(request, size, pathname) {
  if (!WIDTHS[size] || !/\.(?:png|jpe?g|webp|avif)$/i.test(pathname)) return "original";
  const accept = request.headers.get("accept") || "";
  if (accept.includes("image/avif")) return "avif";
  if (accept.includes("image/webp")) return "webp";
  return "original";
}

function mediaCacheKey(request, pathname, size, format) {
  const url = new URL(request.url);
  url.pathname = pathname;
  url.search = "";
  url.searchParams.set("__iptrust_size", size);
  url.searchParams.set("__iptrust_format", format);
  return new Request(url, { method: "GET" });
}

function variantKey(key, size, format) {
  return `${key.slice(0, key.lastIndexOf("/") + 1)}${size}.${format}`;
}

function cacheResult(response, state, timing = "", method = "GET") {
  const headers = new Headers(response.headers);
  headers.set("X-IPTrust-Cache", state);
  headers.set("Server-Timing", `edge-cache;desc=${state}${timing ? `, ${timing}` : ""}`);
  headers.set("Timing-Allow-Origin", "*");
  return new Response(method === "HEAD" ? null : response.body, { status: response.status, statusText: response.statusText, headers });
}

function objectResponse(object, { isPrivate = false, range = null, totalSize = object.size, method = "GET" } = {}) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", isPrivate ? "private, no-store" : "public, max-age=31536000, immutable");
  headers.set("Vary", "Accept");
  if (range) {
    headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${totalSize}`);
    headers.set("Content-Length", String(range.length));
  }
  return new Response(method === "HEAD" ? null : object.body, { status: range ? 206 : 200, headers });
}

function rangeFromHeader(value, size) {
  const match = String(value || "").match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) return null;
  return { offset: start, length: Math.min(end, size - 1) - start + 1 };
}

export async function signMediaPath(env, pathname, ttl = 600) {
  const seconds = Math.min(Math.max(Number(ttl || 600), 30), 3600);
  const exp = Math.floor(Date.now() / 1000) + seconds;
  const sig = await hmac(env.MEDIA_SIGNING_KEY, `${pathname}\n${exp}`);
  return { url: `${env.MEDIA_BASE_URL}${pathname}?exp=${exp}&sig=${sig}`, expiresAt: new Date(exp * 1000).toISOString() };
}

async function signed(request, env, pathname) {
  const url = new URL(request.url);
  const exp = Number(url.searchParams.get("exp") || 0);
  const sig = url.searchParams.get("sig") || "";
  if (!exp || exp < Math.floor(Date.now() / 1000) || exp > Math.floor(Date.now() / 1000) + 3600 || !env.MEDIA_SIGNING_KEY) return false;
  return constantTimeEqual(sig, await hmac(env.MEDIA_SIGNING_KEY, `${pathname}\n${exp}`));
}

export async function serveMedia(request, env) {
  const startedAt = Date.now();
  if (!["GET", "HEAD"].includes(request.method)) return json(request, { error: "method_not_allowed" }, { status: 405 }, true);
  const url = new URL(request.url);
  const pathname = decodeURIComponent(url.pathname);
  const isPrivate = pathname.startsWith("/private/");
  const isPublic = pathname.startsWith("/public/");
  if (!isPrivate && !isPublic) return json(request, { error: "not_found" }, { status: 404 });
  if (isPrivate && !(await signed(request, env, pathname))) return json(request, { error: "invalid_or_expired_signature" }, { status: 403 }, true);

  const key = pathname.slice(1);
  const bucket = isPrivate ? env.ORIGINALS : env.PREVIEWS;
  const size = url.searchParams.get("size") || "original";
  const rangeHeader = request.headers.get("range");
  const format = negotiatedFormat(request, size, pathname);
  const cache = caches.default;
  const cacheKey = mediaCacheKey(request, pathname, size, format);

  if (isPublic && !rangeHeader) {
    const cached = await cache.match(cacheKey);
    if (cached) return cacheResult(cached, "HIT", `total;dur=${Date.now() - startedAt}`, request.method);
  }

  if (isPublic && WIDTHS[size] && format !== "original" && !rangeHeader && request.method === "GET") {
    const persisted = await env.PREVIEWS.get(variantKey(key, size, format));
    if (persisted) {
      const response = objectResponse(persisted);
      await cache.put(cacheKey, response.clone());
      return cacheResult(response, "MISS", `r2;dur=${Date.now() - startedAt}, variant;desc=persisted`);
    }

    const object = await bucket.get(key);
    const contentType = object?.httpMetadata?.contentType || "";
    const canTransform = object && /^image\/(png|jpeg|webp|avif)$/i.test(contentType) && object.size <= 20 * 1024 * 1024 && env.IMAGES;
    if (!canTransform) return object ? cacheResult(objectResponse(object), "BYPASS", `r2;dur=${Date.now() - startedAt}`) : json(request, { error: "not_found" }, { status: 404 });

    const transformed = (await env.IMAGES.input(object.body)
      .transform({ width: WIDTHS[size], fit: "scale-down" })
      .output({ format: `image/${format}`, quality: 82 })).response();
    const headers = new Headers(transformed.headers);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Vary", "Accept");
    headers.set("X-IPTrust-Transform", `${size}:image/${format}`);
    const response = new Response(transformed.body, { status: transformed.status, headers });
    await cache.put(cacheKey, response.clone());
    return cacheResult(response, "MISS", `r2;dur=${Date.now() - startedAt}, variant;desc=dynamic`);
  }

  if (rangeHeader) {
    const head = await bucket.head(key);
    if (!head) return json(request, { error: "not_found" }, { status: 404 });
    const range = rangeFromHeader(rangeHeader, head.size);
    if (!range) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${head.size}` } });
    const object = await bucket.get(key, { range });
    if (!object) return json(request, { error: "not_found" }, { status: 404 });
    return cacheResult(objectResponse(object, { isPrivate, range, totalSize: head.size, method: request.method }), "BYPASS", `r2;dur=${Date.now() - startedAt}`);
  }

  const object = request.method === "HEAD" ? await bucket.head(key) : await bucket.get(key);
  if (!object) return json(request, { error: "not_found" }, { status: 404 });
  const response = objectResponse(object, { isPrivate, method: request.method });
  if (isPublic && request.method === "GET") await cache.put(cacheKey, response.clone());
  return cacheResult(response, isPrivate ? "BYPASS" : "MISS", `r2;dur=${Date.now() - startedAt}`);
}

export async function serveLegacyAsset(request, env) {
  if (!["GET", "HEAD"].includes(request.method)) return json(request, { error: "method_not_allowed" }, { status: 405 });
  const path = new URL(request.url).pathname;
  const alias = await env.DB.prepare("SELECT a.*,s.source_object_key,s.access FROM asset_aliases a JOIN assets s ON s.id=a.asset_id WHERE a.path=? AND s.deleted_at IS NULL").bind(path).first();
  if (!alias) return json(request, { error: "legacy_asset_not_found" }, { status: 404 });
  if (alias.access !== "public") return json(request, { error: "private_asset" }, { status: 403 }, true);
  return new Response(null, { status: 308, headers: { Location: `${env.MEDIA_BASE_URL}/${alias.source_object_key}`, "Cache-Control": "public, max-age=31536000, immutable" } });
}
