---
name: iptrust-live-update
description: Use this skill when updating the IPTrust hub, refreshing IP introductions, adding or renaming IP brand folders, changing bilingual brand display, or preparing agent-readable references from the latest brand guideline files.
---

# IPTrust Live Update

## Purpose

Keep `岁知社 IPTrust` synchronized from source files to website, API, MCP, and agent references. The source of truth is the repository: `config/brands.json` plus each IP folder's latest guideline, token, and asset files.

## Workflow

1. Read `config/brands.json` and the changed IP folder before editing.
2. Put IP names in `config/brands.json`:
   - `name`: English/public name when available.
   - `nativeName`: Chinese name when available.
   - `primaryGuide`: the main `.md` or `.html` file used for live intro extraction.
3. Update the IP folder's README or primary guideline with the newest positioning, visual direction, and agent notes.
4. Run `npm run build:site`. The build extracts live bilingual intros from the newest primary guideline, creates `site/api/brands.json`, per-IP JSON, `llms.txt`, and publishes this skill under `site/skills/iptrust-live-update/SKILL.md`.
5. Run `npm --prefix mcp run build` when MCP behavior or brand metadata changed.
6. Verify `site/api/brands.json` contains each changed IP with `display.zh`, `display.en`, `intro.zh`, `intro.en`, `primaryGuide`, and `apiUrl`.

## Agent Reference Format

When an agent needs to quote an IP, use the same compact block copied by the website:

```text
IP: <localized name> / <secondary name>
IP ID / Asset Key: <stable id>
Intro: <live intro from latest guideline>
Brand API: <absolute /api/brands/{assetKey}.json URL>
```

Prefer the API JSON over stale memory. If the website is open, use the copy button on the IP card to capture the current reference.

## Bilingual Rules

- Chinese UI should lead with the Chinese IP name when one exists; English UI should lead with the English/public name.
- Keep card labels short: IP name, secondary name, status, guide count, API, copy.
- Do not expose prompt text on homepage cards.
- Avoid placeholder copy in public intros. If a guide has no useful intro, write a concise bilingual README first, then rebuild.
- State positioning, capabilities, value, and boundaries directly. Avoid formulaic contrast copy that negates one framing before asserting another.

## Checks

- `npm run build:site`
- `npm --prefix mcp run build`
- Browser check: homepage loads, language toggle changes card names, each IP card copy button writes a usable agent reference.
