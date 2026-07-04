const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Admin-Key, X-File-Name",
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

function cleanKey(pathname, prefix) {
  const raw = decodeURIComponent(pathname.slice(prefix.length)).replace(/^\/+/, "");
  const key = raw
    .split("/")
    .filter(Boolean)
    .join("/");

  if (!key || key.includes("..") || key.startsWith(".")) return "";
  return key;
}

function isAuthorized(request, env) {
  const expected = env.MEDIA_ADMIN_KEY || env.ADMIN_API_KEY || env.IPTRUST_ADMIN_KEY;
  if (!expected) return false;

  const adminKey = request.headers.get("x-admin-key");
  const auth = request.headers.get("authorization") || "";
  return adminKey === expected || auth === `Bearer ${expected}`;
}

async function listMedia(request, env) {
  const url = new URL(request.url);
  const prefix = url.searchParams.get("prefix") || "";
  const cursor = url.searchParams.get("cursor") || undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 1000);
  const listed = await env.MEDIA_BUCKET.list({ prefix, cursor, limit });

  return json({
    objects: listed.objects.map((item) => ({
      key: item.key,
      size: item.size,
      uploaded: item.uploaded,
      etag: item.etag,
      httpEtag: item.httpEtag,
      customMetadata: item.customMetadata ?? {},
    })),
    truncated: listed.truncated,
    cursor: listed.truncated ? listed.cursor : null,
  });
}

async function getMedia(request, env, key) {
  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) return json({ error: "not_found", key }, { status: 404 });

  const headers = new Headers(CORS_HEADERS);
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}

async function putMedia(request, env, key) {
  if (!isAuthorized(request, env)) {
    return json({ error: "unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_UPLOAD_BYTES) {
    return json({ error: "too_large", maxBytes: MAX_UPLOAD_BYTES }, { status: 413 });
  }

  const contentType = request.headers.get("content-type") || "application/octet-stream";
  const uploaded = new Date().toISOString();
  const object = await env.MEDIA_BUCKET.put(key, request.body, {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      uploaded,
      source: "iptrust-api",
    },
  });

  return json({
    ok: true,
    key,
    size: object.size,
    etag: object.etag,
    uploaded,
    url: `/api/media/${key}`,
  }, { status: 201 });
}

async function deleteMedia(request, env, key) {
  if (!isAuthorized(request, env)) {
    return json({ error: "unauthorized" }, { status: 401 });
  }

  await env.MEDIA_BUCKET.delete(key);
  return json({ ok: true, key });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (!env.MEDIA_BUCKET) {
    return json({
      error: "missing_r2_binding",
      binding: "MEDIA_BUCKET",
      hint: "Create R2 buckets iptrust-media and iptrust-media-preview, then bind MEDIA_BUCKET in Cloudflare Pages.",
    }, { status: 503 });
  }

  const url = new URL(request.url);
  const key = cleanKey(url.pathname, "/api/media");

  if (request.method === "GET" && !key) return listMedia(request, env);
  if ((request.method === "GET" || request.method === "HEAD") && key) return getMedia(request, env, key);
  if ((request.method === "PUT" || request.method === "POST") && key) return putMedia(request, env, key);
  if (request.method === "DELETE" && key) return deleteMedia(request, env, key);

  return json({
    error: "unsupported_request",
    routes: [
      "GET /api/media?prefix=brand/",
      "GET /api/media/<key>",
      "PUT /api/media/<key>",
      "DELETE /api/media/<key>",
    ],
  }, { status: 405 });
}
