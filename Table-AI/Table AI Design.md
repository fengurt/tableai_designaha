# Table AI — International Think Tank Design System

> **Style:** 国际智库咨询风格 · Altruistic · Authentic · Artistic · Elegant · Minimalist & Inspiring
>
> **Palette:** White · Deep Blue `#0A1626` · Gold `#A88B52`

This document is the authoritative visual language for **Table AI** surfaces — public consulting pages, policy briefs, rendered templates (Satori), and the analyst workspace. Implementation uses **CSS variables**, centralized design tokens, and component-level styling consistent with the project stack (React / Next.js playground, Handlebars templates, Satori JSX).

---

## Role (for contributors & AI assistants)

You are an expert frontend engineer, UI/UX designer, visual design specialist, and typography expert. Before proposing or writing code:

- Identify the tech stack and existing tokens, global styles, and component patterns.
- Clarify scope: single template, page redesign, token refactor, or net-new feature.
- Prioritize centralizing tokens, reusability, accessibility, responsive layouts, and deliberate aesthetic choices — not generic SaaS boilerplate.

Always preserve or improve accessibility, maintain visual consistency with this system, and leave the codebase cleaner than you found it.

---

## Design Philosophy

**Core Principles:** Altruistic, Authentic, Artistic, and Elegant.

Table AI exists to clarify complex global questions — trade, policy, markets, culture — for people who need trustworthy insight, not noise. The interface should feel like a **private reading room at an international institute**: calm, intentional, never flashy for its own sake. Every surface earns its place.

**Vibe:** Minimalist, Inspiring, Trustworthy, Elegant, Calm, Structured, Authoritative-without-arrogance.

**The Artistic Promise:** A refined canvas where **Deep Blue** offers structure and readability, **White** carries knowledge as the hero, and **Gold** punctuates intent — sparingly, like brass inscriptions on marble.

**Composition rule:** Deep Blue anchors structure; White carries content; Gold appears sparingly — **never more than ~8% of visible area**.

---

## Design Token System

### Colors

| Token | Hex | Role |
|-------|-----|------|
| `--white` | `#FFFFFF` | Primary canvas, card bodies, brief pages |
| `--mist` | `#F8F9FB` | Page background (off-white), alternate panels |
| `--deep-blue` | `#0A1626` | App shell, header, footer bands, primary text |
| `--deep-blue-soft` | `#132238` | Elevated panels, user message bubbles, dark sections |
| `--deep-blue-muted` | `#1E3354` | Borders on dark, hover states on navy surfaces |
| `--gold` | `#A88B52` | Accent: CTAs, focus rings, active nav, decorative rules, overlines |
| `--gold-light` | `#C4A574` | Hover gold, icon highlights, chart emphasis |
| `--gold-pale` | `#F5F0E8` | Tinted backgrounds, pull quotes, featured brief cards |
| `--border` | `#E2E8F0` | Structural dividers on light surfaces |
| `--slate` | `#5A6578` | Secondary text, metadata, captions |
| `--slate-light` | `#64748B` | Tertiary labels, timestamps |
| `--success` | `#2D6A4F` | Published, verified, saved confirmations |

**Color usage rules:**

1. **White space as luxury** — treat whitespace as an active design element; frame content generously.
2. **Deep Blue for structure** — primary typography, high-contrast borders, primary solid buttons, footer anchors.
3. **Gold for intent** — hover states, active links, overlines, key metrics, secondary CTAs; never full gold backgrounds.
4. **Contrast** — Deep Blue on White ≥ 12:1; gold for decoration, large text, and icons only (not small body copy on white).

### Typography

| Role | Family | Weight | Usage |
|------|--------|--------|-------|
| Display | [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) | 500–600 | Headlines, brief titles, report covers, hero quotes |
| Body (Latin) | [Outfit](https://fonts.google.com/specimen/Outfit) | 300–500 | UI, navigation, forms, English body |
| Body (CJK) | [Noto Serif SC](https://fonts.google.com/noto/specimen/Noto+Serif+SC) / Noto Sans SC | 400–500 | 中文正文与界面；与 Cormorant 气质协调 |
| Data | `ui-monospace, SF Mono, "IBM Plex Mono"` | 400 | Tables, citations, API fields, template variables |
| Overline | Outfit | 500 | `0.75rem`, uppercase, `letter-spacing: 0.08em`, gold or slate |

**Hierarchy:**

| Level | Size | Font | Notes |
|-------|------|------|-------|
| Display | 48–72px | Cormorant | `leading: 1.1`, `tracking: -0.02em` |
| Section | 30–36px | Cormorant | Pair with gold overline |
| Subsection | 20–24px | Outfit | `font-medium` |
| Body | 16–18px | Outfit / Noto | `line-height: 1.6`, `max-width: 65ch` |
| Caption | 12–14px | Outfit | Slate, often bilingual meta line |

**Bilingual pattern:** Gold overline in English (`POLICY BRIEF`) with Chinese subtitle below or beside (`政策简报`) in Noto Serif SC at one step smaller — never competing weights.

### Radius & Borders

- **Default radius:** `0px` or `2px` — crisp, gallery-like; `12px` only for interactive cards in the workspace (not editorial templates).
- **Border thickness:** `1px` standard; `2px` gold top rule on featured insights / preview states.
- **Border colors:** `#E2E8F0` structural; `#A88B52` accent; `#1E3354` on dark panels.

### Shadows & Depth

Shadows are nearly invisible. Prefer spacing and borders over elevation.

```css
/* Card — light surface */
box-shadow: none;
border: 1px solid #E2E8F0;

/* Card hover — editorial / workspace only */
box-shadow: 0 10px 30px -10px rgba(10, 22, 38, 0.05);
transform: translateY(-1px);

/* Workspace card */
box-shadow: 0 4px 24px rgba(10, 22, 38, 0.06);

/* Focus ring */
outline: 2px solid #A88B52;
outline-offset: 2px;
```

---

## Signature Elements

Mandatory motifs that define Table AI:

1. **Massive whitespace** — section padding `py-20` to `py-32`; margins should feel almost uncomfortable; this is the gallery.
2. **Gold overlines** — uppercase gold text with wide tracking above major headings (`POLICY INSIGHT · 政策洞察`).
3. **Typographic contrast** — large Cormorant serifs against clean Outfit / Noto sans body.
4. **Deep Blue anchors** — full-width footer bands, hero sidebars, or citation blocks in `#0A1626`.
5. **Editorial composition** — asymmetric layouts; imagery uncropped; text anchored to grid baselines.
6. **Partial rules** — delicate `1px` lines spanning `w-1/3` max, not full-bleed dividers.
7. **Gold as punctuation** — left border on pull quotes, top rule on featured briefs, dot separators in metadata.

---

## Layout Patterns

### Public / Marketing

```
┌──────────────────────────────────────────────────────────────┐
│  Header · wordmark · EN/中文 nav · primary CTA               │
├──────────────────────────────────────────────────────────────┤
│  Hero · overline · display headline · brief subcopy · CTA    │
├──────────────────────────────────────────────────────────────┤
│  Featured briefs (3-col) · gold top rule on lead card        │
├──────────────────────────────────────────────────────────────┤
│  Split: editorial image │ insight text (asymmetric)            │
├──────────────────────────────────────────────────────────────┤
│  Deep Blue band · stats / trust markers · gold numerals        │
├──────────────────────────────────────────────────────────────┤
│  Footer · institute links · bilingual legal                  │
└──────────────────────────────────────────────────────────────┘
```

### Analyst Workspace

```
┌──────────────────────────────────────────────────────────────┐
│  Header · session · export · language toggle                   │
├──────────────────┬───────────────────────────────────────────┤
│  Brief Library   │  Analysis Chat (primary)                  │
│  (38%)           │  (62%)                                    │
│  · search        │  · transcript                             │
│  · brief cards   │  · composer                               │
│  · tags (gold)   │  · parsed preview → Publish / Render      │
└──────────────────┴───────────────────────────────────────────┘
```

Mobile: stack — chat above library.

### Spacing rhythm

- Base grid: 8px / 12px hybrid.
- Micro: `gap-2`–`gap-4` · Element: `gap-6`–`gap-10` · Section: `py-20`–`py-32`.
- Text blocks: `max-w-prose` (65ch); wide grids: `max-w-6xl` centered.

---

## Components

### Buttons

| Variant | Style |
|---------|-------|
| **Primary** | Deep blue fill `#0A1626`, white text; hover `#15243B` or gold border glow |
| **Accent** | Gold fill `#A88B52`, deep blue text — one hero action per panel |
| **Secondary** | Transparent, `1px` gold border, gold text; hover fill gold, text white |
| **Ghost** | Transparent, deep blue text; hover gold text + subtle `translate-x-1` |

- Radius: `0`–`2px` (editorial) or `12px` (workspace only).
- Min height: `44px`; primary actions `48px`.
- Font: Outfit; small buttons may use uppercase + wide tracking.

### Cards

**Brief card (public):**
- White fill, `1px` border `#E2E8F0`, sharp corners.
- Title: Cormorant; meta: slate (date · region · topic).
- Featured: gold top rule `2px`, optional `--gold-pale` tint.

**Workspace card:**
- White fill, `1px` border `#E8EAED`, radius `12px`.
- Shadow: `0 4px 24px rgba(10, 22, 38, 0.06)`.
- Hover: gold left bar slide-in (`transition 200ms`).

### Chat (analyst workspace)

- **User:** deep blue bubble `#132238`, white text, right-aligned.
- **Assistant:** white bubble, left border `3px gold`, slate text.
- **Composer:** full-width white, gold focus ring.
- **Parsed preview:** gold top rule before publish/render action.

### Data tables

- Header row: deep blue text, `border-b 2px` gold at 30% opacity.
- Body: alternating white / `#F8F9FB`; no heavy grid lines — horizontal rules only.
- Numbers: tabular nums, monospace; key figures in gold (large text only).
- Row hover: `--gold-pale` background at 50% opacity.

### Citations & sources

- Blockquote: left border `3px #A88B52`, `--gold-pale` background, Cormorant italic.
- Footnote refs: superscript gold numerals; footnote body in slate at `0.875rem`.
- Source line: `Source · 来源:` prefix in overline style.

### Form inputs

- Background: white; border-bottom or full `1px #E2E8F0`.
- Text: deep blue; placeholder: slate.
- Focus: border gold, gold focus ring — no default browser outline.

### Navigation

- Light header: white background, deep blue links, gold underline on active.
- Dark header variant: `#0A1626` shell, white text, gold active indicator.
- Language toggle: ghost style; active locale in gold.

---

## Satori / Template Rendering

Templates rendered via Satori or Puppeteer **must** embed these tokens inline (no runtime CSS variables in PNG output):

```javascript
export const tableAiTokens = {
  colors: {
    white: '#FFFFFF',
    mist: '#F8F9FB',
    deepBlue: '#0A1626',
    deepBlueSoft: '#132238',
    gold: '#A88B52',
    goldPale: '#F5F0E8',
    slate: '#5A6578',
    border: '#E2E8F0',
  },
  fonts: {
    display: 'Cormorant Garamond',
    body: 'Outfit',
    cjk: 'Noto Serif SC',
  },
};
```

**Template rules:**
- Canvas default: white; social cards may use deep blue hero band (top 40%) + white body.
- Minimum font sizes: 14px body, 12px caption; preload Cormorant, Outfit, Noto for CJK.
- No gradients, blobs, or drop shadows in rendered output — flat, print-quality composition.
- Gold only on overlines, rules, key metrics, and small accent marks.

---

## Motion

**Philosophy:** Fluid, unobtrusive, calm — never playful.

| Pattern | Spec |
|---------|------|
| Page enter | fade + `translateY(8px)`, stagger children `60ms` |
| Color transitions | `300ms ease-out` |
| Layout / image reveal | `500ms ease-out` |
| Image hover | `scale(1.02)` max |
| Link hover | color → gold or fading underline |
| Publish success | gold pulse on preview card, brief slides into library |
| Reduced motion | respect `prefers-reduced-motion: reduce` — disable stagger and scale |

---

## Iconography

- Library: Lucide or Phosphor, stroke-width `1.25`, light weight.
- Color: deep blue default; gold for active / highlight.
- Size: `20px`, proportional to adjacent text.
- Do not enclose in heavy circles; let icons breathe on the canvas.

---

## Voice & Copy

- Warm, direct, never corporate: *"What should we analyze?"* not *"Enter query parameters"*.
- Authority without fear: *"Sourced from public records"* not *"WARNING: unverified"*.
- Bilingual when appropriate: lead with the user's locale; mirror key terms (EN · 中文).
- Empty states: one inspiring line + single gold CTA.
- Think-tank register: precise, neutral, evidence-forward — no hype adjectives.

---

## Accessibility

- Contrast: Deep Blue on White ≥ 12:1; verify gold-on-white for large text only.
- Focus: `2px` gold outline, `2px` offset.
- Touch targets ≥ `44px`.
- Tables: scope headers, caption element for screen readers.
- Decorative rules and ornaments: `aria-hidden="true"`.
- CJK: adequate line-height (`1.7`–`1.8`) for mixed-script paragraphs.

---

## Anti-Patterns

| Avoid | Why |
|-------|-----|
| Dense dashboards | Breaks minimalist institute feel |
| Gold backgrounds | Gold is punctuation, not wallpaper |
| Competing CTAs | One hero action per panel |
| Heavy drop shadows | Use whitespace and borders |
| Large border radii (`rounded-2xl`, pills) | Wrong register for editorial |
| Candy colors, purple gradients, Inter/Roboto defaults | Off-brand |
| Bouncing, squish, parallax | Undermines calm authority |
| Generic lock/shield icon spam | Trust through typography and copy |
| Full-bleed divider lines | Use partial rules or whitespace |

---

## Responsive Strategy

| Breakpoint | Behavior |
|------------|----------|
| Mobile | Single column; maintain large type; reduce section padding; strong left alignment |
| Tablet | Introduce asymmetric two-column layouts |
| Desktop | Full editorial grid; images may break container; workspace side-by-side |

---

## Design Token Reference

```javascript
export const tableAiTokens = {
  colors: {
    background: '#FFFFFF',
    backgroundAlt: '#F8F9FB',
    foreground: '#0A1626',
    foregroundSoft: '#132238',
    foregroundMuted: '#1E3354',
    muted: '#E2E8F0',
    mutedForeground: '#64748B',
    slate: '#5A6578',
    accent: '#A88B52',
    accentLight: '#C4A574',
    accentPale: '#F5F0E8',
    accentSecondary: '#0A1626',
    accentForeground: '#FFFFFF',
    success: '#2D6A4F',
    border: '#E2E8F0',
  },
  fonts: {
    heading: "'Cormorant Garamond', 'Noto Serif SC', serif",
    body: "'Outfit', 'Noto Sans SC', sans-serif",
    display: "'Cormorant Garamond', 'Noto Serif SC', serif",
    mono: "ui-monospace, 'SF Mono', 'IBM Plex Mono', monospace",
  },
  radius: {
    none: '0px',
    subtle: '2px',
    card: '12px',
  },
  transitions: {
    fast: '150ms ease-out',
    base: '300ms ease-out',
    slow: '500ms ease-out',
  },
  spacing: {
    section: ['5rem', '8rem'],
    card: ['2rem', '3rem'],
  },
};
```

---

## CSS Variables (implementation starter)

```css
:root {
  --white: #ffffff;
  --mist: #f8f9fb;
  --deep-blue: #0a1626;
  --deep-blue-soft: #132238;
  --deep-blue-muted: #1e3354;
  --gold: #a88b52;
  --gold-light: #c4a574;
  --gold-pale: #f5f0e8;
  --border: #e2e8f0;
  --slate: #5a6578;
  --slate-light: #64748b;
  --success: #2d6a4f;

  --font-display: 'Cormorant Garamond', 'Noto Serif SC', serif;
  --font-body: 'Outfit', 'Noto Sans SC', sans-serif;
  --font-mono: ui-monospace, 'SF Mono', 'IBM Plex Mono', monospace;
}
```

---

## File Map (this repo)

| Asset | Path |
|-------|------|
| Design system | `tableai-design.md` (this file) |
| Architecture PRD | `project-brief.md` |
| Playground UI | `playground/pages/`, `playground/styles.css` |
| Visual notes | `VISUAL_GUIDE.md`, `UI_UPGRADE.md` |

---

## Implementation Checklist

- [ ] Load Cormorant Garamond, Outfit, Noto Serif SC / Noto Sans SC
- [ ] Define `:root` CSS variables (or Tailwind theme extension)
- [ ] Apply gold ≤ 8% visible area rule in reviews
- [ ] Build brief card, chat bubble, and data table components
- [ ] Embed tokens in Satori templates for rendered output
- [ ] Verify WCAG contrast and `prefers-reduced-motion`
- [ ] Test bilingual overline + mixed EN/CN paragraphs
