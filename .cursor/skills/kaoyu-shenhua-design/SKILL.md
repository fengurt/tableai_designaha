---
name: kaoyu-shenhua-design
description: Apply the 烤鱼神话 (KAOYUSHENHUA) brand — charcoal-fire dining voice, deep-ink / fire-red / warm-gold palette, and store copy. Use when building or styling 烤鱼神话 surfaces, writing copy, or reviewing UI/marketing for brand compliance.
---

# 烤鱼神话 Design System

**烤鱼神话** · KAOYUSHENHUA — 三十多年老灶火，盐城大丰源头活鱼现点现烤，全店无预制菜。川湘家常味，街坊的老熟人。

## Non-negotiable guardrails

- 中文主名称 **烤鱼神话** 优先；英文 **KAOYUSHENHUA** 作辅助识别。
- 事实锚点不可改：活鱼现点现烤 · 家常菜现炒现做 · 全店无预制菜 · 盐城大丰源头。
- **主口号（新物料）**：把实话坚持三十多年，就成了神话。
- **场景句**：火不问你为什么来，它只负责一直烧着。
- 旧句「所谓神话，不过是把实话坚持了三十多年」仅兼容已印物料；新印统一主口号。
- 门店与餐饮场景以深墨、火红与暖金为核心；不拉伸、不描边、不改变标志比例。
- Voice：实在、暖、不绕。街坊口气，不网红腔，不堆「匠心/极致/赋能」。

## Core colors (from brands.json theme)

| Role | Hex | Use |
|---|---|---|
| Primary / deep ink | `#241714` | 结构、标志深墨 |
| Accent / fire red | `#B33A2B` | 炉火、辣椒、橙红强调 |
| Secondary / warm gold | `#C89B58` | 暖金点缀 |
| Paper | `#FFFDFC` | 主背景 |
| Surface | `#F5F2EE` | 次表面 |
| Ink | `#181312` | 正文 |
| Muted | `#6C625E` | 次要文字 |

## Voice

- **Say** — 活鱼现点现烤 · 全店无预制菜 · 高兴了来，不高兴了更要来 · 火一直烧着，位子一直留着
- **Don't** — 「所谓神话，不过是……」绕法 · 空洞神话话术 · 预制菜暗示 · 隔夜鱼

## Copy length map

| 用途 | 版本 |
|---|---|
| 品牌手册 / 长页 | 完整版 |
| 菜单背页 / 小册 | 菜谱版 |
| 海报 / 灯箱 | 精简版 |
| 点评 / 美团 / 外卖 | 线上简介 |
| 收银墙 / 桌卡 / 打包袋 | 门店物料句 |

## Source of truth

- **Canonical guide**: `KaoyuShenhua/README.md` — 定位、Voice、四档叙事、门店物料
- **Registry**: `config/brands.json` → `kaoyu-shenhua`
- **Logo / adobe**: `KaoyuShenhua/assets/adobe-assets/`；媒体经品牌 API `adobeAssets` / `images`

## Workflow

1. Read `KaoyuShenhua/README.md` before proposing UI or copy.
2. Pick the copy length from the map; do not invent alternate slogans.
3. Keep palette to deep ink / fire red / warm gold / paper; no purple gradients or cream-serif defaults.
4. Full narrative texts: [reference.md](reference.md)
