# Private Skills

Private IP skills are stored as encrypted payloads and are never committed as plaintext.

> **Not currently served.** The `/api/skills/ksamint` and `PATCH /api/manage/brands/<slug>`
> endpoints below were Pages Functions. Pages Functions are no longer part of this project —
> `site/_worker.js` takes precedence over a `functions/` directory, and `site/_routes.json`
> never routed these paths — so they have not answered a request in production. The removed
> implementations are in Git history (`functions/api/skills/ksamint.js`,
> `functions/api/manage/brands/[slug].js`). To bring them back, port them into
> `edge/src/api.js` under `/api/v2/` and add the secrets to the `iptrust-edge` Worker.
> The encryption pipeline below still works and its output is still committed.

## Ksamint

Source prompts are parsed into separate skills, encrypted, and served only after API authentication.

```bash
KSAMINT_SKILL_KEY=... npm run encrypt:ksamint-skills -- /path/to/pasted-text.txt
```

The same `KSAMINT_SKILL_KEY` must be set as a Cloudflare Pages secret. `RESOURCE_ENCRYPTION_KEY` or `ADMIN_API_KEY` can be used as a fallback secret, but a dedicated `KSAMINT_SKILL_KEY` is preferred.

API access:

```bash
curl -H "X-Admin-Key: $ADMIN_API_KEY" https://apuch.art/api/skills/ksamint
curl -H "X-Admin-Key: $ADMIN_API_KEY" "https://apuch.art/api/skills/ksamint?id=<skill-id>"
```

MCP tools:

- `list_private_skills`: lists protected ksamint skill metadata only.
- `get_private_skill`: decrypts and returns one protected skill by id.

## Direct IP Profile Editing

Brand profile edits use `PATCH /api/manage/brands/<slug>` with `X-Admin-Key`. Cloudflare Pages must have `ADMIN_API_KEY` plus `GITHUB_ADMIN_TOKEN` or `GITHUB_TOKEN` so the API can commit `config/brands.json` back to GitHub.
