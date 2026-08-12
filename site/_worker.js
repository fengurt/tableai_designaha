const EDGE_ORIGIN = "https://edge.apuch.art";

function canonicalIpEvolution(request) {
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

export default {
  async fetch(request) {
    const canonical = canonicalIpEvolution(request);
    if (canonical) return canonical;
    const incoming = new URL(request.url);
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
