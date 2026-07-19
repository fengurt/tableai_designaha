# IPTrust Cloudflare platform

## Runtime

```text
Git configuration and manifests
  -> D1 metadata, versions, auth, audit and outbox
  -> Queues
  -> R2 originals and derivatives
  -> media.apuch.art
  -> REST API and MCP
```

- `apuch.art/api/v2/*` and `apuch.art/mcp` enter a narrow Cloudflare Pages gateway and continue to `iptrust-edge`.
- `media.apuch.art/*` reaches `iptrust-edge` directly through a Worker custom domain.
- `edge.apuch.art` is the health and recovery origin for the API Worker.
- Static pages remain on Cloudflare Pages and bypass the gateway.

## Resources

- Worker: `iptrust-edge`
- D1: `iptrust-library`
- R2: `iptrust-media`, `iptrust-media-preview`
- Vectorize: `iptrust-search-v1`
- Queues: `iptrust-write-sync`, `iptrust-processing`, `iptrust-dlq`
- Analytics Engine: `iptrust_edge_metrics`
- Search model: `@cf/baai/bge-m3`

## Asset contract

R2 objects are immutable and content addressed:

```text
private/{ip}/{assetId}/{sha256}/source.{ext}
public/{ip}/{assetId}/{sha256}/{variant}.{ext}
```

Git contains `data/assets/manifest.json` and per-IP manifests. CI rejects tracked PNG, JPG, WebP, AVIF, AI, PSD and PDF files, and also rejects these formats in the built site. Legacy `/assets/...` URLs resolve through D1 aliases and return permanent `308` redirects.

## Authentication

- API keys use `ipt_live_<id>_<secret>`.
- D1 stores only HMAC-SHA256 values made with `API_KEY_PEPPER`.
- Admin login requires a System Key and TOTP.
- Successful login creates `__Host-iptrust_session` for seven days with `HttpOnly`, `Secure` and `SameSite=Strict`.
- Private media links use `MEDIA_SIGNING_KEY` and expire after 10 minutes by default.
- Write calls require `Idempotency-Key`; updates and deletes require `If-Match`.

Secret values live in 1Password and GitHub Actions secrets. Required Worker secret names are `API_KEY_PEPPER`, `SESSION_PEPPER`, `MEDIA_SIGNING_KEY`, `AUDIT_PEPPER`, `ADMIN_TOTP_SECRET` and `GITHUB_SERVICE_TOKEN`. System API keys are HMAC records in D1; the Worker has no legacy plaintext admin-key secret.

## Operations

```bash
npx wrangler d1 migrations apply iptrust-library --remote --config edge/wrangler.toml
npx wrangler deploy --config edge/wrangler.toml
npx wrangler pages deploy site --project-name tableai-designaha --branch main
```

`GET /api/v2/admin/jobs` reports outbox and asset jobs. `POST /api/v2/admin/jobs/replay` requeues failed events and requires `jobs:manage`, an idempotency key and an authenticated session or Bearer key.

Set `SEMANTIC_SEARCH_ENABLED=false` to immediately fall back to lexical search when AI usage or budget requires it. Search requests already degrade to lexical results when Workers AI or Vectorize is unavailable.
