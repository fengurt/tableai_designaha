---
name: fengzhiyongzaoju-design
description: Apply the 峰值永造局 (The Transformation Company) 界格 brand — paper-white ground, ink-black serif type, gold ≤4%, zero radius/shadows, hairline rules. Use when building or styling 峰值永造局 surfaces, decks, mocks, or reviewing UI/copy for brand compliance.
---

# 峰值永造局 · 界格 Design System

**峰值永造局** (transition name: THE TRANSFORMATION COMPANY) — AI-native transformation delivery for UHNW family offices. Visual direction A「界格」: Swiss precision × Eastern restraint.

## Non-negotiable guardrails

- **Color**: paper `#FAF7F2` ground · ink `#1A1714` display · stone `#8C857A` captions · gold `oklch(.66 .09 80)` ≤4% accent only (mark, key numbers, rule ends). Gold **text** uses `--gold-deep` only. No gradients, no translucent overlays, no new colors.
- **Type**: Noto Serif SC 500–600 display (wide tracking) · Noto Sans SC 300 body (line-height 1.9) · Helvetica/system for numbers/Latin. Tracking: wordmark 0.34em · headings 0.08em · kickers 0.22em.
- **Form**: `--radius: 0` always · zero shadows · partitions via 0.5–1px rules only · no filled cards (exception: `#F2EFE8` blocks for dual-column contrast). ≥40% whitespace; one sentence or one number per slide/page.
- **Motion**: almost none — 0.2s ease opacity/translate only; no bounce, no loops. Hover: underline or ink deepen, never hue shift.
- **Voice**: 中文为主, English secondary (footnotes, citations). 我们 not 您尊享. No exclamation marks, emoji, or stacked adjectives. Ban 赋能/极致/颠覆/闭环. Every number cites its source.
- **Iconography**: no icon system — only the **界格徽记** (`jiege-mark*.svg`). Lists use `·` or numbers; ✓/✕ for contrast.

## Source of truth & artifacts

- **Brand readme**: `FENGZHI/readme.md` — content fundamentals, visual foundations, asset index.
- **CSS entry**: `FENGZHI/styles.css` → `@import tokens/*`.
- **Tokens**: `FENGZHI/tokens/` (colors, typography, spacing, fonts).
- **Components**: `FENGZHI/components/core/` — JiegeMark, Wordmark, Kicker, Stat, PageChrome (+ `.prompt.md` per component).
- **Guidelines**: `FENGZHI/guidelines/` — color, type, spacing, lockups, voice cards.
- **Slides**: `FENGZHI/slides/` — cover, section, stat, ladder (1280×720; scale 1.5× for 1920×1080).
- **Print handbook**: `FENGZHI/FENGZHI Brand Kit.html`.

## Workflow

1. Read `FENGZHI/readme.md` before proposing UI or copy.
2. For throwaway mocks/decks: copy assets from `FENGZHI/assets/`, link `FENGZHI/styles.css`, output static HTML.
3. For production: use tokens/components; never invent colors outside the palette.
4. Photography only (architecture, landscape, craft — cool, desaturated, generous whitespace). No AI illustration, stock clichés, or SVG art.

## Additional resources

- Full brand voice and visual spec: [reference.md](reference.md) (condensed from readme).
