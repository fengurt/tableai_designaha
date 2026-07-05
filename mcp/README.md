# Table AI Design Aha MCP server

Exposes every Table AI Alliance brand folder as MCP resources and tools. The same
repo files feed the public website, the JSON API, and this local MCP server.

## Capabilities

| Kind | Name | Purpose |
|------|------|---------|
| Resource | `brand://{assetKey}` | Full brand payload with guidelines and token file paths |
| Tool | `list_brands()` | List all available brand folders |
| Tool | `get_brand(assetKey)` | Brand summary plus guideline/token paths |
| Tool | `get_guideline(assetKey, path?)` | Primary guideline text, or a specific guideline path |
| Tool | `list_tokens(assetKey, group?)` | List design token names for JSON/CSS token files |
| Tool | `get_token(assetKey, name)` | Resolve a token by dotted name |
| Tool | `validate_color(assetKey, hex)` | Check whether a hex color is an exact brand token |

Current IP IDs / asset keys come from `config/brands.json`. The tools still accept
`slug` as a deprecated alias for older clients.

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
- `site/api/brands/{assetKey}.json`

GitHub Pages should serve those files after the deploy workflow runs.
