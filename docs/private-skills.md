# Private Skills

Private IP skills are stored as encrypted payloads and are never committed as plaintext.

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
