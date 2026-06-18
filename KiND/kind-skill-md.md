---
name: kind-brand
description: >-
  Apply the KiND (善渡科技) visual and verbal brand system to any KiND-branded
  output — websites, web apps, decks, documents, emails, UI components, and
  marketing copy. Use whenever building or styling something for KiND so color,
  typography, components, layout, and voice stay on-brand and consistent.
  Bundles a self-contained CSS token + component library (kind.css), a Tailwind
  preset, a living preview, and the full design reference.
version: 2.0.0
---

# KiND — Brand & Design System

> **for all, not for few.** KiND turns AI into a **Kind Workforce** anyone can hire.
> The name is the axis of everything: *kind* (warm, human-first) and *a kind of* (a new role).

This file is the operating guide. Read it first, then load the bundled files as the task needs them. **Do not invent tokens, colors, or components** — everything you need is in the files below.

---

## Folder layout

```
kind-brand/
├─ SKILL.md            ← you are here
├─ kind.css            ← tokens + component library (self-contained, no build step)
├─ tailwind.preset.js  ← Tailwind preset derived from the same tokens
├─ preview.html        ← living style guide; open to see everything rendered
└─ references/
   └─ design-system.md ← full reference: every hex, component anatomy, edge cases
```
> The directory name should match the skill `name` (`kind-brand`).

## Which file to use

| You are building… | Do this |
|---|---|
| Plain HTML / CSS | Link `kind.css`, start from the **HTML starter** below. |
| React / Vue / Tailwind | Import `tailwind.preset.js` as a preset **and** link `kind.css` (semantic utilities like `bg-bg`, `text-accent` resolve to CSS vars that live in `kind.css`). |
| Need an exact hex, a component's anatomy, or an edge case | Read `references/design-system.md`. |
| Want to verify what "on-brand" looks like | Open `preview.html`. |
| Briefing an agent that can't load CSS | The rules + token names in **this file** are enough to produce correct output by hand. |

---

## Non-negotiables (Always / Never)

**Always**
- Put **for all** at the center of the story.
- Speak with real results and numbers ("market-proven, 100,000+ units shipped").
- Let kindness be felt in voice *and* design — warm, human-first.
- Build with **semantic tokens** (`--accent`, `--text`, `--surface`…), not raw hex, so surfaces can be re-themed and dark mode just works.

**Never**
- Frame AI as **replacing people**. (It's a *Kind Workforce*, not a layoff.)
- Exaggerate, fear-sell, or pile on jargon.
- Disclose **unpublished financials, equity, or internal relationships**.
- Introduce colors outside the palette, add gradients/shadows to the logo, or set body copy in all-caps.

---

## The name (strict)

- Always write **KiND** — capital **K, N, D**, lowercase **i**. Never `Kind`, never `KIND`.
- The **N is set in accent (teal)**: `Ki<b>N</b>D` with `.nav-logo .mk b { color: var(--accent) }`.
- Pair with the Chinese name **善渡科技** (善 = kindness; 渡 = ferry across).
- The slogan stays **English in every locale**: *for all, not for few.*
- Clear space around the logo: at least **one K-height** on all sides.

## The three lines (always written this way)

Always **脑 / 身 / 智 · Mind / Body / Wisdom**:

- **Mind (脑)** — AI-driven brand PR & growth
- **Body (身)** — software-hardware & robotics OEM
- **Wisdom (智)** — expert consulting & education

Membership line, **verbatim**: *A Member of Table AI Alliance.*

---

## Color (how, not the full table)

Greens run deep ink → bright mint, low-saturation and warm; **coral is the one warm accent, used sparingly.**

Build from **semantic, theme-aware tokens** — they remap automatically under `<html data-theme="dark">`:

```
--bg --surface --surface-2   surfaces (page → card → tint band)
--text --text-muted --text-subtle   text hierarchy
--border --border-strong     hairlines
--accent (teal)  --accent-bright (mint)   brand accent
```

Rules of thumb: **teal is the primary brand**; reach for `--accent` rather than raw `--teal`. Use **coral only as a rare warm accent** (and for "don't" states). Default `::selection` is mint. Dark mode = set `data-theme="dark"` (or `"auto"`) on `<html>`. For the full annotated hex table (raw greens, warmth, neutrals) see `kind.css` `:root` or `references/design-system.md` §2.

## Typography

| Use | Family | Token |
|---|---|---|
| Display / headings | **Fraunces** (EN) · **Noto Serif SC** (中) | `--serif` |
| Body / UI | **Hanken Grotesk** (EN) · **Noto Sans SC** (中) | `--sans` |
| Code / labels | **Geist Mono** | `--mono` |

- Headings: serif, **weight 600**, `letter-spacing:-.02em`, tight leading, `text-wrap:balance`.
- Body: **two weights only — 400 / 500**. **Sentence case, never all-caps.** Eyebrows are the *only* uppercase element.
- Use the fluid scale tokens (`--t-display`, `--t-h1`…`--t-eyebrow`), never hard-coded font sizes.
- Load fonts with the known-good `<link>` in the starter below.

## Components (use these, don't reinvent)

From `kind.css`: `.eyebrow` (+`.center`, `.on-dark`), `.btn` (`--primary` `--dark` `--ghost` `--on-ink` `--lg`), `.chip`, `.tag` (`--teal` `--coral` `--mut`), `.nav` (`.scrolled`), `.card`, `.footer` (with `.wm` watermark glyph), and utilities `.wrap` / `.wrap-wide` / `.serif` / `.lead` / `.mono` / `.u-mist` / `.u-ink` / `.u-center` / `.u-mut` / `.divider` / `.sr-only`.

Tweaks: `data-corners="sharp"` squares off all radii; `data-motion="off"` disables reveal animation. Anatomy and hover behavior → `references/design-system.md` §5.

> **Motion:** reveals are **visible by default** and only animate once JS confirms a live render clock (`html.reveal-ready`). Reduced-motion and frozen frames just show content. No infinite decorative loops on content.

---

## Voice & copy

Warm authority · plain & concrete · inclusive · purposeful optimism. Like a trusted peer — not stiff, not boastful. Say what we delivered; people at the center.

**Lexicon — say:** 善工 · Kind Workforce · results · for all · 智业革命 (intelligence revolution) · 落地 (ship / land it) · 善渡 (ferry across) · sustainable · quality of life & productivity.

**Lexicon — avoid:** replacing workers · disrupt · 10x / ninja · *cheap* (say **affordable**) · empower / synergy buzzwords (赋能 · 抓手 · 闭环) · AI doom or hype.

Examples — **say:** *"we're paid on results," "make AI serve everyone."* **Don't:** *"revolutionary, disrupts the industry," "all-round empowerment solutions," "top-tier clients only."*

---

## HTML starter (copy to begin any page)

```html
<!DOCTYPE html>
<html lang="en" data-theme="auto">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KiND</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Hanken+Grotesk:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Noto+Serif+SC:wght@500;600&family=Noto+Sans+SC:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="kind.css" />
</head>
<body>
  <nav class="nav">
    <div class="nav-in">
      <span class="nav-logo"><span class="mk">Ki<b>N</b>D</span><span class="cn">善渡科技</span></span>
      <span class="nav-links"><a href="#">Link</a></span>
      <a class="btn btn--primary" href="#">Get started <span class="arw">→</span></a>
    </div>
  </nav>

  <header class="wrap" style="padding:var(--s-9) 0 var(--s-7)">
    <span class="eyebrow">Eyebrow · 标签</span>
    <h1 style="font-size:var(--t-display)">Headline goes here.</h1>
    <p class="lead" style="max-width:60ch">Lead paragraph — warm, plain, concrete.</p>
  </header>

  <footer class="footer">
    <div class="wrap">
      <span class="eyebrow on-dark">A Member of Table AI Alliance</span>
      <p class="serif" style="font-size:var(--t-h2);margin-top:var(--s-3)">for all, not for few.</p>
    </div>
    <span class="wm">善</span>
  </footer>
</body>
</html>
```

## React / Tailwind wiring

```js
// tailwind.config.js
import kind from './tailwind.preset.js';
export default {
  presets: [kind],
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
};
```

Then import `kind.css` once at the app root (e.g. `import './kind.css'`). The preset's semantic colors (`bg`, `surface`, `text`, `accent`, `border`) are mapped to CSS variables that **only exist when `kind.css` is loaded** — without it, theme-switching and the semantic utilities won't resolve.

---

## Deploying to another agent app

1. **Keep the folder intact** and drop `kind-brand/` into the target agent's skills directory (or wherever it loads skill packages). The agent reads `SKILL.md` first, then bundled files on demand.
2. **No build step needed** — `kind.css` is self-contained. (The `tokens/kind.tokens.json` referenced in comments is only for an optional regeneration pipeline; the inline `:root` block already carries every value. `preview.html`'s swatch grid degrades gracefully if that JSON is absent.)
3. **For agents that can't load CSS/JS**, this `SKILL.md` alone is a sufficient brief: the name rules, token names, type rules, component list, and voice lexicon let the agent produce on-brand output by hand.
4. **When extending the system**, add new tokens to `kind.css` `:root` (and `tailwind.preset.js` if used), document them in `references/design-system.md`, then bump `version` in this file's frontmatter so downstream agents can detect the change.

---

*KiND brand skill · pairs with `kind.css` + `references/design-system.md` · v2.0 · Hong Kong*
