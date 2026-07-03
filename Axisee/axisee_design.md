# Axisee Design System

> **The canonical design guideline for all Axisee products.**
> 单一可信来源 · Single Source of Truth for every Axisee UI (web, admin console, mobile member, 企微 sidebar tools).

Axisee（酒店盈利大师 / *Hotel Revenue Master*）is a centralized **AI General Manager** for hotel AI marketing, 私域营销 (private-domain marketing) and profit optimization. The product is organized around **three intelligent Agents**, and the entire visual identity is built on a disciplined **three-color brand system** — one color per Agent.

This document extracts **exact values** from two canonical sources and several product screenshots:

1. `Axisee 新 Logo 三色品牌系统.png` — official logo variations, color swatches (HEX / RGB / CMYK), usage ratios, application examples.
2. `Axisee - AI-Powered Hotel Revenue Master _ 酒店盈利大师 - HTML Landing Page.html` — the production CSS variables, type scale, spacing tokens, components, motion, and i18n pattern.
3. Product UI screenshots (admin console, mobile member, 企微 sidebar) — real layout & component conventions.

All token values below are taken verbatim from these sources. Where the brand image and the HTML agree, the value is authoritative.

---

## Table of Contents

1. [Brand Essence & Design Principles](#1-brand-essence--design-principles)
2. [Logo System](#2-logo-system)
3. [Color System](#3-color-system)
4. [Typography](#4-typography)
5. [Spacing & Layout](#5-spacing--layout)
6. [Components](#6-components)
7. [Motion](#7-motion)
8. [Internationalization (i18n)](#8-internationalization-i18n)
9. [Iconography](#9-iconography)
10. [Platform Conventions](#10-platform-conventions)
11. [Accessibility](#11-accessibility)
12. [Do's & Don'ts + The World-Class Bar](#12-dos--donts--the-world-class-bar)

---

## 1. Brand Essence & Design Principles

### Brand Promise

> **“让技术成为利他的力量”**
> **“Let technology become a force for good.”**

Axisee believes the value of technology lies in **creating real, measurable change for others** (利他 — altruism). Every interface should feel **trustworthy, professional, and quietly powerful** — the calm confidence of a great General Manager, not the noise of a startup dashboard.

### The Three Agents = The Three Colors

The brand is inseparable from its product architecture. Each Agent owns one brand color and one set of values:

| Agent | 中文 | English | Color | Values (价值主张) |
|---|---|---|---|---|
| **Marketing** | 智能营销 | Smart Marketing | Universe Dark Blue `#1A2B4A` | 科技 · 专业 · 信赖 (Technology · Professionalism · Trust) |
| **Private Domain** | 智能私域 | Smart Private Domain | Vanahom Red `#B12137` | 利他 · 真实 · 热忱 (Altruism · Authenticity · Warmth) |
| **Revenue** | 智能收益 | Smart Revenue | Promising Gold `#D4AF37` | 价值 · 增长 · 承诺 (Value · Growth · Commitment) |

### Design Principles

1. **Restraint over decoration / 克制优先.** Whitespace is the primary design material. The blue does the heavy lifting (~60%); red and gold are precise accents, never wallpaper.
2. **Three-color discipline / 三色纪律.** Color is semantic. Blue = structure & trust, Red = action & people, Gold = value & results. Never use a color outside its meaning.
3. **Editorial typography / 编排排版.** Large, confident headings with tight letter-spacing; serif numerals for hero metrics. The page should read like a premium business publication.
4. **Evidence, not hype / 用结果说话.** Lead with real numbers (`30%`, `¥9,000+`, `+200%`). Metrics are first-class visual citizens.
5. **Bilingual by default / 双语原生.** Every surface must support zh-CN and en gracefully; layout must survive both string lengths.
6. **Calm motion / 平静的动效.** Motion guides attention (fade-up reveals, gentle hover lift). Nothing bounces, spins, or distracts.

---

## 2. Logo System

### The Mark

The Axisee mark is a **tri-triangle + circle** composition: a central solid **circle** flanked/topped by **three triangles**, evoking three Agents orbiting one intelligent core. It reads as both a stylized “A” / mountain peak and a constellation of three forces converging.

### Logo Variants

From `Axisee 新 Logo 三色品牌系统.png`:

| Variant | Color | When to use |
|---|---|---|
| **Marketing / Primary** | Universe Dark Blue `#1A2B4A` | Default logo. Use everywhere unless there is a specific reason not to. |
| **Private Domain** | Vanahom Red `#B12137` | Private-domain / 引流 / 企微 contexts and red-themed surfaces. |
| **Revenue** | Promising Gold `#D4AF37` | Revenue / pricing / premium contexts and gold-themed surfaces. |
| **三色融合版本 (特殊场景)** | Multi-color (blue + red + gold triangles, charcoal circle) | **Special scenarios only** — brand-system pages, splash, “about the three Agents”. Not for everyday UI chrome. |

> **Rule:** The multi-color (“三色融合”) lockup is a *celebration* mark. Day-to-day product chrome (navbars, favicons, footers) uses the **single-color primary blue** mark.

### Clear Space & Sizing

- **Clear space:** keep a minimum padding equal to the radius of the central circle on all sides. Nothing (text, edges, other logos) intrudes.
- **Minimum sizes:**
  - Navbar mark: **36 × 36 px** (per landing page `.nav-logo svg`).
  - Standalone CTA / hero mark: **64 × 64 px** (per `.cta-logo svg`).
  - Favicon / app icon: render at 16, 32, 180 (Apple touch); never below 16 px.
- **Wordmark pairing:** the wordmark **“Axisee”** sits to the right of the mark with `gap: 12px`, `font-size: 28px`, `font-weight: 700`, `letter-spacing: -0.5px` (see `.nav-logo`).

### Inline SVG Markup (from the landing page)

The canonical primary mark used in the navbar, CTA and feature cards:

```html
<!-- Primary mark (Universe Dark Blue) -->
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" stroke="#1A2B4A" stroke-width="2"/>
  <path d="M12 6L17 15H7L12 6Z" fill="#1A2B4A"/>
</svg>
```

The three Agent glyph variants used inside feature cards (each Agent gets a distinct inner shape + its own color):

```html
<!-- 智能营销 Marketing — triangle, Universe Dark Blue -->
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" stroke="#1A2B4A" stroke-width="2"/>
  <path d="M12 6L17 15H7L12 6Z" fill="#1A2B4A"/>
</svg>

<!-- 智能私域 Private Domain — square, Vanahom Red -->
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" stroke="#B12137" stroke-width="2"/>
  <rect x="8" y="8" width="8" height="8" fill="#B12137"/>
</svg>

<!-- 智能收益 Revenue — diamond, Promising Gold -->
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" stroke="#D4AF37" stroke-width="2"/>
  <path d="M12 6L16 12L12 18L8 12L12 6Z" fill="#D4AF37"/>
</svg>
```

> **Note on color overrides:** to recolor the primary mark, change both the `stroke` (circle) and `fill` (triangle) to the same brand color. In the CTA, the SVG is given `fill: var(--color-universe-blue)` via CSS on the wrapper.

### Application Examples (from the brand sheet)

- **名片 (Business cards):** mark + “Axisee” wordmark + sub-label (智能营销 Agent / 智能私域 Agent / 智能收益 Agent), single-color per card.
- **应用图标 (App icons):** rounded-square tile filled with the Agent color, white mark centered.
- **按钮设计 (Buttons):** rounded pill/card buttons in the Agent color with white label + chevron.

---

## 3. Color System

### Full Palette

Values are taken verbatim from the brand sheet color swatches and the HTML `:root`. The brand image and HTML agree on all HEX values.

| Name | HEX | RGB | CMYK | Role | Usage | Agent |
|---|---|---|---|---|---|---|
| **Universe Dark Blue** | `#1A2B4A` | 26, 43, 74 | 100, 81, 33, 35 | **Primary** 主导色 | **~60%** | 智能营销 Marketing |
| **Vanahom Red** | `#B12137` | 177, 33, 55 | 18, 100, 85, 8 | **Brand** 品牌色 | **~25%** | 智能私域 Private Domain |
| **Promising Gold** | `#D4AF37` | 212, 175, 55 | 18, 25, 90, 0 | **Accent** 强调色 | **~15%** | 智能收益 Revenue |
| **Cangling Gray** | `#A8ADAD` | 168, 173, 173 | 37, 28, 29, 0 | Neutral 中性色 | as needed | — |
| **Deep Charcoal** | `#2C2C2C` | 44, 44, 44 | — | Text / dark UI | as needed | — |
| **BG Light** | `#F9FAFB` | 249, 250, 251 | — | Section / card background | as needed | — |
| **White** | `#FFFFFF` | 255, 255, 255 | — | Base background | as needed | — |

### The 60 / 25 / 15 Ratio

The brand system prescribes an approximate color budget. Treat it as a **discipline, not a pixel rule** (the brand sheet notes: “色彩比例为建议值，实际应用中可根据场景灵活调整” — ratios are recommended; adjust per scenario).

```
████████████████████████████████████  60%  Universe Dark Blue  — structure, trust, primary surfaces
██████████████                        25%  Vanahom Red         — action, people, private-domain accents
████████                              15%  Promising Gold      — value, results, premium accents
```

- **Blue (60%)** — navbars, primary buttons, dark hero/value sections, body structure.
- **Red (25%)** — accent lines, link underlines, primary CTAs in private-domain contexts, “people” signals.
- **Gold (15%)** — hero metric numbers, premium tags (高转化 / 高净值), reward/value highlights, separators.
- **Gray / charcoal / light** — neutral text, dividers, backgrounds; not counted in the tri-color budget.

### Semantic Usage

| Intent | Color | Example from sources |
|---|---|---|
| Primary action | Universe Dark Blue | `.btn-primary`, 上传素材 button, 使用此话术 |
| Accent / attention | Vanahom Red | `.accent-line`, nav link underline, `.accent-text`, 引流 red header & 新增触点 CTA |
| Value / success metric | Promising Gold | `.metric-number.gold`, 最佳触点, 转化率, 高转化 tag |
| Neutral / secondary | Cangling Gray | `.subtitle`, `.trust-title`, captions, secondary tags |
| Body text | Deep Charcoal `#2C2C2C` / `#555` | `body` color; paragraphs use `#555` |
| Surface | White / BG Light | base vs. alternating section background |

> **Section rhythm.** The landing page alternates `#FFFFFF` and `#F9FAFB` between sections, with one deep **Universe Dark Blue** “value” section for contrast. Reuse this rhythm.

### CSS Custom Properties (ready to paste)

```css
:root {
  /* Brand */
  --color-universe-blue: #1A2B4A;   /* primary  · 智能营销 */
  --color-vanahom-red:   #B12137;   /* brand    · 智能私域 */
  --color-promising-gold:#D4AF37;   /* accent   · 智能收益 */

  /* Neutrals */
  --color-cangling-gray: #A8ADAD;
  --color-deep-charcoal: #2C2C2C;
  --color-white:         #FFFFFF;
  --color-bg-light:      #F9FAFB;

  /* Text */
  --color-text:          #2C2C2C;   /* headings */
  --color-text-muted:    #555555;   /* body paragraphs */
  --color-text-subtle:   #A8ADAD;   /* captions, subtitles */

  /* Hairlines & overlays */
  --border-hairline:     rgba(0, 0, 0, 0.05);
  --border-card:         rgba(0, 0, 0, 0.03);
  --on-dark-80:          rgba(255, 255, 255, 0.8);
  --on-dark-60:          rgba(255, 255, 255, 0.6);
}
```

### Tailwind Theme (`extend.colors`)

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        // Brand — keyed to the three Agents
        "universe-blue": "#1A2B4A", // primary  · 智能营销 Marketing
        "vanahom-red":   "#B12137", // brand    · 智能私域 Private Domain
        "promising-gold":"#D4AF37", // accent   · 智能收益 Revenue
        "cangling-gray": "#A8ADAD", // neutral
        "deep-charcoal": "#2C2C2C",
        "bg-light":      "#F9FAFB",

        // Semantic aliases (recommended for app code)
        primary: "#1A2B4A",
        accent:  "#B12137",
        gold:    "#D4AF37",

        // Per-Agent palette object
        agent: {
          marketing: "#1A2B4A",
          private:   "#B12137",
          revenue:   "#D4AF37",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 4. Typography

### Font Family Stack

Verbatim from the HTML `--font-family`. A system-font stack tuned for crisp Latin + high-quality Simplified Chinese rendering:

```css
--font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
  "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
```

```css
body {
  font-family: var(--font-family);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
```

- **Latin:** `-apple-system` / `BlinkMacSystemFont` / `Segoe UI` (macOS, iOS, Windows).
- **Simplified Chinese:** `PingFang SC` (Apple), `Hiragino Sans GB`, `Microsoft YaHei` (Windows).
- **Serif numerals:** hero metrics use `'Times New Roman', Times, serif` for an editorial, “financial report” feel (see `.metric-number`).

### Type Scale (exact, from the HTML)

| Token | Size | Line-height | Weight | Letter-spacing | Source selector |
|---|---|---|---|---|---|
| **h1** | 64px | 1.2 | 700 | -1px | `h1` |
| **h2** | 48px | 1.3 | 700 | -0.5px | `h2` |
| **h3** | 32px | 1.4 | 600 | — | `h3` |
| **Subtitle** | 24px | inherit | 400 | — | `.subtitle` (color: Cangling Gray) |
| **Body (p)** | 18px | 1.8 | 400 | — | `p` (color `#555`) |
| **Feature title** | 28px | inherit | 600 | — | `.feature-title` |
| **Metric number** | 80px | 1 | 700 | -2px | `.metric-number` (serif) |
| **CTA title** | 56px | 1.3 | 700 | — | `.cta-title` |
| **Case quote** | 32px | 1.5 | 600 | — | `.case-quote` |
| **Eyebrow / category** | 14px | — | 700 | 2px (uppercase) | `.case-category` |
| **Trust / overline** | 16px | — | 600 | 2px (uppercase) | `.trust-title` |
| **Nav link** | 16px | — | 500 | — | `.nav-links a` |
| **Button** | 18px | — | 600 | — | `.btn` |

```css
h1 { font-size: 64px; line-height: 1.2; font-weight: 700; letter-spacing: -1px; }
h2 { font-size: 48px; line-height: 1.3; font-weight: 700; letter-spacing: -0.5px; }
h3 { font-size: 32px; line-height: 1.4; font-weight: 600; }
p  { font-size: 18px; line-height: 1.8; color: #555; }

.subtitle { font-size: 24px; color: var(--color-cangling-gray); font-weight: 400; }

.metric-number {
  font-size: 80px; font-weight: 700; line-height: 1; letter-spacing: -2px;
  font-family: 'Times New Roman', Times, serif;
}
```

### Bilingual Typography Considerations

- **Tighter tracking is Latin-tuned.** The negative `letter-spacing` on headings (`-1px` / `-2px`) is designed for Latin display sizes. For long zh-CN headings, the same tracking is acceptable but verify it never crowds CJK glyphs at large sizes.
- **CJK has no italics.** Use weight or color for emphasis in Chinese, not italic (italics from `.case-author` are for the Latin/Pinyin attribution).
- **Line length.** zh-CN packs more meaning per character; allow Chinese text blocks to be physically shorter than their English counterparts and design containers for the **longer** of the two strings.
- **Numerals.** Keep prices and metrics (`¥9,000+`, `30%`, `68%`) in the serif metric style across both languages for consistency.

---

## 5. Spacing & Layout

### Spacing Tokens (exact, from the HTML)

| Token | Value | Variable |
|---|---|---|
| xs | 8px | `--spacing-xs` |
| sm | 16px | `--spacing-sm` |
| md | 32px | `--spacing-md` |
| lg | 64px | `--spacing-lg` |
| xl | 120px | `--spacing-xl` |

```css
:root {
  --spacing-xs: 8px;
  --spacing-sm: 16px;
  --spacing-md: 32px;
  --spacing-lg: 64px;
  --spacing-xl: 120px;
}
```

- **Section vertical rhythm:** major sections use `padding: var(--spacing-xl) 0;` (120px top/bottom).
- **Section header → grid gap:** `margin-bottom: var(--spacing-xl)` under section headers.
- **Card inner padding:** feature cards use `48px`; case-study panel uses `80px`.

### Containers & Widths

| Element | Width | Notes |
|---|---|---|
| Design canvas (landing) | **1920px** | `body { width: 1920px }` — the landing was authored at fixed desktop width. |
| Content container | **1440px** | `.container { width: 1440px; padding: 0 var(--spacing-md) }` |
| Navbar height | **90px** | fixed top bar |
| Hero height | **1080px** | full-viewport hero |
| Hero split | 55% / 45% | `.hero-left` / `.hero-right` |
| Value split | 50% / 50% | `gap: 80px` |
| Case split | 45% / 55% | image / text |

> **For production apps:** treat 1440px as the **max content width** and make everything fluid below it. The 1920px body and fixed pixel heights are landing-page authoring artifacts — do not hardcode them in responsive product UI.

### Grid Patterns

```css
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}
```

- **Three-up feature grid** (one column per Agent) is the signature layout. `gap: 40px`.
- **Flex split layouts** for hero / value / case sections (`display: flex; align-items: center`).

### Border Radius

| Use | Radius |
|---|---|
| Buttons | **4px** (`.btn`) |
| Images / hero | **8px** |
| Feature cards | **12px** |
| Case-study container | **16px** |
| Icon wrappers | **20px** |
| Circular dots / status | **50%** |

### Elevation / Shadow Scale (exact, from the HTML)

| Level | Value | Used by |
|---|---|---|
| Hairline border | `1px solid rgba(0,0,0,0.05)` | navbar bottom, section dividers |
| Card border | `1px solid rgba(0,0,0,0.03)` | feature cards |
| Navbar (scrolled) | `0 4px 20px rgba(0,0,0,0.05)` | `.navbar.scrolled` |
| Icon wrapper | `0 8px 24px rgba(0,0,0,0.04)` | `.feature-icon-wrapper` |
| Card hover | `0 20px 40px rgba(0,0,0,0.06)` | `.feature-card:hover` |
| Hero image | `0 24px 64px rgba(0,0,0,0.08)` | `.hero-image` |
| Case container | `0 32px 80px rgba(0,0,0,0.06)` | `.case-content` |

> **Shadow philosophy:** shadows are **soft, large-radius, and very low-opacity** (≤ 8% black). Axisee elevation is felt, not seen — never use hard or dark drop shadows.

---

## 6. Components

### Buttons

Two canonical buttons. Both invert on hover (signature interaction).

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16px 36px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  text-decoration: none;
}

/* Primary — solid navy → outline-on-hover (inversion) */
.btn-primary {
  background-color: var(--color-universe-blue);
  color: var(--color-white);
  border: 2px solid var(--color-universe-blue);
}
.btn-primary:hover {
  background-color: transparent;
  color: var(--color-universe-blue);
}

/* Outline — charcoal outline → solid-on-hover (inversion) */
.btn-outline {
  background-color: transparent;
  color: var(--color-deep-charcoal);
  border: 2px solid var(--color-deep-charcoal);
}
.btn-outline:hover {
  background-color: var(--color-deep-charcoal);
  color: var(--color-white);
}
```

**Size variants** (via inline padding/size overrides in the source):

| Variant | Padding | Font-size | Where |
|---|---|---|---|
| Nav compact | `10px 24px` | 14px | navbar Free Trial |
| Default | `16px 36px` | 18px | hero actions |
| Large | `20px 48px` | 20px | final CTA |

> **Per-Agent / contextual buttons:** in private-domain surfaces the primary CTA may be **Vanahom Red** (see `引流触点配置中心` full-width 新增触点), and in 企微 (WeChat Work) tools the send/copy buttons follow the **WeChat green** convention — see [Platform Conventions](#10-platform-conventions). Always keep the navy primary as the default.

### Feature Cards (per-Agent accent)

```css
.feature-card {
  padding: 48px;
  background: var(--color-bg-light);
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.03);
  transition: transform 0.4s ease, box-shadow 0.4s ease;
  position: relative;
  overflow: hidden;
}
.feature-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.06);
}

/* Icon chip */
.feature-icon-wrapper {
  width: 80px; height: 80px;
  border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: var(--spacing-md);
  background: var(--color-white);
  box-shadow: 0 8px 24px rgba(0,0,0,0.04);
}

/* Per-Agent bullet dots */
.feature-list li::before {
  content: '';
  position: absolute; left: 0; top: 50%;
  transform: translateY(-50%);
  width: 8px; height: 8px; border-radius: 50%;
}
.feature-card.marketing .feature-list li::before { background-color: var(--color-universe-blue); }
.feature-card.private   .feature-list li::before { background-color: var(--color-vanahom-red); }
.feature-card.revenue   .feature-list li::before { background-color: var(--color-promising-gold); }
```

- Card title is colored with the Agent’s color (e.g. `color: var(--color-universe-blue)`).
- Hover lift = `translateY(-10px)` + soft shadow. This `-10px` lift is the standard card hover everywhere.

### Navbar (fixed, blur, scroll shadow)

```css
.navbar {
  position: fixed; top: 0;
  height: 90px;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  z-index: 1000;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  display: flex; align-items: center;
  transition: box-shadow 0.3s ease;
}
.navbar.scrolled { box-shadow: 0 4px 20px rgba(0,0,0,0.05); }

/* Animated underline on links (red) */
.nav-links a::after {
  content: '';
  position: absolute; bottom: -4px; left: 0;
  width: 0; height: 2px;
  background-color: var(--color-vanahom-red);
  transition: width 0.3s ease;
}
.nav-links a:hover::after { width: 100%; }
```

```js
// Add .scrolled after 50px of scroll
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});
```

### Section Header with Accent Line

The **accent line** (80×4px red bar) is a signature brand element above every section heading and the hero.

```css
.accent-line {
  width: 80px;
  height: 4px;
  background-color: var(--color-vanahom-red);
  margin-bottom: var(--spacing-md);
}
.section-header { text-align: center; margin-bottom: var(--spacing-xl); }
.section-header .accent-line { margin: 0 auto var(--spacing-md); } /* centered */
```

```html
<div class="section-header">
  <div class="accent-line"></div>
  <h2>
    <span class="lang-cn">三大智能 Agent 体系</span>
    <span class="lang-en">Three Intelligent Agent Systems</span>
  </h2>
</div>
```

### Metric Blocks (editorial numbers)

```css
.metric-number {
  font-size: 80px; font-weight: 700; line-height: 1;
  letter-spacing: -2px;
  font-family: 'Times New Roman', Times, serif;
}
.metric-number.gold { color: var(--color-promising-gold); }
.metric-number.red  { color: var(--color-vanahom-red); }

.metric-desc { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
.metric-sub  { font-size: 16px; color: rgba(255,255,255,0.6); }

.metric-separator {
  width: 2px; height: 100px;
  background-color: var(--color-promising-gold);
  opacity: 0.3; margin: 20px 0;
}
```

- Metrics live on a **Universe Dark Blue** section. Numbers are **serif**, colored gold or red; descriptions white; sub-labels `rgba(255,255,255,0.6)`.

### Case-Study Layout

```css
.case-content {
  display: flex;
  background: var(--color-white);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,0.06);
}
.case-left  { width: 45%; min-height: 600px; background-size: cover; background-position: center; }
.case-right { width: 55%; padding: 80px; display: flex; flex-direction: column; justify-content: center; }

/* Eyebrow with leading red tick */
.case-category {
  font-size: 14px; font-weight: 700; letter-spacing: 2px;
  color: var(--color-cangling-gray);
  display: flex; align-items: center; gap: 12px;
}
.case-category::before { content: ''; width: 32px; height: 2px; background-color: var(--color-vanahom-red); }

/* Pull-quote with oversized serif quotation mark */
.case-quote { font-size: 32px; line-height: 1.5; font-weight: 600; position: relative; }
.case-quote::before {
  content: '"'; position: absolute; left: -40px; top: -20px;
  font-size: 80px; color: rgba(0,0,0,0.05); font-family: serif;
}

/* Tri-color stat dots */
.stat-item:nth-child(1) .stat-icon { background-color: var(--color-promising-gold); }
.stat-item:nth-child(2) .stat-icon { background-color: var(--color-universe-blue); }
.stat-item:nth-child(3) .stat-icon { background-color: var(--color-vanahom-red); }
```

### Tri-color Dots (brand signature)

Three small dots in blue/red/gold order signal “the three Agents”. Used in the CTA and as stat markers.

```css
.cta-dot { width: 12px; height: 12px; border-radius: 50%; }
.cta-dot:nth-child(1) { background-color: var(--color-universe-blue); }
.cta-dot:nth-child(2) { background-color: var(--color-vanahom-red); }
.cta-dot:nth-child(3) { background-color: var(--color-promising-gold); }
```

> **Canonical order is always: Blue → Red → Gold** (Marketing → Private → Revenue).

### Language Switcher

```css
.lang-switch {
  background: none; border: none;
  font-size: 16px; font-weight: 600;
  color: var(--color-cangling-gray);
  cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  transition: color 0.3s ease;
}
.lang-switch:hover { color: var(--color-deep-charcoal); }
.lang-switch .active { color: var(--color-deep-charcoal); }
```

```html
<button class="lang-switch" onclick="toggleLang()">
  <span class="cn active">中</span> / <span class="en">EN</span>
</button>
```

### Tags / Pills (from screenshots)

Product surfaces use small rounded tags to label assets and customers:

| Tag meaning | Color treatment | Example |
|---|---|---|
| High-conversion / premium value | **Gold** fill/tint | 高转化, 高净值 |
| Category / neutral | Gray tint | 节日促销, 会员活动, 商旅 |
| People / repeat / private-domain | **Red** tint | 复购客户, 销售话术 |
| Channel / info | **Blue** tint | 数据报告, NFC 贴片 |

Tag spec: small radius (~4–6px), `12–14px` text, generous horizontal padding, low-saturation tint backgrounds with the brand color as text.

---

## 7. Motion

### Keyframes (exact, from the HTML)

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeLeft {
  from { opacity: 0; transform: translateX(50px); }
  to   { opacity: 1; transform: translateX(0); }
}
```

- **Hero entrance is staggered** with `fadeUp`:
  - title: `animation: fadeUp 1s 0.2s forwards;`
  - subtitle: `fadeUp 1s 0.4s forwards;`
  - actions: `fadeUp 1s 0.6s forwards;`
- **Hero image** enters with `fadeLeft 1.2s 0.4s forwards;`

### Scroll Reveal

```css
.scroll-reveal {
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.8s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.scroll-reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

```js
const reveals = document.querySelectorAll('.scroll-reveal');
const windowHeight = window.innerHeight;
const elementVisible = 150; // reveal when 150px into viewport
reveals.forEach((el) => {
  if (el.getBoundingClientRect().top < windowHeight - elementVisible) {
    el.classList.add('visible');
  }
});
```

### Easing & Durations

| Token | Value | Use |
|---|---|---|
| **Signature easing** | `cubic-bezier(0.25, 0.8, 0.25, 1)` | buttons, scroll reveal — smooth ease-out |
| Color/UI transition | `0.3s ease` | nav links, lang switch, navbar shadow |
| Button transition | `0.3s cubic-bezier(0.25, 0.8, 0.25, 1)` | `.btn` |
| Card transition | `0.4s ease` | feature-card transform + shadow |
| Reveal | `0.8s cubic-bezier(0.25, 0.8, 0.25, 1)` | scroll-reveal |
| Entrance | `1s`–`1.2s` (staggered `0.2s`) | hero |

> **Motion rules:** ease-out only (never bouncy/elastic), short for interactions (0.3–0.4s), longer for reveals (0.8–1.2s). Respect `prefers-reduced-motion` by disabling transforms.

```css
@media (prefers-reduced-motion: reduce) {
  *, .scroll-reveal { animation: none !important; transition: none !important; transform: none !important; opacity: 1 !important; }
}
```

---

## 8. Internationalization (i18n)

Axisee is bilingual (**zh-CN default**, **en**). The canonical pattern toggles a `data-lang` attribute on a root element and shows/hides `.lang-cn` / `.lang-en` spans.

### The Pattern (exact, from the HTML)

```css
/* Show only the active language */
[data-lang="en"] .lang-cn,
[data-lang="cn"] .lang-en {
  display: none !important;
}
```

```html
<body data-lang="cn">
  ...
  <h1 class="hero-title">
    <span class="lang-cn">让每家酒店都有<br>AI 运营官</span>
    <span class="lang-en">Every Hotel Deserves an<br>AI Operations Officer</span>
  </h1>
  ...
</body>
```

```js
function toggleLang() {
  const body = document.body;
  const next = body.getAttribute('data-lang') === 'cn' ? 'en' : 'cn';
  body.setAttribute('data-lang', next);
  document.querySelector('.lang-switch .cn').classList.toggle('active', next === 'cn');
  document.querySelector('.lang-switch .en').classList.toggle('active', next === 'en');
}
```

### Design Rules for Bilingual UI

1. **Author both strings together.** Every translatable node ships a `.lang-cn` and `.lang-en` sibling (or, in a framework, an i18n key). Never leave one language untranslated.
2. **Design for the longer string.** English is usually longer; buttons, nav items, and cards must not break when switching. Test both at every breakpoint.
3. **`<br>` per language.** Line breaks are language-specific — place them inside each `.lang-*` span (note how the hero’s line breaks differ between zh and en).
4. **Default = zh-CN.** `data-lang="cn"` is the initial state; the switcher shows `中 / EN`.
5. **In React/Next:** prefer a real i18n library, but keep the **same semantics** — a single language state at the root, with parallel content keyed by locale, and a switcher styled like `.lang-switch`.

---

## 9. Iconography

**Icon system: [Remix Icon](https://remixicon.com/) v4.6.0** — loaded by the landing page:

```html
<link href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.6.0/remixicon.min.css" rel="stylesheet">
```

```html
<i class="ri-line-chart-line"></i>     <!-- revenue / growth -->
<i class="ri-user-heart-line"></i>     <!-- private domain / people -->
<i class="ri-megaphone-line"></i>      <!-- marketing -->
```

Usage guidance:

- **Style:** prefer the **`-line` (outline)** weight for UI chrome; reserve **`-fill`** for active/selected states and emphasis.
- **Size:** match the type — inline icons at 16–20px; feature icon glyphs at 40px inside the 80px `.feature-icon-wrapper`.
- **Color:** icons inherit the contextual brand color (Agent color in feature contexts; charcoal/gray in neutral UI). Apply via `color`.
- **Brand mark ≠ icon.** The tri-triangle Axisee mark is the **logo**, drawn as bespoke SVG (Section 2). Do not substitute a Remix Icon for the logo, and do not use the logo mark as a generic UI icon.
- **Consistency:** use Remix Icon exclusively across products so visual weight and metrics stay uniform. Do not mix icon libraries.

---

## 10. Platform Conventions

Axisee spans three surface types. Each inherits the brand system but has distinct layout conventions (drawn from the product screenshots).

### A. Desktop Admin Console (营销中心 / 引流触点配置 / 素材库)

The “command center” for hotel operators. Information-dense but calm.

- **Top app bar:** full-width **Universe Dark Blue** (`#1A2B4A`) bar with the Axisee mark + module name on the left, and help/notifications/user menu on the right. In **private-domain / 引流** modules the bar may switch to **Vanahom Red** to signal context.
- **Left sidebar:** collapsible **tree navigation** (categories → subcategories with counts, e.g. `海报设计 (156)`) plus a “hot tags / 热门标签” cloud. Light background, charcoal text.
- **Toolbar row:** search field (left) + filter dropdowns (按时间 / 按效果 / 按类型) + view toggle (grid/list) + primary navy action button (e.g. 上传素材) on the right.
- **Content:** responsive **card grid** of assets (thumbnail + title + tags + stats like 浏览/转化 + row actions 复用 / 编辑 / 删除). Pagination centered at the bottom (`16 条/页`, total count on the right).
- **Stat header cards:** dashboards lead with a row of 4 KPI cards — icon + label + **large number** (gold for the “best/highlight” metric, e.g. 最佳触点, 转化率).
- **Config panels:** detail/config on the right (form fields, type toggles, auto-tags, live data stats), often paired with a visual (e.g. floor map of 触点分布). Full-width contextual CTA at the very bottom (e.g. red 新增触点).

### B. Mobile-First Member / 极简“傻瓜”视图 (品牌资产库移动端)

For frontline staff and members — **radically simple, big tap targets, one task per screen.**

- **Immersive header:** photographic hotel background with a dark overlay; centered title (e.g. 品牌资产库) + back + search.
- **Quick-entry tiles:** a row of 4 **gradient blue** tiles (icon + title + sub-label + chevron) for the main destinations (话术模板 / 视觉素材 / 数据报告 / 培训资料).
- **List cards:** thumbnail + title + tags (高转化 etc.) + stats (使用次数, ★ rating) + bookmark/share actions. Sections like 本周热门 🔥 and 最近使用 with “查看更多 / 全部 ›”.
- **Bottom tab bar:** 首页 / 资产库 / 创作 / 我的 with line icons; active tab in brand color.
- **Principle:** minimize cognitive load — large type, generous spacing, no dense tables. This is the “极简傻瓜” (foolproof) standard.

### C. 企微 (WeChat Work) Sidebar Tools (智售助手)

Narrow embedded panels inside WeChat Work for in-chat selling.

- **Width:** narrow single column (phone-width), top title bar + overflow menu.
- **Customer profile card:** avatar + name + customer tags (高净值 gold, 商旅 blue, 复购客户 red) + key facts (上次入住 / 累计消费 / 偏好房型).
- **Recommendation cards:** small cards with a **colored left border** (red for 推荐话术, blue for 智能推荐), title + preview + two actions.
- **Action buttons follow WeChat green.** Inside the 企微 ecosystem, primary in-chat actions (复制 / 发送 / 使用此话术) use **WeChat green** rather than navy, to match the host environment’s affordances. This is the one sanctioned deviation from the navy-primary rule — it applies **only** inside 企微 surfaces.
- **Content blocks:** 推荐话术 → 智能推荐 → 高清报价图 grid, each with a “更多 ›” affordance.

> **Cross-platform rule:** brand colors, type scale, spacing tokens, radii, and motion are **shared** across A/B/C. Only the *host conventions* (top-bar color context, WeChat-green actions, immersive mobile headers) differ.

---

## 11. Accessibility

### Contrast (WCAG)

Approximate contrast ratios against common backgrounds (sRGB):

| Foreground | On White `#FFF` | On BG Light `#F9FAFB` | On Navy `#1A2B4A` | Verdict |
|---|---|---|---|---|
| Universe Dark Blue `#1A2B4A` | ~12.6:1 ✅ | ~11.9:1 ✅ | — | Excellent for text & large UI |
| Deep Charcoal `#2C2C2C` | ~13.2:1 ✅ | ~12.5:1 ✅ | low ❌ | Body text on light only |
| Body gray `#555` | ~7.4:1 ✅ | ~7.0:1 ✅ | — | OK for body text |
| Vanahom Red `#B12137` | ~6.4:1 ✅ | ~6.1:1 ✅ | low ❌ | OK for text/accents on light |
| **Promising Gold `#D4AF37`** | **~1.9:1 ❌** | ~1.8:1 ❌ | ~6.6:1 ✅ | **Fails as text on white** |
| Cangling Gray `#A8ADAD` | ~2.3:1 ❌ | ~2.2:1 ❌ | ~5.4:1 ✅ | Decorative/large on light only |
| White `#FFF` | — | — | ~12.6:1 ✅ | Primary text on navy |

**Gold is the critical case.** ⚠️ Promising Gold **must not be used for body text or small text on white/light backgrounds** — it fails WCAG AA. Acceptable gold uses:

- Large display **metric numbers** on a **dark/navy** background (as in the value section) — passes.
- Decorative accents, separators, dots, icon fills, tag tints — non-text.
- Gold on dark navy for emphasis text — passes.

When you need a gold-toned **readable** label on light, darken it (e.g. toward `#8A6D1F`) or place it on a dark chip. Cangling Gray is for **large/secondary** text only (subtitles, overlines) — never small body copy on white at AA.

### Focus States

- Always provide a **visible focus ring** on interactive elements (the source relies on hover; production must add `:focus-visible`).

```css
:where(a, button, .btn, input, select, [tabindex]):focus-visible {
  outline: 2px solid var(--color-universe-blue);
  outline-offset: 2px;
  border-radius: 4px;
}
```

- On dark/navy surfaces use a light ring: `outline: 2px solid var(--color-promising-gold);` for visibility.

### Tap Targets & Hit Areas

- Minimum **44 × 44 px** touch target on mobile / 企微 surfaces (the default `.btn` at `16px 36px` padding comfortably exceeds this; ensure icon-only buttons are padded to 44px).
- Maintain `gap`/spacing between adjacent tappable items (lists, tag rows) so targets don’t collide.

### Additional

- Don’t encode meaning in color alone — pair the tri-color Agent dots with labels/icons (color-blind safety; blue/red are distinguishable but red/gold less so).
- Respect `prefers-reduced-motion` (Section 7).
- Provide `alt` text for all imagery; the brand mark SVGs should include `role="img"` + `<title>` when standalone.

---

## 12. Do's & Don'ts + The World-Class Bar

### Do's ✅

- **Do** lead with Universe Dark Blue and let red/gold be precise accents (~60/25/15).
- **Do** keep one color per Agent: blue=Marketing, red=Private, gold=Revenue, in that order.
- **Do** use the red **80×4px accent line** above section headings.
- **Do** use **serif numerals** for hero/value metrics.
- **Do** give cards the standard **-10px hover lift** with a soft, low-opacity shadow.
- **Do** alternate `#FFFFFF` / `#F9FAFB` sections, with occasional deep-navy sections for drama.
- **Do** ship both `.lang-cn` and `.lang-en` for every string and design for the longer one.
- **Do** use Remix Icon (line weight) consistently; use the SVG tri-triangle for the logo.
- **Do** use the signature easing `cubic-bezier(0.25, 0.8, 0.25, 1)`.

### Don'ts ❌

- **Don't** use Promising Gold for body or small text on white (fails contrast).
- **Don't** flood surfaces with red or gold — they are accents, not fills.
- **Don't** reorder the tri-color sequence (always Blue → Red → Gold).
- **Don't** use the multi-color (“三色融合”) logo for everyday UI chrome — primary blue mark only.
- **Don't** introduce new brand hues, gradients-as-brand, or a second icon library.
- **Don't** use hard/dark drop shadows, bouncy motion, or decorative animation.
- **Don't** swap the navy primary button for green outside of 企微/WeChat surfaces.
- **Don't** hardcode the landing page’s 1920px body / fixed heights into responsive product UI.

### The World-Class Bar

Axisee UI is held to a **premium, editorial, restrained** standard. A screen is “done” when it would look at home in a high-end business publication or a top-tier enterprise SaaS:

1. **Restraint.** If you can remove an element, color, or border and lose nothing — remove it. The interface is mostly calm space and confident type.
2. **Generous whitespace.** Sections breathe at 120px; cards at 48px; nothing feels cramped. White space signals quality and trust.
3. **Precise tri-color accents.** Color appears with intent — an accent line, a metric, a dot, a single button. The reader instantly knows which Agent they’re in.
4. **Editorial typography.** Large headings with tight tracking; clear hierarchy; comfortable 1.8 body line-height. Text is the design.
5. **Serif numerals for metrics.** Results are presented like a financial report — large, serif, colored gold/red — making outcomes feel authoritative.
6. **Soft, expensive elevation.** Shadows are large-radius and ≤ 8% black; surfaces float gently.
7. **Calm, intentional motion.** Content fades up into place; cards lift slightly on hover; nothing competes for attention.
8. **Bilingual parity.** Both zh-CN and en feel equally first-class — never a machine-translated afterthought.

> When in doubt, choose the quieter, more disciplined option. Axisee earns trust by looking like it already runs the best hotels in the world.

---

*Sources of truth: `Axisee 新 Logo 三色品牌系统.png` (brand & color), `Axisee — AI-Powered Hotel Revenue Master 酒店盈利大师 — HTML Landing Page.html` (tokens, components, motion, i18n), and product UI screenshots (admin console, mobile member, 企微 sidebar). All token values above are extracted verbatim from these sources.*
