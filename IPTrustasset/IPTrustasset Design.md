# IPTrustasset — Design System

**Version:** 1.0  
**Status:** Canonical brand reference  
**Last updated:** 2026-05-26

This document is the single source of truth for visual identity, composition, and interaction language across the IPTrustasset portal (web), marketing surfaces, and future native clients. All new UI work should align with this system before shipping.

---

## 1. Brand essence

IPTrustasset is a **global hybrid digital asset platform** — a vault for trusted media, not a generic file dump. The interface should feel like a **curated gallery** backed by serious infrastructure: calm, precise, and human.

### Four pillars

| Pillar | Meaning in product | Design expression |
|--------|-------------------|-------------------|
| **Altruistic** | Assets serve teams and creators; access is fair, rights are clear | Generous whitespace, readable hierarchy, no dark patterns; CC0 / license surfaced honestly |
| **Authentic** | Real replication status, real storage — no fake polish | Status badges tell the truth; loading states are explicit; copy is direct, never hype |
| **Artistic** | Materials are visual first; browsing is inspiration | Waterfall masonry, cinematic lightbox, editorial typography, image-led tiles |
| **Elegant** | Enterprise trust without corporate coldness | Restrained motion, gold accents as jewelry not paint, serif display paired with clean UI sans |

### Tone keywords

> Minimalist · Inspiring · Composed · Trustworthy · Gallery-grade

Avoid: neon cyberpunk, purple SaaS gradients, cluttered dashboards, “AI slop” aesthetics (Inter + generic blue), or playful toy UI that undermines IP seriousness.

---

## 2. Color system

### 2.1 Canonical palette

Three anchors — **White**, **Deep Blue**, **Gold** — plus derived neutrals. No fourth accent color without design review.

| Token | Hex / value | Role |
|-------|-------------|------|
| `--color-white` | `#FFFFFF` | Primary surface (light mode), inverse text on deep blue, card highlights |
| `--color-deep-blue` | `#0A1626` | Primary brand ground: backgrounds, shell, hero depth |
| `--color-gold` | `#A88B52` | Primary accent: CTAs, active nav, key metrics, focus rings |
| `--color-gold-light` | `#C4A574` | Hover / highlight on gold elements |
| `--color-gold-muted` | `#7A6844` | Borders on gold, disabled gold states |
| `--color-blue-mid` | `#142337` | Elevated panels on deep blue |
| `--color-blue-soft` | `#1E3250` | Hover states, secondary surfaces |
| `--color-text-primary` | `#F8F6F2` | Body on dark (warm white, not pure #FFF) |
| `--color-text-secondary` | `rgba(248, 246, 242, 0.58)` | Meta, labels, placeholders |
| `--color-border` | `rgba(255, 255, 255, 0.08)` | Dividers, card edges |
| `--color-border-strong` | `rgba(255, 255, 255, 0.14)` | Modals, focused containers |

**Semantic colors** (use sparingly; never compete with gold):

| Token | Hex | Use |
|-------|-----|-----|
| Success | `#5ECF9A` | Replication synced |
| Warning | `#E8B339` | Pending sync |
| Danger | `#F07178` | Blocked / error |

### 2.2 Composition rules

```
Deep Blue (#0A1626)  → 90% of canvas (ground, sidebar, topbar)
White / warm white   →  Typography, key labels, empty space “breathing room”
Gold (#A88B52)       → ≤ 8% of visible pixels (accent only — never fill large areas)
```

**Light mode (future):** White ground, Deep Blue text, Gold accent — invert ratios but keep the same three anchors.

**Gradients:** Only subtle radial washes on Deep Blue (gold at 6–12% opacity). No multi-stop rainbow gradients.

### 2.3 Implementation note (current codebase)

The live portal (`apps/web/src/app/globals.css`) uses a **dark “Obsidian Vault”** theme with gold `#C9A962`. When refactoring tokens, map to canonical values:

| Current (v0 UI) | Canonical target |
|-----------------|------------------|
| `--bg: #060608` | `--color-deep-blue: #0A1626` |
| `--gold: #C9A962` | `--color-gold: #A88B52` |
| `--text: #F4F1EA` | `--color-text-primary: #F8F6F2` |

Migration is cosmetic-only; component structure (waterfall, lightbox, glass shell) stays.

---

## 3. Typography

### 3.1 Typefaces

| Role | Family | Weights | Fallback (zh-CN) |
|------|--------|---------|------------------|
| **Display** | Cormorant Garamond | 500, 600; italic optional for quotes | Noto Serif SC |
| **UI / body** | Outfit | 300, 400, 500, 600 | Noto Sans SC |
| **Mono / IDs** | JetBrains Mono | 400, 500 | — |

**Do not use:** Inter, Roboto, Arial, system-ui as primary brand fonts.

### 3.2 Scale (fluid where noted)

| Name | Size | Weight | Font | Use |
|------|------|--------|------|-----|
| Display XL | `clamp(2.5rem, 5vw, 3.75rem)` | 500 | Display | Home hero |
| Display LG | `1.75–2rem` | 500 | Display | Page titles |
| Heading | `1.35rem` | 500 | Display | Topbar, section heads |
| Body LG | `1.05rem` | 400 | UI | Lead paragraphs |
| Body | `0.875–0.95rem` | 400 | UI | Default UI copy |
| Caption | `0.65–0.75rem` | 500 | UI | Badges, eyebrows, meta |
| Asset ID | `0.68rem` | 400 | Mono | Permanent numbers (e.g. IPT-STOCK-00001) |

### 3.3 Typography principles

- **Eyebrows:** Uppercase, letter-spacing `0.12–0.18em`, gold or muted — one line max.
- **Display lines:** Tight leading (`1.08–1.25`); prefer sentence case over ALL CAPS.
- **Hierarchy:** One display moment per viewport; everything else steps down clearly.
- **Chinese:** Noto Sans SC / Noto Serif SC at equal x-height; avoid mixing weights arbitrarily.

---

## 4. Spatial system & composition

### 4.1 Grid & layout

| Breakpoint | Shell | Content |
|------------|-------|---------|
| Desktop `≥769px` | Sidebar 260px + main | Waterfall: 4 columns (~260px min) |
| Tablet `769–1100px` | Same | Waterfall: 3 columns |
| Mobile `≤768px` | Topbar + bottom nav | Waterfall: 2 columns; lightbox stacks |

**Portal shell areas:** `sidebar | topbar / main` — see `PortalShell.tsx`.

### 4.2 Spacing scale (4px base)

| Token | Value | Typical use |
|-------|-------|-------------|
| `--space-1` | 4px | Tight inline gaps |
| `--space-2` | 8px | Chip padding |
| `--space-3` | 12px | Card inner gaps |
| `--space-4` | 16px | Standard padding unit |
| `--space-5` | 20px | Section gaps |
| `--space-6` | 24px | Main padding horizontal |
| `--space-8` | 32px | Hero spacing |
| `--space-10` | 40px | Section separation |

**Composition mantra:** *One focal column, asymmetric balance, generous vertical rhythm.* Home hero left-aligned max-width ~720px; gallery full-bleed within main padding.

### 4.3 Radius & elevation

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 10px | Inputs, small cards |
| `--radius` | 14px | Cards, waterfall tiles |
| `--radius-pill` | 999px | Buttons, chips, search |

**Elevation:** Prefer **glass + border** over heavy drop shadows. Modal lightbox: deep shadow + thin gold hairline (`rgba(168, 139, 82, 0.08)`).

---

## 5. Motion & interaction

### 5.1 Easing

| Token | Value | Use |
|-------|-------|-----|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrances, hovers |

### 5.2 Patterns

| Pattern | Duration | Spec |
|---------|----------|------|
| Waterfall tile enter | 650ms | Fade + `translateY(28px)` + scale `0.96→1`; stagger 45ms × index |
| Waterfall hover | 350ms | Lift `-4px`, image scale `1.06`, gold border glow |
| Lightbox open | 350–450ms | Backdrop fade; frame scale `0.94→1` |
| Nav hover | 250ms | Subtle `translateX(2px)` on sidebar links |
| Shine sweep | 800ms | Diagonal highlight on tile hover (single pass) |

**Accessibility:** Honor `prefers-reduced-motion: reduce` — collapse animations to ≤10ms (already in globals.css).

### 5.3 Signature interactions

1. **Waterflow gallery** — CSS masonry (`columns`), not JS layout libraries; smooth scroll, lazy images.
2. **Cinematic lightbox** — Split: media stage (65%) + metadata sidebar (340px); Esc closes; body scroll locked.
3. **Glass search bar** — Sticky, blur 16px, gold focus ring on input.

---

## 6. Components (portal)

| Component | Path | Notes |
|-----------|------|-------|
| Portal shell | `components/portal/PortalShell.tsx` | Sidebar, topbar, bottom nav |
| Home waterfall | `components/portal/HomeGallery.tsx` | Hero + stats + gallery |
| Library | `components/portal/MaterialPortal.tsx` | Search + filters + waterfall |
| Waterfall grid | `components/portal/WaterfallGallery.tsx` | Reusable masonry |
| Preview lightbox | `components/portal/AssetPreviewPanel.tsx` | Full asset preview |
| Replication badge | `components/ui/ReplicationBadge.tsx` | synced / pending / blocked |
| Sign-in | `app/[locale]/sign-in/` | Vault card, gold CTA |

### 6.1 Buttons

| Variant | Background | Text | Border |
|---------|------------|------|--------|
| Primary | Gold gradient → `#A88B52` | Deep blue `#0A1626` | `--color-gold-muted` |
| Secondary | `rgba(255,255,255,0.04)` | Warm white | `--color-border` |
| Ghost | transparent | Muted | none |

Pill shape always (`border-radius: 999px`).

### 6.2 Badges & chips

- **Replication:** Uppercase caption, semantic color at 12% opacity background + 25% border.
- **Filter chips:** Inactive = glass; active = gold tint + gold border.
- **Tags (lightbox):** `chip-gold` — gold at 10% fill.

### 6.3 Asset tiles (waterfall)

- Variable aspect classes: `wf-tall`, `wf-wide`, `wf-square`, `wf-cinema`, `wf-portrait` — deterministic from asset ID.
- Thumbnail via `/api/media/{id}/thumb` (same-origin proxy).
- Hover overlay: gradient scrim + filename + permanent number.

---

## 7. Imagery & media

- **Thumbnails:** 320×240 JPEG, cover crop; stored at `objects/{id}/thumb.jpg`.
- **Preview:** Full object via `/api/media/{id}`; lightbox `object-fit: contain` for images.
- **Placeholder modality icons:** Serif glyph fallback (▶ PDF ◻) — never clip art.
- **COS CI (future):** `?imageView2/2/w/320` documented in `apps/api-edge/src/storage/cos-s3.ts` for China CDN.

---

## 8. Voice & copy (UI)

| Context | Style | Example |
|---------|-------|---------|
| Hero | Inspiring, short | “Curated materials, flowing freely” |
| Meta | Factual | “IPT-STOCK-00001 · 268 KB” |
| Errors | Direct + actionable | “Ensure api-edge is running: pnpm dev:edge” |
| Empty | Neutral | “No materials match your search.” |
| Legal / license | Transparent | Show `CC0-1.0`, 无版权 tags when applicable |

**Altruistic copy rule:** Never imply access or sync status that API does not confirm.

---

## 9. Accessibility

- Minimum contrast: **4.5:1** body text on Deep Blue; gold on Deep Blue only for large text or UI chrome, not long paragraphs.
- Focus: `box-shadow: 0 0 0 3px rgba(168, 139, 82, 0.25)` on interactive elements.
- Modals: `role="dialog"`, `aria-modal`, labelled by asset name, Esc to dismiss.
- Images: `alt=""` for decorative thumbs; full `alt={filename}` in lightbox.

---

## 10. Award-level checklist

Before merging UI changes, verify:

- [ ] Uses only **White / Deep Blue / Gold** (+ semantic trio) — no stray accent hues
- [ ] **One clear focal point** per screen; no competing display headings
- [ ] **Gold ≤ 8%** of viewport; rests on deep blue ground
- [ ] **Display + UI font pairing** preserved; no system-font fallback as primary
- [ ] **Motion** uses `--ease-out`; reduced-motion respected
- [ ] **Waterfall** tiles animate in with stagger; hover feels tactile not jittery
- [ ] **Lightbox** shows media large; metadata scannable in sidebar
- [ ] **Authentic status** — replication badges match API, not hardcoded “synced”
- [ ] **zh-CN** strings parity in `messages/zh-CN.json`
- [ ] Thumbnails use **`/api/media/`** proxy paths, never raw edge URLs in `<img src>`

---

## 11. File reference

| Asset | Location |
|-------|----------|
| CSS tokens & components | `apps/web/src/app/globals.css` |
| Fonts (Google) | `apps/web/src/app/[locale]/layout.tsx` |
| i18n copy | `apps/web/messages/en.json`, `zh-CN.json` |
| GUI structure | `docs/GUI-STRUCTURE.md` |
| Cloud / preview pipeline | `docs/CLOUD-SETUP.md` |

---

## 12. Evolution roadmap

| Phase | Design work |
|-------|-------------|
| **v1.1** | Align CSS variables to canonical `#0A1626` / `#A88B52` tokens |
| **v1.2** | Light mode (white ground) for marketing site |
| **v1.3** | Video snapshot thumbs; PDF.js viewer chrome matching lightbox |
| **v2** | Design tokens package (`@iptrustasset/design-tokens`) for edge emails & PDF exports |

---

*IPTrustasset design system — composed for trust, built for beauty.*
