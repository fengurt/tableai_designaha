import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Canonical source of truth lives at repo root: KiND/tokens/kind.tokens.json
const TOKENS_PATH = resolve(__dirname, "../../KiND/tokens/kind.tokens.json");

type Token = { $value?: unknown; $type?: string; $description?: string; [k: string]: unknown };

async function loadTokens(): Promise<Record<string, Token>> {
  return JSON.parse(await readFile(TOKENS_PATH, "utf8"));
}

/** Flatten DTCG groups into "group.name" -> token, resolving one level of $type from the group. */
function flatten(obj: Record<string, any>, prefix = "", groupType?: string): Record<string, Token> {
  const out: Record<string, Token> = {};
  const type = (obj.$type as string) ?? groupType;
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === "object" && "$value" in val) {
      out[path] = { ...val, $type: (val.$type as string) ?? type };
    } else if (val && typeof val === "object") {
      Object.assign(out, flatten(val, path, type));
    }
  }
  return out;
}

const server = new McpServer({ name: "kind-design", version: "0.1.0" });

// Resource: the full token set (machine-readable, single source of truth).
server.registerResource(
  "kind-tokens",
  "kind://tokens",
  {
    title: "KiND design tokens (DTCG)",
    description: "W3C DTCG-format design tokens for the KiND design system.",
    mimeType: "application/json",
  },
  async (uri) => {
    const raw = await readFile(TOKENS_PATH, "utf8");
    return { contents: [{ uri: uri.href, mimeType: "application/json", text: raw }] };
  }
);

// Tool: look up a single token value by dotted name (e.g. "color.teal").
server.registerTool(
  "get_token",
  {
    title: "Get a KiND token",
    description: "Resolve a token by dotted name (e.g. 'color.teal', 'font.size.h1') to its value.",
    inputSchema: { name: z.string().describe("Dotted token name, e.g. color.teal") },
  },
  async ({ name }) => {
    const flat = flatten(await loadTokens());
    const t = flat[name];
    if (!t) {
      const suggestions = Object.keys(flat).filter((k) => k.includes(name.split(".").pop() ?? "")).slice(0, 8);
      return {
        content: [{ type: "text", text: `Token "${name}" not found.${suggestions.length ? ` Did you mean: ${suggestions.join(", ")}?` : ""}` }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: JSON.stringify({ name, ...t }, null, 2) }] };
  }
);

// Tool: list all token names, optionally filtered by group prefix.
server.registerTool(
  "list_tokens",
  {
    title: "List KiND tokens",
    description: "List token names, optionally filtered by group prefix (e.g. 'color', 'font.size').",
    inputSchema: { group: z.string().optional().describe("Optional group prefix filter") },
  },
  async ({ group }) => {
    const flat = flatten(await loadTokens());
    const names = Object.keys(flat).filter((k) => !group || k.startsWith(group));
    return { content: [{ type: "text", text: names.join("\n") || "No matching tokens." }] };
  }
);

// Tool: check whether a hex color is part of the KiND palette.
server.registerTool(
  "validate_color",
  {
    title: "Validate a color against the KiND palette",
    description: "Check whether a hex color is an exact KiND brand color; returns the matching token or the nearest options.",
    inputSchema: { hex: z.string().describe("Hex color, e.g. #0E8C7B") },
  },
  async ({ hex }) => {
    const flat = flatten(await loadTokens());
    const target = hex.trim().toLowerCase();
    const colors = Object.entries(flat).filter(([, t]) => t.$type === "color" && typeof t.$value === "string");
    const match = colors.find(([, t]) => String(t.$value).toLowerCase() === target);
    if (match) {
      return { content: [{ type: "text", text: `✓ ${hex} is on-brand: ${match[0]} (${match[1].$description ?? ""})` }] };
    }
    const palette = colors.map(([n, t]) => `${n}: ${t.$value}`).join("\n");
    return { content: [{ type: "text", text: `✗ ${hex} is not a KiND brand color. Use one of:\n${palette}` }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("kind-design MCP failed to start:", err);
  process.exit(1);
});
