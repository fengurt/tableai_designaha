# IPTrust stack baseline

Verified: 2026-08-12

## Supported runtime

- Node.js: 24.19.0 LTS
- npm: 11.17.0
- Cloudflare Wrangler: 4.121.0
- Workers compatibility date: 2026-05-03
- JavaScript: native ESM, no frontend framework

The exact Node version lives in `.node-version` and `.nvmrc`. GitHub Actions
must read that file instead of carrying a separate runtime version.

## Application stack

- Static site generator: `scripts/build-site.mjs`
- Markdown rendering: `marked` 18.0.9
- Design token tooling: Style Dictionary 5.5.1
- Static hosting: Cloudflare Pages
- Edge API and MCP: Cloudflare Workers
- Operational data and history: D1
- Binary originals and derivatives: R2
- Search: D1 FTS, Vectorize and Workers AI
- Async work: Cloudflare Queues

Style Dictionary 5.5.1 is the minimum supported release because earlier 4.x
versions contain a published prototype-pollution vulnerability. The current
token build has been verified against 5.5.1.

## Sources of truth

1. Git stores source configuration, guidelines, code and asset manifests.
2. D1 stores runtime metadata, history, auth, audit and the outbox.
3. R2 stores immutable binary assets. Git and `site/` must not contain design
   PNG, JPG, WebP, AVIF, AI, PSD or PDF files.
4. `site/` is reproducible generated output. Cloudflare production must be
   deployed from the same Git commit that generated it.

## Deployment contract

- A push to `main` runs validation and the Cloudflare deployment workflow.
- The Cloudflare workflow builds the site, applies D1 migrations and seeds,
  deploys `iptrust-edge`, then deploys Pages.
- GitHub Pages remains a public fallback mirror, not the production origin.
- Direct local production deploys are emergency-only. The exact local source
  must be committed immediately afterward so production never leads Git.
- `npm run check:production` verifies the homepage, IP Evolution page, font
  catalog, edge health endpoint and the fullwidth-question canonical redirect.

## Upgrade policy

- Patch upgrades may land with the full validation suite and production probe.
- Node, Wrangler compatibility dates and package major versions require a
  preview deployment and route/API regression tests before production.
- Never use an unpinned `npx wrangler` in CI. The repository dependency is the
  deployment version.
