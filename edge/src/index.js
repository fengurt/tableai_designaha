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

async function serveSite(request, env) {
  const incoming = new URL(request.url);
  const upstream = new URL(`${incoming.pathname}${incoming.search}`, env.PAGES_ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete("host");
  const response = await fetch(new Request(upstream, { method: request.method, headers, redirect: "manual" }));
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("X-IPTrust-Edge", "pages-proxy");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !trustedOrigin(request)) return secure(json(request, { error: "origin_not_allowed" }, { status: 403 }, true));
    let response;
    if (url.hostname === "media.apuch.art") response = await serveMedia(request, env);
    else if (/^\/assets\/(?:brand-images|adobe|contact)\//.test(url.pathname)) response = await serveLegacyAsset(request, env);
    else if (url.pathname === "/mcp") response = await handleMcp(request, env);
    else if (url.pathname.startsWith("/api/v2/")) response = await handleApi(request, env);
    else response = await serveSite(request, env);
    return secure(response);
  },
  queue: handleQueue,
  scheduled: handleScheduled,
};
