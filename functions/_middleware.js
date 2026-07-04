export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === "www.apuch.art") {
    url.hostname = "apuch.art";
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
