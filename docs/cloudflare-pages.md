# Cloudflare Pages deploy

Cloudflare Pages is the production origin for `https://apuch.art`. It serves the generated
`site/` folder as static assets. Everything dynamic — the public API, MCP, media, search,
admin — belongs to the `iptrust-edge` Worker (`edge/wrangler.toml`), not to Pages.

`.github/workflows/deploy-cloudflare-pages.yml` deploys both on every push to `main`. There is
no Cloudflare Git integration: the Pages project is a Direct Upload project driven by Wrangler
from CI, so the Dashboard build settings (framework preset, build command, output directory) do
not apply and should stay empty.

## GitHub settings

Repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional repository variable:

- `CLOUDFLARE_PAGES_PROJECT` defaults to `tableai-designaha`

If either secret is missing the deploy job skips every step and still reports success, so a green
run is not by itself proof that a deploy happened. Check the job log for the
`Deploy to Cloudflare Pages` step.

## Build

```sh
npm run build:site
npx wrangler pages deploy site --project-name=tableai-designaha --branch=main
```

`npm run build:site` regenerates the whole `site/` tree, including `_headers`, `_redirects`,
`_routes.json` and `_worker.js`. Never hand-edit files under `site/`.

## Request routing

`site/_routes.json` decides which paths invoke `site/_worker.js`:

```txt
/api/v2/*  /mcp  /assets/brand-images/*  /assets/adobe/*  /assets/contact/*
```

Those paths are proxied to `https://edge.apuch.art`. Every other path is served straight from
the Pages static asset store and never runs Worker code. Keep the include list as narrow as
possible — widening it to `/*` would push all static traffic through the Worker.

This repo has no Pages Functions. A `functions/` directory would be ignored anyway, because
`site/_worker.js` takes precedence over it.

## Custom domains

1. Open Cloudflare Pages > `tableai-designaha` > Custom domains.
2. Add `apuch.art`.
3. Add `www.apuch.art`.

```txt
apuch.art -> tableai-designaha.pages.dev
www.apuch.art -> tableai-designaha.pages.dev
```

### www canonicalization

`www.apuch.art` must 301 to `apuch.art`. This cannot live in the repo:

- `site/_redirects` only matches paths. Wrangler rejects a source with a hostname
  (`Only relative URLs are allowed`).
- `site/_worker.js` never runs for `/`, because `_routes.json` excludes it.

So it has to be a Cloudflare **Redirect Rule** on the zone (Rules > Redirect Rules >
Create rule):

```txt
When incoming requests match:  (http.host eq "www.apuch.art")
Then:                          Dynamic redirect
  Expression:                  concat("https://apuch.art", http.request.uri.path)
  Status code:                 301
  Preserve query string:       on
```

`npm run check:production` reports this as the `www-canonical` advisory. Advisories log `WARN`
and never fail the deploy, because the rule lives in the dashboard rather than in this
repository — a `WARN` means an operator needs to create it.

## Bindings

Pages needs no bindings. `site/_worker.js` only proxies; it reads no D1, R2, or KV. The
`[[r2_buckets]]` and `[[d1_databases]]` blocks in the root `wrangler.toml` are inherited by the
Pages project but unused by the current Worker.

All storage bindings that matter are declared in `edge/wrangler.toml` and belong to
`iptrust-edge`: D1 `iptrust-library`, R2 `iptrust-media` and `iptrust-media-preview`, Vectorize,
Queues, Analytics Engine and rate limiters. Worker secrets (`API_KEY_PEPPER`, `SESSION_PEPPER`,
`AUDIT_PEPPER`, `MEDIA_SIGNING_KEY`, `ADMIN_TOTP_SECRET`, `GITHUB_SERVICE_TOKEN`) are set with
`wrangler secret put --config edge/wrangler.toml`, never in Pages settings and never in Git.

## Local smoke test

```sh
npm run build:site
npx wrangler pages dev site --compatibility-date=2026-05-03 --port=8788
curl http://127.0.0.1:8788/

# The API and MCP live in the Worker, so run that separately.
npx wrangler dev --config edge/wrangler.toml
curl http://127.0.0.1:8787/api/v2/health
```

## Performance notes

- `site/_headers` carries cache and security headers; `site/_redirects` carries short paths like
  `/admin`, `/llms`, `/manifest` and `/brands`.
- `site.css` and `site.js` are emitted as `site-<content-hash>.css|js` and served
  `immutable` for one year. The name changes only when the bytes change, so an unchanged
  release reuses the cached asset. The hash covers the input list at the top of
  `scripts/build-site.mjs` — add any new source of those two files to that list.
- `build-site.mjs` retains the versioned assets referenced by the previous two builds so a page
  loaded moments before a deploy keeps resolving, then drops the rest.
- JSON requests use the current Git commit as a cache key instead of `Date.now()`.
