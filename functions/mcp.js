const PROTOCOL_VERSION = "2025-11-25";
const SUPPORTED_VERSIONS = new Set([PROTOCOL_VERSION, "2025-06-18", "2025-03-26"]);

const TOOLS = [
  {
    name: "list_brands",
    title: "List IPTrust IPs",
    description: "List every owned IP with its stable asset key, main name, language, page, and API URL.",
    inputSchema: { type: "object", additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "get_brand",
    title: "Get an IPTrust brand",
    description: "Return the complete public brand payload, including guidelines, colors, assets, Adobe exports, and provenance.",
    inputSchema: { type: "object", properties: { assetKey: { type: "string", description: "Stable IP ID / asset key." } }, required: ["assetKey"], additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "search_library",
    title: "Search the IPTrust public library",
    description: "Search source-backed organizations, cases, reports, and datasets.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        type: { type: "string", enum: ["all", "organization", "case", "report", "dataset"], default: "all" },
        source: { type: "string", description: "Optional source id." },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
      required: ["query"], additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "list_library",
    title: "List IPTrust library records",
    description: "List one public library collection with stable ids and provenance.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["organization", "case", "report", "dataset"] },
        source: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 200, default: 50 },
        offset: { type: "integer", minimum: 0, default: 0 },
      },
      required: ["type"], additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "get_library_item",
    title: "Get an IPTrust library record",
    description: "Resolve one organization, case, report, or dataset by stable id.",
    inputSchema: {
      type: "object",
      properties: { type: { type: "string", enum: ["organization", "case", "report", "dataset"] }, id: { type: "string" } },
      required: ["type", "id"], additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "get_related",
    title: "Get linked IPTrust records",
    description: "Find public organizations, cases, reports, datasets, or owned IPs connected to one entity.",
    inputSchema: {
      type: "object",
      properties: {
        entityType: { type: "string", enum: ["owned-ip", "organization", "case", "report", "dataset"] },
        entityId: { type: "string" },
      },
      required: ["entityType", "entityId"], additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];

function responseHeaders(request) {
  const origin = request.headers.get("origin");
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin || "https://apuch.art",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version, Mcp-Method, Mcp-Name",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function originAllowed(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    return originUrl.host === requestUrl.host || ["apuch.art", "www.apuch.art", "localhost:8790", "127.0.0.1:8790"].includes(originUrl.host);
  } catch {
    return false;
  }
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id, code, message, data) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } };
}

function textResult(value) {
  const structuredContent = value && typeof value === "object" ? value : { value };
  return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }], structuredContent, isError: false };
}

function toolError(message) {
  return { content: [{ type: "text", text: message }], isError: true };
}

async function staticJson(request, env, path) {
  const url = new URL(path, request.url);
  const response = await env.ASSETS.fetch(new Request(url));
  if (!response.ok) throw new Error(`Resource unavailable: ${path}`);
  return response.json();
}

function rowToOrganization(row) {
  return {
    id: row.id, slug: row.slug, name: row.name, nativeName: row.native_name, mainLanguage: row.main_language,
    description: row.description, officialWebsite: row.official_website, logoUrl: row.logo_url, logoSourceUrl: row.logo_source_url,
    country: row.country, headquarters: row.headquarters, industry: row.industry, ticker: row.ticker,
    verificationStatus: row.verification_status, sourceId: row.source_id, sourceUrl: row.source_url,
    sourcePublisher: row.source_publisher, sourceDate: row.source_date, fetchedAt: row.fetched_at, rank: row.rank, year: row.year,
  };
}

function rowToItem(row) {
  return {
    id: row.id, slug: row.slug, type: row.type,
    title: { zh: row.title_zh, en: row.title_en }, summary: { zh: row.summary_zh, en: row.summary_en },
    sourceUrl: row.source_url, sourcePublisher: row.source_publisher, publishedAt: row.published_at,
    access: row.access, fileUrl: row.access === "public" && row.file_key ? `/api/media/${row.file_key}` : "",
    externalUrl: row.external_url, verificationStatus: row.verification_status,
    metadata: JSON.parse(row.metadata_json || "{}"), createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function clean(value = "") {
  return String(value).trim().slice(0, 300);
}

async function listOrganizations(env, args, search = false) {
  const limit = Math.min(Math.max(Number(args.limit || 50), 1), 200);
  const offset = Math.max(Number(args.offset || 0), 0);
  const query = clean(args.query || "");
  const source = clean(args.source || "");
  const where = []; const bindings = [];
  if (query) { where.push("(o.name LIKE ? OR o.native_name LIKE ? OR o.description LIKE ? OR o.industry LIKE ?)"); bindings.push(...Array(4).fill(`%${query}%`)); }
  if (source) { where.push("oc.source_id=?"); bindings.push(source); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const base = `FROM organizations o JOIN organization_collections oc ON oc.organization_id=o.id ${clause}`;
  const total = await env.LIBRARY_DB.prepare(`SELECT COUNT(*) total ${base}`).bind(...bindings).first();
  const rows = await env.LIBRARY_DB.prepare(`SELECT o.*,oc.source_id,oc.rank,oc.year ${base} ORDER BY oc.source_id,COALESCE(oc.rank,999999),o.name LIMIT ? OFFSET ?`).bind(...bindings, search ? limit : limit, offset).all();
  return { type: "organization", total: total?.total || 0, limit, offset, items: rows.results.map(rowToOrganization) };
}

async function listItems(env, args, type, search = false) {
  const limit = Math.min(Math.max(Number(args.limit || 50), 1), 200);
  const offset = Math.max(Number(args.offset || 0), 0);
  const query = clean(args.query || "");
  const where = ["type=?"]; const bindings = [type];
  if (query) { where.push("(title_zh LIKE ? OR title_en LIKE ? OR summary_zh LIKE ? OR summary_en LIKE ?)"); bindings.push(...Array(4).fill(`%${query}%`)); }
  const clause = `WHERE ${where.join(" AND ")}`;
  const total = await env.LIBRARY_DB.prepare(`SELECT COUNT(*) total FROM library_items ${clause}`).bind(...bindings).first();
  const rows = await env.LIBRARY_DB.prepare(`SELECT * FROM library_items ${clause} ORDER BY COALESCE(published_at,updated_at) DESC LIMIT ? OFFSET ?`).bind(...bindings, search ? limit : limit, offset).all();
  return { type, total: total?.total || 0, limit, offset, items: rows.results.map(rowToItem) };
}

async function callTool(request, env, name, args = {}) {
  if (name === "list_brands") {
    const brands = await staticJson(request, env, "/api/brands.json");
    return textResult(brands.map(({ slug, mainName, mainLanguage, url, apiUrl, logoUrl }) => ({ assetKey: slug, mainName, mainLanguage, url, apiUrl, logoUrl })));
  }
  if (name === "get_brand") {
    const key = clean(args.assetKey || "");
    if (!/^[a-z0-9-]+$/i.test(key)) return toolError("A valid assetKey is required.");
    try { return textResult(await staticJson(request, env, `/api/brands/${key}.json`)); }
    catch { return toolError(`Unknown IP asset key: ${key}`); }
  }
  if (name === "list_library") {
    if (args.type === "organization") return textResult(await listOrganizations(env, args));
    if (["case", "report", "dataset"].includes(args.type)) return textResult(await listItems(env, args, args.type));
    return toolError("type must be organization, case, report, or dataset.");
  }
  if (name === "search_library") {
    const query = clean(args.query || "");
    if (!query) return toolError("query is required.");
    const type = args.type || "all";
    const groups = [];
    if (["all", "organization"].includes(type)) groups.push(await listOrganizations(env, { ...args, query }, true));
    for (const itemType of ["case", "report", "dataset"]) {
      if (["all", itemType].includes(type)) groups.push(await listItems(env, { ...args, query }, itemType, true));
    }
    const limit = Math.min(Math.max(Number(args.limit || 20), 1), 100);
    return textResult({ query, total: groups.reduce((sum, group) => sum + group.total, 0), items: groups.flatMap((group) => group.items).slice(0, limit) });
  }
  if (name === "get_library_item") {
    const id = clean(args.id || "");
    if (!id) return toolError("id is required.");
    if (args.type === "organization") {
      const row = await env.LIBRARY_DB.prepare("SELECT o.*,oc.source_id,oc.rank,oc.year FROM organizations o JOIN organization_collections oc ON oc.organization_id=o.id WHERE o.id=? OR o.slug=? LIMIT 1").bind(id, id).first();
      return row ? textResult(rowToOrganization(row)) : toolError(`Organization not found: ${id}`);
    }
    if (["case", "report", "dataset"].includes(args.type)) {
      const row = await env.LIBRARY_DB.prepare("SELECT * FROM library_items WHERE type=? AND (id=? OR slug=?) LIMIT 1").bind(args.type, id, id).first();
      return row ? textResult(rowToItem(row)) : toolError(`${args.type} not found: ${id}`);
    }
    return toolError("type must be organization, case, report, or dataset.");
  }
  if (name === "get_related") {
    const entityType = clean(args.entityType || ""); const entityId = clean(args.entityId || "");
    const rows = await env.LIBRARY_DB.prepare("SELECT * FROM library_relations WHERE (from_type=? AND from_id=?) OR (to_type=? AND to_id=?) ORDER BY created_at DESC").bind(entityType, entityId, entityType, entityId).all();
    return textResult(rows.results);
  }
  throw new Error(`Unknown tool: ${name}`);
}

async function handleRpc(request, env, message) {
  const { id, method, params = {} } = message || {};
  if (message?.jsonrpc !== "2.0" || !method) return rpcError(id, -32600, "Invalid Request");
  if (method === "initialize") {
    return rpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } },
      serverInfo: { name: "iptrust", title: "岁知社 IPTrust", version: "1.0.0", description: "Owned IP systems and source-backed public brand knowledge." },
      instructions: "Use brand tools for owned IP guidelines and library tools for source-backed public organizations, cases, reports, datasets, and relations.",
    });
  }
  if (method === "ping") return rpcResult(id, {});
  if (method === "tools/list") return rpcResult(id, { tools: TOOLS });
  if (method === "tools/call") {
    try { return rpcResult(id, await callTool(request, env, params.name, params.arguments || {})); }
    catch (error) { return rpcError(id, -32602, error instanceof Error ? error.message : "Tool call failed"); }
  }
  if (method === "resources/list") {
    return rpcResult(id, { resources: [
      { uri: "iptrust://manifest", name: "IPTrust manifest", mimeType: "application/json" },
      { uri: "iptrust://brands", name: "Owned IP index", mimeType: "application/json" },
      { uri: "iptrust://library/sources", name: "Public library sources", mimeType: "application/json" },
      { uri: "iptrust://ip-system", name: "IP进化论", mimeType: "text/markdown" },
    ] });
  }
  if (method === "resources/templates/list") {
    return rpcResult(id, { resourceTemplates: [{ uriTemplate: "brand://{assetKey}", name: "Owned IP brand system", mimeType: "application/json" }] });
  }
  if (method === "resources/read") {
    const uri = String(params.uri || "");
    let path = ""; let mimeType = "application/json";
    if (uri === "iptrust://manifest") path = "/api/manifest.json";
    else if (uri === "iptrust://brands") path = "/api/brands.json";
    else if (uri === "iptrust://library/sources") path = "/api/library/sources.json";
    else if (uri === "iptrust://ip-system") { path = "/ip_sys.md"; mimeType = "text/markdown"; }
    else if (uri.startsWith("brand://")) path = `/api/brands/${clean(uri.slice(8))}.json`;
    if (!path) return rpcError(id, -32602, `Unknown resource: ${uri}`);
    const asset = await env.ASSETS.fetch(new Request(new URL(path, request.url)));
    if (!asset.ok) return rpcError(id, -32602, `Resource unavailable: ${uri}`);
    return rpcResult(id, { contents: [{ uri, mimeType, text: await asset.text() }] });
  }
  if (method.startsWith("notifications/")) return null;
  return rpcError(id, -32601, `Method not found: ${method}`);
}

export async function onRequest({ request, env }) {
  const headers = responseHeaders(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (!originAllowed(request)) return Response.json(rpcError(null, -32000, "Invalid Origin"), { status: 403, headers });
  if (request.method === "GET") return Response.json(rpcError(null, -32600, "SSE listener is not enabled"), { status: 405, headers });
  if (request.method !== "POST") return Response.json(rpcError(null, -32600, "Method not allowed"), { status: 405, headers });
  const protocol = request.headers.get("mcp-protocol-version");
  if (protocol && !SUPPORTED_VERSIONS.has(protocol)) return Response.json(rpcError(null, -32600, "Unsupported MCP protocol version"), { status: 400, headers });
  let message;
  try { message = await request.json(); }
  catch { return Response.json(rpcError(null, -32700, "Parse error"), { status: 400, headers }); }
  if (Array.isArray(message)) return Response.json(rpcError(null, -32600, "JSON-RPC batching is not supported"), { status: 400, headers });
  const result = await handleRpc(request, env, message);
  if (!result) return new Response(null, { status: 202, headers });
  return Response.json(result, { status: 200, headers });
}
