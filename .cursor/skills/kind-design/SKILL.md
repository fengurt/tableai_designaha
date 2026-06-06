---
name: kind-design
description: Apply the KiND (善渡科技) design system — brand greens, coral accent, Fraunces/Hanken/Geist type, components, and voice. Use when building or styling KiND surfaces, writing KiND copy, or reviewing UI/marketing for brand compliance.
---

# KiND Design System

KiND turns AI into a **Kind Workforce** anyone can hire — *AI for all, not for few.* Build warm, human-first, low-saturation green surfaces. *A Member of Table AI Alliance.*

## Non-negotiable guardrails

- Write the name **KiND** — capital **K, N, D**, lowercase **i**. Never `Kind`, never `KIND`.
- Logo: **KiND** with the **N in accent (teal)**, paired with **善渡科技**. Clear space ≥ one K-height. Never recolor outside the palette, add gradients/shadows, or alter the `i`/caps.
- Slogan stays English in every locale: **for all, not for few.**
- Three lines always written 脑 / 身 / 智 · **Mind / Body / Wisdom**.
- Body copy is **sentence case, never all-caps** (eyebrows are the only uppercase exception).
- Coral is the *one* warm accent — use sparingly. Everything else lives in the greens.

## Core tokens (quick reference)

| Token | Hex | Role |
|---|---|---|
| `--teal` | `#0E8C7B` | **PRIMARY brand** |
| `--mint` | `#2FD0B2` | accent / `::selection` |
| `--ink` | `#052E28` | dark backgrounds, text on light |
| `--forest` | `#063B33` | default body text |
| `--paper` | `#F8FBF9` | primary background |
| `--coral` | `#E8765A` | warm accent (sparingly) |

Build with `--accent` / `--accent-bright` (default teal/mint), not raw teal, where a surface may be re-themed.

Type: **Fraunces** + Noto Serif SC (display, weight 600, `letter-spacing:-.02em`), **Hanken Grotesk** + Noto Sans SC (body, weights 400/500 only), **Geist Mono** (code/labels).

## Source of truth & artifacts

- **Tokens (bundled, portable)**: `tokens.json` — next to this file; a W3C DTCG snapshot for exact values, the fluid type scale, spacing, radii, shadows, motion, and the `semantic` group (light `$value` + dark `$extensions['kind.dark']`). Read this first; it works wherever the skill is installed.
- **Live tokens (optional)**: the `kind-design` MCP server exposes the same tokens via `get_token` / `validate_color` / resource `kind://tokens` for programmatic queries.
- **Canonical source + CSS** (in the `tableai_designaha` repo): tokens `KiND/tokens/kind.tokens.json`, component CSS `KiND/kind.css`, Tailwind `KiND/tailwind.preset.js` (`presets:[kind]`; `bg-bg`/`text-text`/`text-accent` follow the theme), living preview `KiND/preview.html` (dark-mode toggle), build `npm run build:tokens`.

## Theming (light / dark)

Build with **semantic tokens**, not raw palette, on any surface that may re-theme: `--bg` `--surface` `--surface-2` `--text` `--text-muted` `--text-subtle` `--border` `--border-strong` `--accent` `--accent-bright`. Dark mode is opt-in via `<html data-theme="dark">` (or `"auto"` to follow the OS). In dark, accent brightens (teal → mint) for contrast. Raw palette tokens (`--teal`, `--ink`, …) stay fixed and are fine for brand-locked marks like the footer.

## Components (from `kind.css`)

`.eyebrow` (uppercase label + leading rule; `.center`/`.on-dark`) · `.btn` (pill, weight 600, lifts -2px; variants `--primary` `--dark` `--ghost` `--on-ink` `--lg`) · `.chip` · `.tag` (`--teal`/`--coral`/`--mut`) · `.nav` (sticky blurred paper, hairline `.scrolled`) · `.card` (white, hairline, lifts -6px) · `.footer` (ink bg, oversized watermark glyph) · utilities `.serif` `.mono` `.lead` `.u-mist` `.u-ink` `.u-center` `.u-mut` `.divider` `.sr-only`.

## Voice

Warm authority · plain & concrete · inclusive · purposeful optimism — a trusted peer, not stiff or boastful.

- **Say** — "market-proven, 100,000+ units shipped" · "we're paid on results" · "make AI serve everyone" · 善工 / Kind Workforce / 落地 / 善渡.
- **Don't** — "revolutionary / disrupts the industry" · "all-round empowerment" · "high-end clients only" · replacing workers · 10x/ninja · 赋能/抓手/闭环 · AI doom or hype.

## Additional resources

- Full color/type/spacing tables, motion, and layout: [reference.md](reference.md)
- Narrative, story, and full lexicon: `KiND/KiND Design.md` (repo root)
