# Cloudflare Pages deploy

This repo still deploys to GitHub Pages. Cloudflare Pages can run in parallel for CDN, cache headers, redirects, and future edge functions.

## GitHub settings

Add these repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional repository variable:

- `CLOUDFLARE_PAGES_PROJECT` defaults to `iptrust`

## Build

Cloudflare Pages serves the generated `site/` folder.

```sh
npm run build:site
npx wrangler pages deploy site --project-name=iptrust --branch=main
```

## Performance notes

- JSON requests use the current Git commit as a cache key instead of `Date.now()`.
- Cloudflare Pages reads `site/_headers` for cache and security headers.
- Cloudflare Pages reads `site/_redirects` for short paths like `/admin`, `/llms`, `/manifest`, and `/brands`.
