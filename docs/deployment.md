# Deployment and sync

Production is `https://apuch.art`, served by Cloudflare Pages and the
`iptrust-edge` Worker. GitHub `main` is the auditable source for code,
configuration, guidelines and manifests. D1 and R2 hold runtime state and
binary assets as described in `docs/stack-baseline.md`.

## Normal release

1. Start from current `origin/main` and preserve unrelated local work.
2. Run `npm ci` and `npm run build:site`.
3. Run `npm run validate:assets`, `validate:ip`, `validate:fonts` and
   `validate:routes`.
4. Run JavaScript syntax checks and Wrangler dry-run validation.
5. Commit source and reproducible generated output together.
6. Push `main`. `.github/workflows/deploy-cloudflare-pages.yml` applies D1
   changes, deploys the Worker and then deploys Pages from the same commit.
7. Run `npm run check:production` after the workflow succeeds.

Cloudflare Pages is the only publishing target. The former
`.github/workflows/deploy-pages.yml` GitHub Pages mirror was removed: it could not serve
`_worker.js`, `_routes.json`, `_headers` or `_redirects`, and the absolute `/assets/...` URLs in
the generated pages do not resolve under a `/tableai_designaha/` path prefix, so it published a
copy that could never work.

## Emergency deployment

A direct Wrangler deploy is allowed only to restore service. Immediately
rebuild and commit the exact source so `main`, Pages and Worker production no
longer diverge. Record the deployed Worker version and Pages deployment URL in
the incident notes.

## Admin writes

The admin UI writes authenticated updates to D1, records history and audit
events, and emits Git outbox work. D1 is authoritative for newer runtime
versions; an older Git snapshot must never overwrite a newer D1 record.

Secrets belong in 1Password and GitHub Actions secrets. Never save API keys,
TOTP seeds, Cloudflare tokens or signing keys in Git or generated site files.
