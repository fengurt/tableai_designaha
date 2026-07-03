# VANAHOM — Design System

**凡纳弘途 · VANAHOM**
*Building Tomorrow, Today — 为者常成，行者常至*

A single reference for anyone designing or building VANAHOM surfaces — decks, briefs, brand pages, the workspace. Pairs with `vanahom_deck.html` (the living deck) and the logo set in `vanahom_logo/`.

> A Member of the Table AI Alliance — same think-tank register, its own ground.

---

## 1. Brand in one breath

VANAHOM is a mission-driven company that **rebuilds how future enterprises in hospitality & extended services are founded and run** — profitable growth, sustainable practice, in harmony with human wellbeing. It bridges three parties that rarely sit at one table: **enterprise · profit · all people** (企业、利润、所有人).

- **The name**
  - **VANA** — from the Sanskrit for *forest*: a stable, self-renewing ecosystem.
  - **HOM** — the root sound of the universe; the wisdom of *stripping back to the essential*.
  - **凡纳弘途** — *"博纳万物之凡，弘扬大道之途"* — gather the strength of the ordinary many, open a sustainable road to a greater future.
- **Two beliefs, always paired with their source**
  - **为者常成，行者常至 · Building Tomorrow, Today** — *《晏子春秋》*
  - **明德至善，渐入佳境 · To elevate the human experience** — *《大学》*
- **Two engines** — **AXISEE** (the AI-native "second brain") and **SANCTEM** (healing & wellness brand).

### Writing the name
- Brand: **VANAHOM** (all caps) · Chinese: **凡纳弘途** · together as **VANAHOM 凡纳弘途**.
- The wordmark is a fixed logotype — use the supplied artwork (`vanahom_logo/svg/vanahom-red.svg`), never re-typeset it.
- Sub-brands: **AXISEE** and **SANCTEM** (all caps). SANCTEM's "E" is built from *three* strokes — body, mind, spirit (身·心·灵).
- Slogan stays English in every locale: **Building Tomorrow, Today.**

---

## 2. Color

White is the room. **宏图红 (Hongtu Red)** carries the brand and punctuates intent; **苍岭灰 (Cangling Grey)** draws structure as hairlines and quiet secondary type. Red is an accent, never a flood.

### Brand core
| Token | Hex | Role |
|---|---|---|
| `--white` | `#FFFFFF` | Base / background — the gallery wall |
| `--hongtu` | `#B12137` | 宏图红 — **PRIMARY**: wordmark, key headings, rules, CTA (≤8% of area) |
| `--hongtu-deep` | `#8E1A2C` | Red **text on white** (contrast-safe for small type) |
| `--hongtu-wash` | `rgba(177,33,55,.06)` | Active / focus tint, never a solid red panel for text |
| `--cangling` | `#A8ADAD` | 苍岭灰 — **SECONDARY**: hairlines, eyebrows, captions, dividers |
| `--cangling-deep` | `#6E7475` | Grey text that must read at body size |

### Ink & neutrals
| Token | Hex | Role |
|---|---|---|
| `--ink` | `#211B1C` | Warm near-black — headings, primary text |
| `--ink-soft` | `#3A3334` | Body text |
| `--muted` | `#6E7475` | Secondary text / leads |
| `--mist` | `#F6F4F2` | Warm off-white tint band |
| `--line` | `rgba(33,27,28,.12)` | Hairline on white |
| `--line-grey` | `rgba(168,173,173,.5)` | Cangling hairline |

### SANCTEM sub-palette (wellness only)
SANCTEM lives in warm earth & clay — rammed-earth corridors, forest, stone. Use **only** on SANCTEM surfaces; never mix clay with Hongtu Red in the same block.
| Token | Hex | Role |
|---|---|---|
| `--clay` | `#7A6A56` | Earth / element labels (静气光流) |
| `--clay-soft` | `#9A8B76` | Secondary clay |
| `--sand` | `#EFEAE3` | Clay wash / card ground |

> **Guardrail** — Hongtu Red ≤ 8% of any view, never a red background behind running text. Build with semantic aliases (`--bg`, `--text`, `--text-muted`, `--border`, `--accent`, `--accent-text`) where a surface may re-theme (e.g. a SANCTEM slide).

---

## 3. Typography

An editorial pairing: a refined serif for voice and display, a quiet grotesk for structure. The VANAHOM logotype stands apart from both.

| Use | Family | Token |
|---|---|---|
| Display / editorial headings | **Cormorant Garamond** (EN) · **Noto Serif SC** (中) | `--serif` |
| Body / UI / labels | **Manrope** (EN) · **Noto Sans SC** (中) | `--sans` |
| Data / fine labels | **Manrope** 600 uppercase, `.18em` tracking | — |

**Rules**
- Display: serif, weights 400–600, `letter-spacing:-.01em`, `line-height:1.06`, `text-wrap:balance`. Large serif on white is the signature artistic move.
- Body: Manrope / Noto Sans SC, weights **400 / 500 / 600 only**. Sentence case. Ink on white ≥ 12:1.
- Eyebrows: the one uppercase exception — Cangling grey, `.18em` tracking, with a short leading red rule.
- Leads use `--muted` + `text-wrap:pretty`.

### Fluid scale
| Token | Clamp |
|---|---|
| `--t-mega` | `clamp(56px,11vw,150px)` |
| `--t-display` | `clamp(40px,7vw,92px)` |
| `--t-h1` | `clamp(32px,4.6vw,64px)` |
| `--t-h2` | `clamp(26px,3.4vw,44px)` |
| `--t-h3` | `clamp(20px,2.2vw,28px)` |
| `--t-lead` | `clamp(17px,1.6vw,21px)` |
| `--t-body` | `16px` |
| `--t-sm` / `--t-xs` | `14px` / `12px` |
| `--t-eyebrow` | `12px` (uppercase, `.18em`) |

---

## 4. Space, form, motion

- **Whitespace as luxury** — ≥ 40% negative space; frame each slide like a gallery wall. The deck is 16:9, content held in generous margins.
- **Spacing** (8pt): `--s-1`…`--s-9` = `4 · 8 · 12 · 16 · 24 · 40 · 64 · 96 · 128`px. Section rhythm `clamp(64px,10vw,140px)`.
- **Form** — square or micro radii only (0–2px). No shadows; structure comes from **1px hairlines** and space. Prefer partial rules over full-bleed dividers; a short Hongtu rule marks a beginning.
- **Motion** — calm and unobtrusive: fades + small translate, `320ms ease-out`. Respect `prefers-reduced-motion`. Never playful, never looping behind content.
- **Imagery** — real, warm, low-saturation photography (rammed earth, forest, water, candlelight) with breathing room. No candy colors, no SaaS gradients.

---

## 5. The deck (`vanahom_deck.html`)

A self-contained 16:9 deck — arrow-key / scroll navigation, print-friendly. Narrative arc:

1. **Cover** — wordmark · *Building Tomorrow, Today · 为者常成，行者常至*.
2. **Belief** — Tomorrow · Today · Yesterday; the bridge between enterprise, profit and all people.
3. **Brand & promise** — 明德至善，渐入佳境 · *To elevate the human experience*; the meaning of VANA · HOM · 凡纳弘途.
4. **Two engines** — AXISEE (AI second brain) · SANCTEM (healing & wellness).
5. **SANCTEM · 之道** — the poem: *a return to self, an art turned inward*.
6. **SANCTEM core** — 真我自在 · 静 Stillness / 气 Energy / 光 Light / 流 Flow.
7. **Wellness philosophy** — 中医五行 · 东方古法 · 当代医学.
8. **Brand matrix** — 社区级 / 城市级 / 度假区级 / 目的地级.
9. **Professional value** — Hospitality · Wellness · Education · AI (four pillars).
10. **Partnership** — owner-first long-termism.
11. **Team** — the international expert bench.
12. **Footprint & horizon** — projects underway.
13. **Close** — 谢谢 · Building Tomorrow, Today.

---

## 6. Logo & guardrails

- Primary: `vanahom_logo/svg/vanahom-red.svg` (Hongtu Red on white). Mono/quiet contexts: `vanahom-grey.svg`. SANCTEM: `sanctem-grey.svg`.
- Clear space: at least **one "V"-height** on all sides; never crowd the wordmark.
- **Never** recolor outside the palette, add gradients or shadows, stretch, rotate, or re-typeset the wordmark; never set running text in red; never put clay (SANCTEM) tones on a VANAHOM corporate slide.

---

## 7. Voice

Think-tank meets host: precise, warm, evidence-forward; East–West fluent. We speak with real results and named outcomes, people at the center. Bilingual when apt (中文 · EN) — lead with the locale, mirror key terms.

**Say** — *"owner-interest first, long-termism" · "data-driven, full-lifecycle asset management" · "for qualified projects we forgo management fees in no-profit periods" · "heal by returning to what was never lost."*
**Don't** — hype adjectives, "disrupt / revolutionary", empty empowerment jargon, or fear-selling. No unpublished financials, equity, or internal relationships.

---

## 8. Always / Never

**Always** — keep *all people* in the story beside enterprise and profit · speak with concrete results · let the room (white + space) do the work · pair each maxim with its classical source.

**Never** — flood with red · mix SANCTEM clay into corporate slides · crowd or recolor the wordmark · oversell, fear-sell, or pile on jargon.

---

*VANAHOM Design System · pairs with `vanahom_deck.html` · v0.4 · A Member of the Table AI Alliance*
