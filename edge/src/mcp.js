import { authenticate, hasIpScope, hasScope } from "./security.js";
import { signMediaPath } from "./media.js";
import { search } from "./search.js";
import { getIpGraph } from "./ip.js";
import { json, parseJson } from "./utils.js";

const TOOLS = [
  { name: "list_brands", description: "List IPTrust brands and their primary identity fields.", inputSchema: { type: "object", properties: {} } },
  { name: "get_brand", description: "Get the current brand record for one IP slug.", inputSchema: { type: "object", required: ["slug"], properties: { slug: { type: "string" } } } },
  { name: "list_ips", description: "List IPs with industry, IP type, ownership class, architecture role and primary-language names.", inputSchema: { type: "object", properties: { industry: { type: "string" }, ipType: { type: "string" }, recordClass: { enum: ["owned", "reference"] }, parent: { type: "string" }, architectureRole: { enum: ["parent", "child", "standalone"] } } } },
  { name: "get_ip_graph", description: "Get one IP with its parents, children, relationships and project applications.", inputSchema: { type: "object", required: ["slug"], properties: { slug: { type: "string" } } } },
  { name: "list_ip_children", description: "List the direct child IPs of one mother IP.", inputSchema: { type: "object", required: ["slug"], properties: { slug: { type: "string" } } } },
  { name: "list_ip_applications", description: "List project applications connected to one IP.", inputSchema: { type: "object", required: ["slug"], properties: { slug: { type: "string" } } } },
  { name: "get_application", description: "Get a project application, its primary IP, linked IPs and guideline inheritance.", inputSchema: { type: "object", required: ["slug"], properties: { slug: { type: "string" } } } },
  { name: "search_library", description: "Search IPs, applications, organizations, cases, reports, datasets and assets with lexical, semantic or hybrid retrieval.", inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" }, mode: { enum: ["lexical", "semantic", "hybrid"] }, limit: { type: "integer", minimum: 1, maximum: 50 }, types: { type: "array", items: { type: "string" } }, ip: { type: "string" }, industry: { type: "string" }, ipType: { type: "string" } } } },
  { name: "get_library_item", description: "Get a public library item or an authorized private note and optionally request a short-lived file URL.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" }, includeFileUrl: { type: "boolean" }, ttlSeconds: { type: "integer", minimum: 30, maximum: 3600 } } } },
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

function ipValue(row, industries = []) {
  const architectureRoles = [];
  if (Boolean(row.parent_capable) || Boolean(row.has_children)) architectureRoles.push("parent");
  if (Boolean(row.has_parent)) architectureRoles.push("child");
  return { slug: row.slug, recordClass: row.record_class, ipType: row.ip_type, primaryIndustry: row.primary_industry, industries, names: parseJson(row.names_json), mainLanguage: row.main_language, lifecycleStatus: row.lifecycle_status, guidelineMode: row.guideline_mode, parentCapable: Boolean(row.parent_capable), architectureRoles: architectureRoles.length ? architectureRoles : ["standalone"], sourceUrl: row.source_url, sourcePublisher: row.source_publisher, verificationStatus: row.verification_status, payload: parseJson(row.payload_json), version: row.version, updatedAt: row.updated_at };
}

async function listIps(env, args = {}) {
  const where = ["i.deleted_at IS NULL"];
  const bindings = [];
  for (const [key, column] of [["industry", "primary_industry"], ["ipType", "ip_type"], ["recordClass", "record_class"]]) if (args[key]) { where.push(`i.${column}=?`); bindings.push(String(args[key])); }
  if (args.parent) { where.push("EXISTS(SELECT 1 FROM ip_relationships r WHERE r.child_ip_slug=i.slug AND r.parent_ip_slug=? AND r.relation_type='brand_parent')"); bindings.push(String(args.parent)); }
  if (args.architectureRole === "parent") where.push("(i.parent_capable=1 OR EXISTS(SELECT 1 FROM ip_relationships r WHERE r.parent_ip_slug=i.slug AND r.relation_type='brand_parent'))");
  if (args.architectureRole === "child") where.push("EXISTS(SELECT 1 FROM ip_relationships r WHERE r.child_ip_slug=i.slug AND r.relation_type='brand_parent')");
  if (args.architectureRole === "standalone") where.push("i.parent_capable=0 AND NOT EXISTS(SELECT 1 FROM ip_relationships r WHERE (r.parent_ip_slug=i.slug OR r.child_ip_slug=i.slug) AND r.relation_type='brand_parent')");
  const rows = await env.DB.prepare(`SELECT i.*,
    EXISTS(SELECT 1 FROM ip_relationships r WHERE r.child_ip_slug=i.slug AND r.relation_type='brand_parent') has_parent,
    EXISTS(SELECT 1 FROM ip_relationships r WHERE r.parent_ip_slug=i.slug AND r.relation_type='brand_parent') has_children
    FROM ip_records i WHERE ${where.join(" AND ")} ORDER BY i.record_class,i.slug LIMIT 300`).bind(...bindings).all();
  const items = [];
  for (const row of rows.results) {
    const taxonomy = await env.DB.prepare("SELECT term_id FROM ip_taxonomy JOIN taxonomy_terms ON taxonomy_terms.id=ip_taxonomy.term_id WHERE ip_slug=? AND taxonomy_terms.dimension='industry' ORDER BY is_primary DESC,taxonomy_terms.sort_order").bind(row.slug).all();
    items.push(ipValue(row, taxonomy.results.map((item) => item.term_id)));
  }
  return items;
}

async function application(env, slug) {
  const row = await env.DB.prepare("SELECT * FROM ip_applications WHERE slug=? AND deleted_at IS NULL").bind(slug).first();
  if (!row) return null;
  const links = await env.DB.prepare("SELECT ip_slug,role FROM application_ip_links WHERE application_slug=? ORDER BY CASE role WHEN 'primary' THEN 0 ELSE 1 END,role").bind(slug).all();
  return { slug: row.slug, applicationType: row.application_type, names: parseJson(row.names_json), mainLanguage: row.main_language, lifecycleStatus: row.lifecycle_status, guidelineMode: row.guideline_mode, description: parseJson(row.description_json), business: parseJson(row.business_json), location: parseJson(row.location_json), overrides: parseJson(row.overrides_json), officialWebsite: row.official_website, links: links.results.map((item) => ({ ip: item.ip_slug, role: item.role })), version: row.version, updatedAt: row.updated_at };
}

async function assetScopeSlug(env, row) {
  if (row.owner_type !== "ip-application") return row.owner_id;
  const link = await env.DB.prepare("SELECT ip_slug FROM application_ip_links WHERE application_slug=? AND role='primary' LIMIT 1").bind(row.owner_id).first();
  return link?.ip_slug || row.owner_id;
}

function assetValue(row, env, actor, variants = [], scopeSlug = row.owner_id) {
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
    canRequestUrl: row.access === "private" && hasScope(actor, "assets:read_private") && hasIpScope(actor, scopeSlug),
    variants: variants.map((item) => ({ kind: item.kind, format: item.format, bytes: item.bytes, width: item.width, height: item.height, url: `${env.MEDIA_BASE_URL}/${item.object_key}` })),
  };
}

async function callTool(env, actor, name, args = {}) {
  if (name === "list_brands") return result({ items: await brands(env) });
  if (name === "get_brand") {
    const value = await brand(env, String(args.slug || ""));
    return value ? result(value) : result({ error: "not_found" }, true);
  }
  if (name === "list_ips") return result({ items: await listIps(env, args) });
  if (["get_ip_graph", "list_ip_children", "list_ip_applications"].includes(name)) {
    const graph = await getIpGraph(env, String(args.slug || ""));
    if (!graph) return result({ error: "not_found" }, true);
    if (name === "list_ip_children") return result({ ip: graph.ip.slug, items: graph.children });
    if (name === "list_ip_applications") return result({ ip: graph.ip.slug, items: graph.applications });
    return result(graph);
  }
  if (name === "get_application") {
    const value = await application(env, String(args.slug || ""));
    return value ? result(value) : result({ error: "not_found" }, true);
  }
  if (name === "search_library") {
    const items = await search(env, actor, { query: String(args.query || "").slice(0, 500), mode: args.mode || "hybrid", limit: args.limit || 20, types: args.types || [], ip: args.ip || "", industry: args.industry || "", ipType: args.ipType || "" });
    return result({ query: args.query, items });
  }
  if (name === "get_library_item") {
    const row = await env.DB.prepare("SELECT * FROM library_items WHERE id=?").bind(String(args.id || "")).first();
    if (!row) return result({ error: "not_found" }, true);
    const metadata = parseJson(row.metadata_json);
    const relation = metadata.ipSlug ? null : await env.DB.prepare("SELECT to_id FROM library_relations WHERE from_type=? AND from_id=? AND to_type IN ('owned-ip','ip') LIMIT 1").bind(row.type, row.id).first();
    const ipSlug = metadata.ipSlug || relation?.to_id || "";
    if (row.access === "private" && (!hasScope(actor, "library:read_private") || !hasIpScope(actor, ipSlug))) return result({ error: "forbidden" }, true);
    const item = { id: row.id, slug: row.slug, type: row.type, title: { zh: row.title_zh, en: row.title_en }, summary: { zh: row.summary_zh, en: row.summary_en }, access: row.access, sourceUrl: row.source_url, sourcePublisher: row.source_publisher, publishedAt: row.published_at, verificationStatus: row.verification_status, metadata, ipSlug, version: row.version };
    if (args.includeFileUrl && row.file_key) item.file = row.access === "private" ? await signMediaPath(env, `/${row.file_key}`, args.ttlSeconds) : { url: `${env.MEDIA_BASE_URL}/${row.file_key}`, expiresAt: null };
    return result(item);
  }
  if (name === "list_assets") {
    const clauses = ["deleted_at IS NULL"];
    const bindings = [];
    if (args.ip) { clauses.push("owner_id=?"); bindings.push(args.ip); }
    if (!hasScope(actor, "assets:read_private")) clauses.push("access='public'");
    const limit = Math.min(Math.max(Number(args.limit || 50), 1), 200);
    const rows = await env.DB.prepare(`SELECT * FROM assets WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC LIMIT ?`).bind(...bindings, limit).all();
    const items = [];
    for (const row of rows.results) {
      const scopeSlug = await assetScopeSlug(env, row);
      if (row.access === "public" || hasIpScope(actor, scopeSlug)) items.push(assetValue(row, env, actor, [], scopeSlug));
    }
    return result({ items });
  }
  if (name === "get_asset" || name === "request_asset_url") {
    const row = await env.DB.prepare("SELECT * FROM assets WHERE id=? AND deleted_at IS NULL").bind(String(args.id || "")).first();
    if (!row) return result({ error: "not_found" }, true);
    const scopeSlug = await assetScopeSlug(env, row);
    const privateAllowed = hasScope(actor, "assets:read_private") && hasIpScope(actor, scopeSlug);
    if (row.access === "private" && !privateAllowed) return result({ error: "forbidden" }, true);
    if (name === "request_asset_url") {
      if (row.access === "public") return result({ url: `${env.MEDIA_BASE_URL}/${row.source_object_key}`, expiresAt: null });
      return result(await signMediaPath(env, `/${row.source_object_key}`, args.ttlSeconds));
    }
    const variants = await env.DB.prepare("SELECT * FROM asset_variants WHERE asset_id=? ORDER BY kind,format").bind(row.id).all();
    return result(assetValue(row, env, actor, variants.results, scopeSlug));
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
