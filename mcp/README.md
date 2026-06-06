# KiND Design MCP server

Exposes the KiND design system to any MCP client (Cursor, Claude Desktop, CLI, CI) on top of the same single source of truth — `KiND/tokens/kind.tokens.json`.

## Capabilities

| Kind | Name | Purpose |
|------|------|---------|
| Resource | `kind://tokens` | Full DTCG token set as JSON |
| Tool | `get_token(name)` | Resolve a dotted token, e.g. `color.teal` → `#0E8C7B` |
| Tool | `list_tokens(group?)` | List token names, optionally by prefix |
| Tool | `validate_color(hex)` | Is a hex color on-brand? Returns the token or the palette |

## Run locally (stdio)

```bash
cd mcp
npm install
npm run inspect   # opens MCP Inspector against the server
# or
npm run dev       # runs the stdio server directly
```

## Connect a client (stdio)

Cursor `~/.cursor/mcp.json` (or Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "kind-design": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/tableai_designaha/mcp/src/index.ts"]
    }
  }
}
```

After `npm run build`, you can instead point `command` at `node` and `args` at `dist/index.js`.

## Going remote (later)

For a hosted server reachable by every client without local install, port this to a
Cloudflare Worker using `McpAgent` + Streamable HTTP and deploy with `wrangler`:

```bash
npm create cloudflare@latest -- kind-design-mcp \
  --template=cloudflare/ai/demos/remote-mcp-authless
```

Move the `registerTool` / `registerResource` logic into the Worker's `init()`, read tokens
from a bundled import or KV/R2, and clients connect via:

```json
{ "mcpServers": { "kind-design": { "command": "npx", "args": ["mcp-remote", "https://kind-design-mcp.<acct>.workers.dev/mcp"] } } }
```

## Design note

The server never hardcodes token values — it reads `KiND/tokens/kind.tokens.json` at call
time, so the Skill, the Style Dictionary build, and this MCP all stay in sync from one file.
