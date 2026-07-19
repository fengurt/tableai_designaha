# IPTrust MCP server

Exposes every IPTrust brand plus the source-backed public knowledge library as MCP
resources and tools. The same repo files feed the website, JSON API, and MCP server.

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
| Resource | `library://index` | Library source registry and collection counts |
| Tool | `search_library(query, type?, source?, limit?)` | Search organizations, cases, reports, and datasets with provenance |
| Tool | `list_library(type, source?, limit?, offset?)` | List one library collection |
| Tool | `get_library_item(type, id)` | Resolve one public library record |
| Tool | `get_related(entityType, entityId)` | Resolve links among owned IPs and library records |

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
- `site/api/library/organizations`
- `site/api/library/cases`
- `site/api/library/reports`
- `site/api/library/datasets`
- `site/api/library/relations`

The deployed Cloudflare site also exposes a read-only Streamable HTTP MCP endpoint:

```text
https://apuch.art/mcp
```

It implements MCP protocol `2025-11-25` and exposes the same brand and public-library
discovery tools without requiring a local Node process.

Public metadata is callable without a key. Restricted file bodies remain behind the
System API. Cloudflare D1 stores queryable records, R2 stores media, and Git snapshots
provide a versioned fallback for the public library.
