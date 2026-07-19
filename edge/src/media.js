import { constantTimeEqual, hmac } from "./security.js";
import { json } from "./utils.js";

const WIDTHS = { "320": 320, "640": 640, "1280": 1280, "2400": 2400 };

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
  if (!["GET", "HEAD"].includes(request.method)) return json(request, { error: "method_not_allowed" }, { status: 405 }, true);
  const url = new URL(request.url);
  const pathname = decodeURIComponent(url.pathname);
  const isPrivate = pathname.startsWith("/private/");
  const isPublic = pathname.startsWith("/public/");
  if (!isPrivate && !isPublic) return json(request, { error: "not_found" }, { status: 404 });
  if (isPrivate && !(await signed(request, env, pathname))) return json(request, { error: "invalid_or_expired_signature" }, { status: 403 }, true);

  const key = pathname.slice(1);
  const bucket = isPrivate ? env.ORIGINALS : env.PREVIEWS;
  const head = await bucket.head(key);
  if (!head) return json(request, { error: "not_found" }, { status: 404 });

  const range = rangeFromHeader(request.headers.get("range"), head.size);
  const size = url.searchParams.get("size") || "original";
  const canTransform = isPublic && WIDTHS[size] && /^image\/(png|jpeg|webp|avif)$/i.test(head.httpMetadata?.contentType || "") && head.size <= 20 * 1024 * 1024 && env.IMAGES;
  if (canTransform && !range && request.method === "GET") {
    const cache = caches.default;
    const cached = await cache.match(request);
    if (cached) return cached;
    const object = await bucket.get(key);
    const accept = request.headers.get("accept") || "";
    const format = accept.includes("image/avif") ? "image/avif" : accept.includes("image/webp") ? "image/webp" : (head.httpMetadata?.contentType || "image/jpeg");
    const transformed = (await env.IMAGES.input(object.body).transform({ width: WIDTHS[size], fit: "scale-down" }).output({ format, quality: 82 })).response();
    const response = new Response(transformed.body, { headers: { ...Object.fromEntries(transformed.headers), "Cache-Control": "public, max-age=31536000, immutable", "Vary": "Accept", "X-IPTrust-Transform": `${size}:${format}` } });
    await cache.put(request, response.clone());
    return response;
  }

  const object = await bucket.get(key, range ? { range } : undefined);
  if (!object) return json(request, { error: "not_found" }, { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", isPrivate ? "private, no-store" : "public, max-age=31536000, immutable");
  if (range) {
    headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`);
    headers.set("Content-Length", String(range.length));
  }
  return new Response(request.method === "HEAD" ? null : object.body, { status: range ? 206 : 200, headers });
}

export async function serveLegacyAsset(request, env) {
  if (!["GET", "HEAD"].includes(request.method)) return json(request, { error: "method_not_allowed" }, { status: 405 });
  const path = new URL(request.url).pathname;
  const alias = await env.DB.prepare("SELECT a.*,s.source_object_key,s.access FROM asset_aliases a JOIN assets s ON s.id=a.asset_id WHERE a.path=? AND s.deleted_at IS NULL").bind(path).first();
  if (!alias) return json(request, { error: "legacy_asset_not_found" }, { status: 404 });
  if (alias.access !== "public") return json(request, { error: "private_asset" }, { status: 403 }, true);
  return new Response(null, { status: 308, headers: { Location: `${env.MEDIA_BASE_URL}/${alias.source_object_key}`, "Cache-Control": "public, max-age=31536000, immutable" } });
}
