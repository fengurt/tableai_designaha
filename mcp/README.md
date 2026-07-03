# Table AI Design Aha MCP server

Exposes every Table AI Alliance brand folder as MCP resources and tools. The same
repo files feed the public website, the JSON API, and this local MCP server.

## Capabilities

| Kind | Name | Purpose |
|------|------|---------|
| Resource | `brand://{slug}` | Full brand payload with guidelines and token file paths |
| Tool | `list_brands()` | List all available brand folders |
| Tool | `get_brand(slug)` | Brand summary plus guideline/token paths |
| Tool | `get_guideline(slug, path?)` | Primary guideline text, or a specific guideline path |
| Tool | `list_tokens(slug, group?)` | List design token names for JSON/CSS token files |
| Tool | `get_token(slug, name)` | Resolve a token by dotted name |
| Tool | `validate_color(slug, hex)` | Check whether a hex color is an exact brand token |

Current brand slugs come from `config/brands.json`: `tableai`, `vanahom`,
`kind`, `apha`, `manaendless`, `opcglobal`, `iptrust`, `fengzhi`, `axisee`,
and `sidera`.

## Run locally

```bash
cd mcp
npm install
npm run inspect
# or
npm run dev
```

## Connect a client

Cursor `~/.cursor/mcp.json` or Claude Desktop:

```json
{
  "mcpServers": {
    "tableai-designaha": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/tableai_designaha/mcp/src/index.ts"]
    }
  }
}
```

After `npm run build`, point `command` at `node` and `args` at
`/absolute/path/to/tableai_designaha/mcp/dist/index.js`.

## Hosted website API

The static website build publishes agent-friendly files:

- `site/llms.txt`
- `site/api/manifest.json`
- `site/api/brands.json`
- `site/api/brands/{slug}.json`

GitHub Pages should serve those files after the deploy workflow runs.
