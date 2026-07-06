# ksamint Private Skills

Private ksamint skills are stored only as encrypted payloads.

Do not commit plaintext prompts here.

Use:

```bash
KSAMINT_SKILL_KEY="..." npm run encrypt:ksamint-skills -- /path/to/private-skills.md
```

The script writes:

- `ksamint/private/guofeng-writing-style.enc.json`
- `site/api/private/ksamint-skills.enc.json`

The encrypted site copy is readable only through `/api/skills/ksamint` after System API authentication.
