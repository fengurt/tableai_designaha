export function onRequest({ env }) {
  return Response.json({
    ok: true,
    service: "iptrust",
    runtime: "cloudflare-pages-functions",
    media: {
      r2Binding: Boolean(env.MEDIA_BUCKET),
      bindingName: "MEDIA_BUCKET",
    },
  }, {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
