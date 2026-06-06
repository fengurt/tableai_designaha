# KiND Design — Full Reference

Deep-dive companion to `SKILL.md`. Machine-readable values live in `KiND/tokens/kind.tokens.json`.

## Color — full palette

### Brand greens
| Token | Hex | Role |
|---|---|---|
| `--ink` | `#052E28` | Deepest — dark backgrounds, text on light |
| `--forest` | `#063B33` | Secondary deep / default body text |
| `--pine` | `#0A5D50` | Mid green |
| `--teal` | `#0E8C7B` | **PRIMARY brand** |
| `--jade` | `#13A98C` | Brighter primary tint |
| `--mint` | `#2FD0B2` | Accent / highlight (and `::selection`) |
| `--seafoam` | `#7FE3CE` | Light accent |

### Warmth (use sparingly)
| Token | Hex | Role |
|---|---|---|
| `--coral` | `#E8765A` | Warm accent |
| `--coral-deep` | `#993C1D` | Coral text / "don't" states |
| `--coral-tint` | `#FAECE7` | Coral wash |

### Neutrals
| Token | Hex | Role |
|---|---|---|
| `--paper` | `#F8FBF9` | Primary background |
| `--mist` | `#E7F4F1` | Tint band |
| `--mist-2` | `#D7ECE6` | Deeper tint |
| `--cloud` | `#EEF3F1` | Neutral cool |
| `--muted` | `#52746C` | Secondary text |
| `--muted-2` | `#6E8C84` | Tertiary text |
| `--line` | `rgba(6,59,51,.12)` | Hairline |
| `--on-ink` | `#EAF6F2` | Text on dark |
| `--on-ink-mut` | `#9FC6BC` | Muted text on dark |

`--accent` / `--accent-bright` default to teal/mint and are overridable.

## Typography

| Use | Family | Token |
|---|---|---|
| Display / headings | Fraunces (EN) · Noto Serif SC (中) | `--serif` |
| Body / UI | Hanken Grotesk (EN) · Noto Sans SC (中) | `--sans` |
| Code / labels | Geist Mono | `--mono` |

- Headings: serif, weight 600, `letter-spacing:-.02em`, `line-height:1.04`, `text-wrap:balance`.
- Body: weights 400/500 only. Sentence case. Leads use `--muted` + `text-wrap:pretty`.

### Fluid scale
| Token | Clamp |
|---|---|
| `--t-mega` | `clamp(64px,13vw,200px)` |
| `--t-display` | `clamp(46px,8vw,104px)` |
| `--t-h1` | `clamp(38px,5.4vw,76px)` |
| `--t-h2` | `clamp(30px,4vw,52px)` |
| `--t-h3` | `clamp(22px,2.4vw,30px)` |
| `--t-h4` | `20px` |
| `--t-lead` | `clamp(18px,1.7vw,22px)` |
| `--t-body` | `17px` |
| `--t-sm` / `--t-xs` | `15px` / `13px` |
| `--t-eyebrow` | `12px` (uppercase, `.24em` tracking) |

## Spacing, radii, elevation, motion

- **Spacing** (8pt-ish): `--s-1`…`--s-10` = `4·8·12·16·24·32·48·64·96·128`px. Section: `--s-section: clamp(72px,11vw,148px)`.
- **Radii**: `--r-sm` 8 · `--r-md` 14 · `--r-lg` 20 · `--r-xl` 28 · `--r-2xl` 40 · `--r-pill` 999. `data-corners="sharp"` collapses to near-square.
- **Shadows** — soft, green-tinted: `--sh-1` hairline → `--sh-4` deep lift.
- **Motion**: `--ease: cubic-bezier(.2,.7,.2,1)`, `--ease-out: cubic-bezier(.16,1,.3,1)`, `--dur: .7s`. Reveals visible by default; respect reduced-motion. No infinite decorative loops on content.
- **Layout**: `.wrap` max `1200px`, `.wrap-wide` max `1440px`, side padding `clamp(20px,4vw,48px)`.

## Always / Never

- **Always** — put *for all* at the center of the story · speak with real results and numbers · let kindness be felt in voice and design.
- **Never** — frame AI as replacing people · exaggerate, fear-sell, or pile on jargon · disclose unpublished financials, equity, or internal relationships.
