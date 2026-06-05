# KiND — Design System

**善渡科技 · Kind Technology**
*for all, not for few.*

A single reference for anyone designing or building KiND surfaces. Pairs with `kind.css` (tokens + components) and the Brand Book (story, voice, lexicon).

---

## 1. Brand in one breath

KiND turns AI into a **Kind Workforce** anyone can hire — *AI for all, not for few.* The name is a pun and the axis of everything: **kind** (warm, human-first) and **a kind of** (a new role — the Kind Workforce).

- **Three lines** — always written 脑 / 身 / 智 · **Mind / Body / Wisdom**
  - **Mind (脑)** — AI-driven brand PR & growth
  - **Body (身)** — software-hardware & robotics OEM
  - **Wisdom (智)** — expert consulting & education
- **Membership** — always written *A Member of Table AI Alliance*

### Writing the name
- Always **KiND** — capital **K, N, D**, lowercase **i**. Never `Kind`, never `KIND`.
- Chinese full name is **善渡科技** (善 = kindness; 渡 = to ferry across — a boat of kindness).
- Slogan stays English in every locale: **for all, not for few.**

---

## 2. Color

Greens run from deep ink to bright mint, kept low-saturation and warm; coral is the one warm accent, used sparingly.

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

> `--accent` / `--accent-bright` default to teal/mint and are overridable (Tweaks). Build with the accent tokens, not raw teal, where a surface may be re-themed.

---

## 3. Typography

| Use | Family | Token |
|---|---|---|
| Display / headings | **Fraunces** (EN) · **Noto Serif SC** (中) | `--serif` |
| Body / UI | **Hanken Grotesk** (EN) · **Noto Sans SC** (中) | `--sans` |
| Code / labels | **Geist Mono** | `--mono` |

**Rules**
- Headings: serif, weight 600, `letter-spacing:-.02em`, `line-height:1.04`, `text-wrap:balance`.
- Body: two weights only — **400 / 500**. **Sentence case, never all-caps** (eyebrows are the one uppercase exception).
- Leads use `--muted` + `text-wrap:pretty`.

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

---

## 4. Spacing, radii, elevation, motion

**Spacing** (8pt-ish): `--s-1`…`--s-10` = `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`px. Section rhythm: `--s-section: clamp(72px,11vw,148px)`.

**Radii**: `--r-sm` 8 · `--r-md` 14 · `--r-lg` 20 · `--r-xl` 28 · `--r-2xl` 40 · `--r-pill` 999. *(Tweak `data-corners="sharp"` collapses these to near-square.)*

**Shadows** — soft, green-tinted: `--sh-1` hairline → `--sh-4` deep lift.

**Motion**: `--ease: cubic-bezier(.2,.7,.2,1)`, `--ease-out: cubic-bezier(.16,1,.3,1)`, `--dur: .7s`. Reveals are **visible by default** and only animate once JS confirms a live render clock (`html.reveal-ready`); reduced-motion and frozen frames just show content. No infinite decorative loops on content.

**Layout**: `.wrap` max `1200px`, `.wrap-wide` max `1440px`, side padding `clamp(20px,4vw,48px)`.

---

## 5. Components (from `kind.css`)

- **`.eyebrow`** — uppercase label with leading rule; `.center`, `.on-dark` variants.
- **`.btn`** — pill, weight 600, lifts `-2px` on hover, arrow nudges right. Variants: `--primary`, `--dark`, `--ghost`, `--on-ink`, `--lg`.
- **`.chip`** — bordered pill, accent on hover. **`.tag`** — small uppercase label: `--teal` / `--coral` / `--mut`.
- **`.nav`** — sticky, blurred paper; gains a hairline border `.scrolled`. Logo: `KiND` (N in accent) + Chinese name; underline-grow link hovers.
- **`.card`** — white, hairline border, lifts `-6px` with `--sh-3` on hover.
- **`.footer`** — ink background, oversized watermark glyph at low opacity.
- **Utilities** — `.serif`, `.mono`, `.lead`, `.u-mist`, `.u-ink`, `.u-center`, `.u-mut`, `.divider`, `.sr-only`.

---

## 6. Logo & guardrails

- Write **KiND** with the **N in accent (teal)**, paired with **善渡科技**.
- Clear space: at least **one K-height** on all sides.
- **Never** recolor outside the palette, add gradients/shadows, or alter the lowercase `i` / the caps.

---

## 7. Voice

Warm authority · plain & concrete · inclusive · purposeful optimism. Like a trusted peer — not stiff, not boastful. Say what we delivered; people at the center.

**Say** — *"market-proven, 100,000+ units shipped" · "we're paid on results" · "make AI serve everyone."*
**Don't** — *"revolutionary / disrupts the industry" · "all-round empowerment solutions" · "high-end, top-tier clients only."*

### Lexicon
- **We say** — 善工 · Kind Workforce · results · for all · intelligence revolution (智业革命) · ship / land it (落地) · ferry across (善渡) · sustainable · quality of life & productivity.
- **We avoid** — replacing workers · disrupt · 10x / ninja · cheap (say *affordable*) · empower / synergy buzzwords (赋能·抓手·闭环) · AI doom or hype.

---

## 8. Always / Never

**Always** — put *for all* at the center of the story · speak with real results and numbers · let kindness be felt in voice and design.

**Never** — frame AI as replacing people · exaggerate, fear-sell, or pile on jargon · disclose unpublished financials, equity, or internal relationships.

---

*KiND Design System · pairs with `kind.css` · v2.0 · Hong Kong*
