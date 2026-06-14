# Table AI Design Aha

Open design-system reference for Table AI Alliance brands. One folder per brand; add tokens, components, voice, and guardrails as each system matures.

| Folder | Brand |
|--------|-------|
| [TABLEAI](./TABLEAI/) | Table AI — international think tank (white · Deep Blue · Gold) |
| [VANAHOM](./VANAHOM/) | VANAHOM · 凡纳弘途 |
| [KiND](./KiND/) | KiND · 善渡科技 |
| [APHA](./APHA/) | Asia-Pacific Healing Arts Alliance · 亚太艺术疗愈联盟 |
| [MANAENDLESS](./MANAENDLESS/) | MANA Endless · 无魔协会 |
| [OPCGLOBAL](./OPCGLOBAL/) | OPC Global · 欧匹赛全球联盟 |
| [IPTRUST](./IPTRUST/) | IPTrustasset |
| [FENGZHI](./FENGZHI/) | 峰值永造局 · The Transformation Company · 界格 |

## Agent integration (KiND — reference implementation)

KiND is the first brand wired up for AI agents. The pattern, cheapest → most capable:

1. **DTCG tokens** — `KiND/tokens/kind.tokens.json` is the W3C Design-Tokens-format single source of truth. Everything else is generated from or reads this file.
2. **Build pipeline** — [Style Dictionary](https://styledictionary.com/) turns tokens into CSS/JS: `npm run build:tokens` → `KiND/dist/`.
3. **Skill** — `.cursor/skills/kind-design/` teaches agents the brand on demand (rules, voice, components). Loads automatically in Cursor/Claude Code when working on KiND.
4. **MCP server** — `mcp/` exposes the tokens as live resources/tools (`get_token`, `validate_color`, …) for any MCP client. Scaffolded for later; reads the same token file.

Replicate this structure per brand as each design system matures. `npm install` and the build require network access.

## Install the KiND skill (colleagues & external designers)

KiND ships as a **Cursor plugin** (`.cursor-plugin/plugin.json`) bundling the `kind-design` skill (with a portable bundled token snapshot) and the `kind-design` MCP server.

- **Already in this repo** — open `tableai_designaha` in Cursor and the skill auto-loads from `.cursor/skills/`. Nothing to install.
- **Quick, paste-a-URL rule** — Cursor → **Settings → Rules → Add Rule → Remote Rule (Github)** → paste `https://github.com/fengurt/tableai_designaha`. This imports `.cursor/rules/kind-design.mdc` (a lightweight brand-guardrails rule) into `.cursor/rules/imported/`. (Remote Rule only pulls `.mdc` rules — the full skill comes via the plugin path below.)
- **Plugin (recommended for sharing)** — publish at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish), or for a team: **Team Marketplace → Settings → Plugins → Add Marketplace → Import from Repo** → `fengurt/tableai_designaha`. Designers then install it from the Marketplace.
- **Test a plugin locally** — clone into `~/.cursor/plugins/local/kind-design`.

The skill works standalone (it reads its bundled `tokens.json`). The MCP server is optional and needs its deps first: `cd mcp && npm install`. Keep the bundled snapshot current with `npm run sync:skill` after editing canonical tokens.

