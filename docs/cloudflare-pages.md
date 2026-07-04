# Cloudflare Pages deploy

This repo still deploys to GitHub Pages. Cloudflare Pages can run in parallel for CDN, cache headers, redirects, and future edge functions.

## GitHub settings

Add these repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional repository variable:

- `CLOUDFLARE_PAGES_PROJECT` defaults to `tableai-designaha`

## Build

Cloudflare Pages serves the generated `site/` folder.

```sh
npm run build:site
npx wrangler pages deploy site --project-name=tableai-designaha --branch=main
```

Cloudflare Dashboard build settings:

- Framework preset: `None`
- Build command: `npm run build:site`
- Build output directory: `site`
- Root directory: repo root
- Environment variable: `NODE_VERSION=22`

## Custom domain

Use Cloudflare Pages custom domains instead of hand-pointing only DNS.

1. Open Cloudflare Pages > `tableai-designaha` > Custom domains.
2. Add `apuch.art`.
3. Add `www.apuch.art`.
4. If `apuch.art` is already on Cloudflare DNS, Cloudflare will create the needed records and certificates.
5. If DNS is outside Cloudflare, move nameservers to Cloudflare or create a `CNAME` for `www` pointing to `tableai-designaha.pages.dev`. Apex `apuch.art` should be handled through Cloudflare Pages custom domain or DNS flattening.

Current target:

```txt
apuch.art -> tableai-designaha.pages.dev
www.apuch.art -> tableai-designaha.pages.dev
```

## Media storage

Pages Functions are ready for R2-backed media storage:

- Health check: `/api/health`
- List media: `GET /api/media?prefix=logos/`
- Read media: `GET /api/media/logos/example.png`
- Upload media: `PUT /api/media/logos/example.png`
- Delete media: `DELETE /api/media/logos/example.png`

Create two R2 buckets:

- Production: `iptrust-media`
- Preview: `iptrust-media-preview`

Bind production and preview in Cloudflare Pages settings:

```txt
Variable name: MEDIA_BUCKET
Resource type: R2 bucket
Production bucket: iptrust-media
Preview bucket: iptrust-media-preview
```

If deploying with Wrangler after the buckets exist, you can also add this snippet to `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "iptrust-media"
preview_bucket_name = "iptrust-media-preview"
```

Uploads and deletes require one secret variable in Cloudflare Pages:

```txt
MEDIA_ADMIN_KEY=<strong random key>
```

Clients may send either `X-Admin-Key: <key>` or `Authorization: Bearer <key>`.

Local smoke test:

```sh
npm run build:site
wrangler pages dev site --compatibility-date=2026-05-03 --port=8788 --r2 MEDIA_BUCKET --binding MEDIA_ADMIN_KEY=local-dev-key
curl http://127.0.0.1:8788/api/health
printf 'hello' | curl -X PUT http://127.0.0.1:8788/api/media/test.txt -H 'X-Admin-Key: local-dev-key' --data-binary @-
```

## Performance notes

- JSON requests use the current Git commit as a cache key instead of `Date.now()`.
- Cloudflare Pages reads `site/_headers` for cache and security headers.
- Cloudflare Pages reads `site/_redirects` for short paths like `/admin`, `/llms`, `/manifest`, and `/brands`.
- `site.css` and `site.js` use commit-versioned URLs and can be cached for one year.
