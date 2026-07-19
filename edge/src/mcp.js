import { authenticate, hasIpScope, hasScope } from "./security.js";
import { signMediaPath } from "./media.js";
import { search } from "./search.js";
import { json, parseJson } from "./utils.js";

const TOOLS = [
  { name: "list_brands", description: "List IPTrust brands and their primary identity fields.", inputSchema: { type: "object", properties: {} } },
  { name: "get_brand", description: "Get the current brand record for one IP slug.", inputSchema: { type: "object", required: ["slug"], properties: { slug: { type: "string" } } } },
  { name: "search_library", description: "Search brands, organizations, cases, reports, datasets and assets with lexical, semantic or hybrid retrieval.", inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" }, mode: { enum: ["lexical", "semantic", "hybrid"] }, limit: { type: "integer", minimum: 1, maximum: 50 }, types: { type: "array", items: { type: "string" } }, ip: { type: "string" } } } },
  { name: "list_assets", description: "List public assets, plus authorized private assets when a Bearer API key is supplied.", inputSchema: { type: "object", properties: { ip: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 200 } } } },
  { name: "get_asset", description: "Get metadata and variants for an asset.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } } },
  { name: "request_asset_url", description: "Create a short-lived media.apuch.art URL for an authorized private asset.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" }, ttlSeconds: { type: "integer", minimum: 30, maximum: 3600 } } } },
];

function result(value, isError = false) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value, isError };
}

async function brands(env) {
  const records = await env.DB.prepare("SELECT slug,payload_json,version,updated_at FROM brand_records ORDER BY slug").all();
  if (records.results.length) return records.results.map((row) => ({ slug: row.slug, ...parseJson(row.payload_json), version: row.version, updatedAt: row.updated_at }));
  const response = await fetch(`${env.PUBLIC_SITE_URL}/api/brands/index.json`);
  if (!response.ok) return [];
  const body = await response.json();
  return body.brands || body.items || body;
}

async function brand(env, slug) {
  const row = await env.DB.prepare("SELECT payload_json,version,updated_at FROM brand_records WHERE slug=?").bind(slug).first();
  if (row) return { slug, ...parseJson(row.payload_json), version: row.version, updatedAt: row.updated_at };
  const response = await fetch(`${env.PUBLIC_SITE_URL}/api/brands/${encodeURIComponent(slug)}.json`);
  return response.ok ? response.json() : null;
}

function assetValue(row, env, actor, variants = []) {
  return {
    id: row.id,
    ip: row.owner_id,
    title: row.title,
    role: row.role,
    access: row.access,
    filename: row.source_filename,
    mimeType: row.mime_type,
    extension: row.extension,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    sha256: row.sha256,
    status: row.status,
    url: row.access === "public" ? `${env.MEDIA_BASE_URL}/${row.source_object_key}` : null,
    canRequestUrl: row.access === "private" && hasScope(actor, "assets:read_private") && hasIpScope(actor, row.owner_id),
    variants: variants.map((item) => ({ kind: item.kind, format: item.format, bytes: item.bytes, width: item.width, height: item.height, url: `${env.MEDIA_BASE_URL}/${item.object_key}` })),
  };
}

async function callTool(env, actor, name, args = {}) {
  if (name === "list_brands") return result({ items: await brands(env) });
  if (name === "get_brand") {
    const value = await brand(env, String(args.slug || ""));
    return value ? result(value) : result({ error: "not_found" }, true);
  }
  if (name === "search_library") {
    const items = await search(env, actor, { query: String(args.query || "").slice(0, 500), mode: args.mode || "hybrid", limit: args.limit || 20, types: args.types || [], ip: args.ip || "" });
    return result({ query: args.query, items });
  }
  if (name === "list_assets") {
    const clauses = ["deleted_at IS NULL"];
    const bindings = [];
    if (args.ip) { clauses.push("owner_id=?"); bindings.push(args.ip); }
    if (!hasScope(actor, "assets:read_private")) clauses.push("access='public'");
    const limit = Math.min(Math.max(Number(args.limit || 50), 1), 200);
    const rows = await env.DB.prepare(`SELECT * FROM assets WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC LIMIT ?`).bind(...bindings, limit).all();
    return result({ items: rows.results.filter((row) => row.access === "public" || hasIpScope(actor, row.owner_id)).map((row) => assetValue(row, env, actor)) });
  }
  if (name === "get_asset" || name === "request_asset_url") {
    const row = await env.DB.prepare("SELECT * FROM assets WHERE id=? AND deleted_at IS NULL").bind(String(args.id || "")).first();
    if (!row) return result({ error: "not_found" }, true);
    const privateAllowed = hasScope(actor, "assets:read_private") && hasIpScope(actor, row.owner_id);
    if (row.access === "private" && !privateAllowed) return result({ error: "forbidden" }, true);
    if (name === "request_asset_url") {
      if (row.access === "public") return result({ url: `${env.MEDIA_BASE_URL}/${row.source_object_key}`, expiresAt: null });
      return result(await signMediaPath(env, `/${row.source_object_key}`, args.ttlSeconds));
    }
    const variants = await env.DB.prepare("SELECT * FROM asset_variants WHERE asset_id=? ORDER BY kind,format").bind(row.id).all();
    return result(assetValue(row, env, actor, variants.results));
  }
  return result({ error: "unknown_tool", name }, true);
}

export async function handleMcp(request, env) {
  if (request.method === "GET") return json(request, { name: "IPTrust MCP", protocolVersion: "2025-11-25", endpoint: "/mcp", tools: TOOLS.map(({ name, description }) => ({ name, description })) });
  if (request.method !== "POST") return json(request, { error: "method_not_allowed" }, { status: 405 });
  const actor = await authenticate(request, env);
  const message = await request.json().catch(() => null);
  if (!message || message.jsonrpc !== "2.0") return json(request, { jsonrpc: "2.0", id: message?.id ?? null, error: { code: -32600, message: "Invalid Request" } }, { status: 400 }, Boolean(actor));
  let value;
  if (message.method === "initialize") value = { protocolVersion: "2025-11-25", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "iptrust", version: "2.0.0" } };
  else if (message.method === "notifications/initialized") return new Response(null, { status: 202 });
  else if (message.method === "ping") value = {};
  else if (message.method === "tools/list") value = { tools: TOOLS };
  else if (message.method === "tools/call") value = await callTool(env, actor, message.params?.name, message.params?.arguments || {});
  else return json(request, { jsonrpc: "2.0", id: message.id ?? null, error: { code: -32601, message: "Method not found" } }, { status: 404 }, Boolean(actor));
  return json(request, { jsonrpc: "2.0", id: message.id ?? null, result: value }, {}, Boolean(actor));
}
