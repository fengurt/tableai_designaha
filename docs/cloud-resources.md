# Cloud Resources Inventory

This workflow pulls domain/resource metadata from Cloudflare and Tencent Cloud, updates due-date status on every run, encrypts the inventory, and exposes it only through the protected System API.

> **Not currently served.** `/api/resources` was a Pages Function. Pages Functions are no longer
> part of this project — `site/_worker.js` takes precedence over a `functions/` directory, and
> `site/_routes.json` never routed that path — so it has not answered a request in production.
> The removed implementation is in Git history (`functions/api/resources.js`). To bring it back,
> port it into `edge/src/api.js` under `/api/v2/` and set `RESOURCE_ENCRYPTION_KEY` on the
> `iptrust-edge` Worker. The sync and encryption steps below still work.

## Data Flow

1. Run `npm run sync:cloud-resources`.
2. The script pulls:
   - Tencent Cloud domain registrations via `tccli domain DescribeDomainNameList`
   - Tencent DNSPod zones via `tccli dnspod DescribeDomainList`
   - Cloudflare zones, Pages projects, R2 buckets, and KV namespaces when `CLOUDFLARE_API_TOKEN` is available
3. The script calculates `dueDate`, `daysUntilDue`, and `dueStatus` on every run.
4. The script writes only encrypted output:
   - `data/cloud-resources.enc.json`
   - `site/api/cloud-resources.enc.json`
5. `/api/resources` decrypts and returns the inventory only when called with a valid System API key.

## Required Secret

Use one shared encryption secret in local sync and Cloudflare Pages:

```bash
export RESOURCE_ENCRYPTION_KEY="..."
npm run sync:cloud-resources
```

Cloudflare Pages must also have `RESOURCE_ENCRYPTION_KEY` set. If it is missing, `/api/resources` falls back to `ADMIN_API_KEY`, but using a dedicated key is preferred.

## Cloudflare Token

Set one of:

```bash
export CLOUDFLARE_API_TOKEN="..."
```

or store the token in 1Password under one of these fields:

- `op://Personal/Cloudflare/api codex`
- `op://Personal/Cloudflare/apikey`
- `op://Personal/Cloudflare/cursor-api-01`

## IP Domain Matching

The script emits `ipDomainCandidates` only. It does not mutate `config/brands.json` and does not automatically bind domains to IPs. Promote a candidate to a real mapping only after manual review.
