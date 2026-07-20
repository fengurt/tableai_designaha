const EDGE_ORIGIN = "https://edge.apuch.art";

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    if (incoming.hostname.endsWith(".pages.dev")) return env.ASSETS.fetch(request);
    const upstream = new URL(`${incoming.pathname}${incoming.search}`, EDGE_ORIGIN);
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.set("X-IPTrust-Gateway", "pages");
    const response = await fetch(new Request(upstream, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
      redirect: "manual",
    }));
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("X-IPTrust-Edge", "pages-gateway");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
