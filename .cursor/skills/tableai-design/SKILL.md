---
name: tableai-design
description: Apply the Table AI design system — international think-tank aesthetic; white ground, Universe Deep Blue structure, Sundial Dark Gold accent ≤8%, Manrope type, 8px grid, micro radii. Use when building or styling Table AI surfaces (consulting pages, policy briefs, decks, workspace), writing copy, or reviewing UI for brand compliance.
---

# Table AI Design System

International think-tank register: a private reading room at a global institute — calm, intentional, never flashy. Four principles: **Altruistic · Authentic · Artistic · Elegant** (利他 · 真实 · 艺术 · 优雅).

## Non-negotiable guardrails

- **Color discipline**: white ground, Deep Blue carries content & structure, Gold punctuates intent — **gold ≤8% of visible area**, never a gold background. Use `--gold-deep` for gold *text* on white (contrast).
- **Whitespace as luxury**: ≥40% negative space; generous section padding; frame content like a gallery.
- **Form**: micro radii only (2–4px) or square — investor-grade restraint. No heavy shadows; prefer spacing + 1px rules. Partial rules over full-bleed dividers.
- **Type**: Manrope throughout (display 700 / heading 600 / body 400 / label 600 uppercase). Deep Blue on white ≥ 12:1; gold for large text/icons only, not small body.
- **Motion**: fluid, unobtrusive, calm — fades + small translate, `300ms ease-out`. Respect `prefers-reduced-motion`. Never playful.
- **Imagery**: real, cool, low-saturation photography with whitespace. No candy colors, purple gradients, or generic SaaS look.

## Core tokens (quick reference)

| Token | Hex | Role |
|---|---|---|
| `--white` | `#FFFFFF` | base / background |
| `--deep-blue` | `#0A1626` | 寰宇深蓝 — primary text, structure, brand |
| `--gold` | `#A88B52` | 日晷暗金 — CTA, key data, fine accents (≤8%) |
| `--gold-deep` | `#785F2A` | gold text on white |
| `--gold-mist` | `rgba(168,139,82,.08)` | active/focus tint |
| `--ink-variant` | `#44474C` | secondary text |
| `--outline-variant` | `#C5C6CD` | hairline |

Build with semantic aliases (`--bg`, `--surface`, `--text`, `--text-muted`, `--border`, `--accent`, `--accent-text`) where a surface may re-theme.

Spacing: 8px grid — `xs 4 · sm 8 · md 16 · lg 24 · xl 40 · xxl 80`px; container max `1200px`.

## Source of truth & artifacts

- **Tokens (bundled, portable)**: `tokens.json` next to this file — W3C DTCG snapshot; read first, works wherever installed.
- **Canonical source** (in repo): `TABLEAI/tokens/tableai.tokens.json`.
- **Brand spec**: `TABLEAI/TableAI_DESIGN.md` (philosophy, color/type/layout/component states, per-tool instructions). Logo: `TABLEAI/a2a_logo.png`.

## Component states

- **Default**: deep-blue border/text, pure white background.
- **Hover**: deepen text/border, or a hairline gold rule appears.
- **Active**: border switches to gold, or a faint gold-mist wash (5–10% opacity).
- **Loading/empty**: minimal deep-blue skeleton; avoid complex animation.

## Voice

Think-tank: precise, neutral, evidence-forward. Warm and direct, never corporate. Bilingual when apt (EN · 中文); lead with the locale, mirror key terms. No hype adjectives; cite sources.

## Additional resources

- Full spec (CSS vars, per-tool implementation): [reference.md](reference.md)
