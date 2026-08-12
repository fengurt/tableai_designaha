import { handleApi } from "./api.js";
import { handleMcp } from "./mcp.js";
import { serveLegacyAsset, serveMedia } from "./media.js";
import { handleQueue, handleScheduled } from "./jobs.js";
import { json, trustedOrigin } from "./utils.js";

function secure(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function cacheResponse(response, state, method = "GET", timing = "") {
  const headers = new Headers(response.headers);
  headers.set("X-IPTrust-Cache", state);
  headers.set("Server-Timing", `edge-cache;desc=${state}${timing ? `, ${timing}` : ""}`);
  headers.set("Timing-Allow-Origin", "*");
  return new Response(method === "HEAD" ? null : response.body, { status: response.status, statusText: response.statusText, headers });
}

function cacheKey(request, kind) {
  const url = new URL(request.url);
  for (const key of [...url.searchParams.keys()]) {
    if (/^(?:utm_.+|deploy|refresh|v)$/i.test(key)) url.searchParams.delete(key);
  }
  if (kind === "api") url.searchParams.set("__iptrust_origin", request.headers.get("origin") || "public");
  return new Request(url, { method: "GET" });
}

function hasCredentials(request) {
  return Boolean(request.headers.get("authorization") || request.headers.get("cookie") || request.headers.get("x-admin-key"));
}

export function canonicalSiteRedirect(request) {
  if (!["GET", "HEAD"].includes(request.method)) return null;
  const url = new URL(request.url);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  if (pathname !== "/ip-evolution/" && pathname !== "/ip-evolution？") return null;
  url.pathname = "/ip-evolution";
  return new Response(null, {
    status: 308,
    headers: {
      Location: url.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-IPTrust-Route": "canonical-ip-evolution",
    },
  });
}

async function serveSite(request, env, ctx) {
  const startedAt = Date.now();
  const incoming = new URL(request.url);
  const cacheable = ["GET", "HEAD"].includes(request.method) && !hasCredentials(request) && !/^\/(?:admin(?:\.html)?(?:\/|$)|api\/|mcp(?:\/|$))/.test(incoming.pathname);
  const edgeCache = caches.default;
  const key = cacheKey(request, "site");
  if (cacheable) {
    const cached = await edgeCache.match(key);
    if (cached) return cacheResponse(cached, "HIT", request.method, `total;dur=${Date.now() - startedAt}`);
  }

  const upstream = new URL(`${incoming.pathname}${incoming.search}`, env.PAGES_ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete("host");
  const response = await fetch(new Request(upstream, { method: request.method, headers, redirect: "manual" }));
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("X-IPTrust-Edge", "pages-proxy");
  const isHtml = /text\/html/i.test(responseHeaders.get("content-type") || "");
  if (isHtml && cacheable) responseHeaders.set("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");
  if (!cacheable) responseHeaders.set("Cache-Control", "private, no-store");
  const proxied = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
  if (cacheable && response.ok && request.method === "GET") ctx.waitUntil(edgeCache.put(key, proxied.clone()));
  return cacheResponse(proxied, cacheable ? "MISS" : "BYPASS", request.method, `origin;dur=${Date.now() - startedAt}`);
}

async function serveApi(request, env, ctx) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const cacheable = ["GET", "HEAD"].includes(request.method)
    && !hasCredentials(request)
    && !/^\/api\/v2\/(?:auth|metrics)(?:\/|$)/.test(url.pathname);
  const edgeCache = caches.default;
  const key = cacheKey(request, "api");
  if (cacheable) {
    const cached = await edgeCache.match(key);
    if (cached) return cacheResponse(cached, "HIT", request.method, `total;dur=${Date.now() - startedAt}`);
  }

  const response = await handleApi(request, env);
  const headers = new Headers(response.headers);
  const blocked = /(?:private|no-store)/i.test(headers.get("cache-control") || "");
  if (cacheable && response.ok && !blocked) {
    headers.set("Cache-Control", "public, max-age=60, s-maxage=60");
    const stored = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    if (request.method === "GET") ctx.waitUntil(edgeCache.put(key, stored.clone()));
    return cacheResponse(stored, "MISS", request.method, `api;dur=${Date.now() - startedAt}`);
  }
  headers.set("Cache-Control", "private, no-store");
  return cacheResponse(new Response(response.body, { status: response.status, statusText: response.statusText, headers }), "BYPASS", request.method, `api;dur=${Date.now() - startedAt}`);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !trustedOrigin(request)) return secure(json(request, { error: "origin_not_allowed" }, { status: 403 }, true));
    let response;
    if (url.hostname === "media.apuch.art") response = await serveMedia(request, env);
    else if (/^\/assets\/(?:brand-images|adobe|contact)\//.test(url.pathname)) response = await serveLegacyAsset(request, env);
    else if (url.pathname === "/mcp") response = await handleMcp(request, env);
    else if (url.pathname.startsWith("/api/v2/")) response = await serveApi(request, env, ctx);
    else response = canonicalSiteRedirect(request) || await serveSite(request, env, ctx);
    return secure(response);
  },
  queue: handleQueue,
  scheduled: handleScheduled,
};
