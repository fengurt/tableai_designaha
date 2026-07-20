import { authenticate, hasIpScope, hasRecentStepUp, hasScope, requireCsrf } from "./security.js";
import { applyRateLimit, audit, checkIdempotency, cleanSegment, deepMerge, enqueueOutbox, entityEtag, json, now, parseBody, parseJson, storeIdempotency } from "./utils.js";

const RELATION_TYPES = new Set(["brand_parent", "endorsed_by", "operated_by", "licensed_by", "member_of", "co_branded_with"]);
const APPLICATION_ROLES = new Set(["primary", "endorsed", "operated", "licensed", "partner"]);
const RECORD_CLASSES = new Set(["owned", "reference"]);
const GUIDELINE_MODES = new Set(["independent", "inherit", "extend"]);

function error(request, code, status = 400, extra = {}) {
  return json(request, { error: code, ...extra }, { status }, true);
}

async function requireActor(request, env, scope, ipSlug = "") {
  const actor = await authenticate(request, env);
  if (!actor) return { response: error(request, "unauthorized", 401) };
  if (!hasScope(actor, scope)) return { response: error(request, "forbidden_scope", 403, { required: scope }) };
  if (!hasIpScope(actor, ipSlug)) return { response: error(request, "forbidden_ip_scope", 403, { ip: ipSlug }) };
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !await requireCsrf(request, actor, env)) return { response: error(request, "csrf_required", 403) };
  if (!await applyRateLimit(request, env, actor, request.method === "GET" ? "read" : "write")) return { response: error(request, "rate_limited", 429) };
  return { actor };
}

function names(value = {}) {
  return { zh: String(value.zh || "").trim().slice(0, 180), en: String(value.en || "").trim().slice(0, 180) };
}

function ipValue(row, industries = []) {
  return {
    slug: row.slug,
    recordClass: row.record_class,
    ipType: row.ip_type,
    primaryIndustry: row.primary_industry,
    industries,
    names: parseJson(row.names_json, {}),
    mainLanguage: row.main_language,
    lifecycleStatus: row.lifecycle_status,
    guidelineMode: row.guideline_mode,
    sourceUrl: row.source_url,
    sourcePublisher: row.source_publisher,
    verificationStatus: row.verification_status,
    payload: parseJson(row.payload_json, {}),
    version: row.version,
    updatedAt: row.updated_at,
  };
}

function applicationValue(row, links = []) {
  return {
    slug: row.slug,
    applicationType: row.application_type,
    names: parseJson(row.names_json, {}),
    mainLanguage: row.main_language,
    lifecycleStatus: row.lifecycle_status,
    guidelineMode: row.guideline_mode,
    description: parseJson(row.description_json, {}),
    business: parseJson(row.business_json, {}),
    location: parseJson(row.location_json, {}),
    overrides: parseJson(row.overrides_json, {}),
    officialWebsite: row.official_website,
    payload: parseJson(row.payload_json, {}),
    links: links.map((link) => ({ ip: link.ip_slug, role: link.role })),
    version: row.version,
    updatedAt: row.updated_at,
  };
}

async function termExists(env, id, dimension) {
  return Boolean(await env.DB.prepare("SELECT id FROM taxonomy_terms WHERE id=? AND dimension=? AND active=1").bind(id, dimension).first());
}

async function industriesFor(env, slugs) {
  if (!slugs.length) return new Map();
  const placeholders = slugs.map(() => "?").join(",");
  const rows = await env.DB.prepare(`SELECT ip_slug,term_id FROM ip_taxonomy JOIN taxonomy_terms ON taxonomy_terms.id=ip_taxonomy.term_id WHERE taxonomy_terms.dimension='industry' AND ip_slug IN (${placeholders}) ORDER BY is_primary DESC,taxonomy_terms.sort_order`).bind(...slugs).all();
  const map = new Map(slugs.map((slug) => [slug, []]));
  for (const row of rows.results) map.get(row.ip_slug)?.push(row.term_id);
  return map;
}

async function loadIp(env, slug) {
  const row = await env.DB.prepare("SELECT * FROM ip_records WHERE slug=? AND deleted_at IS NULL").bind(slug).first();
  if (!row) return null;
  const map = await industriesFor(env, [slug]);
  return { row, value: ipValue(row, map.get(slug) || []) };
}

async function loadApplication(env, slug) {
  const row = await env.DB.prepare("SELECT * FROM ip_applications WHERE slug=? AND deleted_at IS NULL").bind(slug).first();
  if (!row) return null;
  const links = await env.DB.prepare("SELECT ip_slug,role FROM application_ip_links WHERE application_slug=? ORDER BY CASE role WHEN 'primary' THEN 0 ELSE 1 END,role").bind(slug).all();
  return { row, value: applicationValue(row, links.results) };
}

export async function handleTaxonomyRoute(request, env) {
  if (request.method !== "GET") return error(request, "method_not_allowed", 405);
  if (!await applyRateLimit(request, env, null, "read")) return error(request, "rate_limited", 429);
  const rows = await env.DB.prepare("SELECT id,dimension,parent_id,slug,labels_json,description_json,sort_order FROM taxonomy_terms WHERE active=1 ORDER BY dimension,sort_order").all();
  const result = { industries: [], ipTypes: [], applicationTypes: [] };
  const key = { industry: "industries", ip_type: "ipTypes", application_type: "applicationTypes" };
  for (const row of rows.results) result[key[row.dimension]].push({ id: row.id, parentId: row.parent_id || null, labels: parseJson(row.labels_json, {}), description: parseJson(row.description_json, {}) });
  return json(request, result);
}

async function writeIp(request, env, actor, current = null) {
  const body = await parseBody(request);
  const patch = body.patch || body;
  const idem = await checkIdempotency(env, request, actor, body);
  if (idem.error) return error(request, idem.error, idem.status);
  if (idem.replay) return json(request, idem.data, { status: idem.status, headers: { "Idempotency-Replayed": "true" } }, true);
  const base = current?.value || {};
  const slug = cleanSegment(current?.row.slug || patch.slug || "");
  if (!slug) return error(request, "slug_required", 400);
  if (!hasIpScope(actor, slug)) return error(request, "forbidden_ip_scope", 403, { ip: slug });
  if (current) {
    const ifMatch = request.headers.get("if-match");
    if (!ifMatch) return error(request, "if_match_required", 428);
    const expected = entityEtag("ip", slug, current.row.version);
    if (ifMatch !== expected) return error(request, "version_conflict", 412, { currentEtag: expected });
  }
  const value = deepMerge(base, patch);
  value.slug = slug;
  value.names = names(value.names);
  value.recordClass = RECORD_CLASSES.has(value.recordClass) ? value.recordClass : "owned";
  value.mainLanguage = value.mainLanguage === "en" ? "en" : "zh";
  value.guidelineMode = GUIDELINE_MODES.has(value.guidelineMode) ? value.guidelineMode : "independent";
  value.lifecycleStatus = cleanSegment(value.lifecycleStatus || "active") || "active";
  value.ipType = cleanSegment(value.ipType);
  value.primaryIndustry = cleanSegment(value.primaryIndustry);
  value.industries = [...new Set([value.primaryIndustry, ...(Array.isArray(value.industries) ? value.industries.map(cleanSegment) : [])].filter(Boolean))];
  if (!value.names.zh && !value.names.en) return error(request, "name_required", 400);
  if (!await termExists(env, value.ipType, "ip_type")) return error(request, "invalid_ip_type", 422);
  if (!await termExists(env, value.primaryIndustry, "industry")) return error(request, "invalid_primary_industry", 422);
  for (const industry of value.industries) if (!await termExists(env, industry, "industry")) return error(request, "invalid_industry", 422, { industry });
  if (value.recordClass === "reference" && !value.sourceUrl) return error(request, "reference_source_required", 422);
  const timestamp = now();
  const version = (current?.row.version || 0) + 1;
  const payload = value.payload && typeof value.payload === "object" ? value.payload : {};
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO ip_records(slug,record_class,ip_type,primary_industry,names_json,main_language,lifecycle_status,guideline_mode,source_url,source_publisher,verification_status,payload_json,version,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET record_class=excluded.record_class,ip_type=excluded.ip_type,primary_industry=excluded.primary_industry,names_json=excluded.names_json,main_language=excluded.main_language,lifecycle_status=excluded.lifecycle_status,guideline_mode=excluded.guideline_mode,source_url=excluded.source_url,source_publisher=excluded.source_publisher,verification_status=excluded.verification_status,payload_json=excluded.payload_json,version=excluded.version,updated_at=excluded.updated_at`)
      .bind(slug, value.recordClass, value.ipType, value.primaryIndustry, JSON.stringify(value.names), value.mainLanguage, value.lifecycleStatus, value.guidelineMode, String(value.sourceUrl || ""), String(value.sourcePublisher || ""), String(value.verificationStatus || "internal"), JSON.stringify(payload), version, current?.row.created_at || timestamp, timestamp),
    env.DB.prepare("DELETE FROM ip_taxonomy WHERE ip_slug=?").bind(slug),
    ...value.industries.map((industry) => env.DB.prepare("INSERT INTO ip_taxonomy(ip_slug,term_id,is_primary,created_at) VALUES(?,?,?,?)").bind(slug, industry, industry === value.primaryIndustry ? 1 : 0, timestamp)),
    env.DB.prepare("INSERT INTO ip_taxonomy(ip_slug,term_id,is_primary,created_at) VALUES(?,?,1,?)").bind(slug, value.ipType, timestamp),
  ]);
  const saved = await loadIp(env, slug);
  await env.DB.prepare("INSERT INTO library_revisions(entity_type,entity_id,action,snapshot_json,actor,source_url,created_at) VALUES('ip',?,?,?,?,?,?)")
    .bind(slug, current ? "update" : "create", JSON.stringify(saved.value), actor.id, `${env.PUBLIC_SITE_URL}/ip?ip=${slug}`, timestamp).run();
  await enqueueOutbox(env, "git.sync", "ip", slug, version, { path: `data/runtime/ips/${slug}.json`, content: saved.value });
  await enqueueOutbox(env, "search.index", "ip", slug, version, { entityType: "ip", entityId: slug });
  await audit(env, request, actor, current ? "ip.update" : "ip.create", "ip", slug, "success", current?.value || {}, saved.value);
  const response = { ok: true, ip: saved.value, version };
  await storeIdempotency(env, request, actor, idem, current ? 200 : 201, response);
  return json(request, response, { status: current ? 200 : 201, headers: { ETag: entityEtag("ip", slug, version) } }, true);
}

export async function getIpGraph(env, slug) {
  const current = await loadIp(env, slug);
  if (!current) return null;
  const [incoming, outgoing, applications] = await Promise.all([
    env.DB.prepare("SELECT r.*,p.names_json parent_names,c.names_json child_names FROM ip_relationships r JOIN ip_records p ON p.slug=r.parent_ip_slug JOIN ip_records c ON c.slug=r.child_ip_slug WHERE r.child_ip_slug=? ORDER BY r.is_primary DESC,r.relation_type").bind(slug).all(),
    env.DB.prepare("SELECT r.*,p.names_json parent_names,c.names_json child_names FROM ip_relationships r JOIN ip_records p ON p.slug=r.parent_ip_slug JOIN ip_records c ON c.slug=r.child_ip_slug WHERE r.parent_ip_slug=? ORDER BY r.is_primary DESC,r.relation_type").bind(slug).all(),
    env.DB.prepare("SELECT a.*,l.role FROM application_ip_links l JOIN ip_applications a ON a.slug=l.application_slug WHERE l.ip_slug=? AND a.deleted_at IS NULL ORDER BY a.updated_at DESC").bind(slug).all(),
  ]);
  const relation = (row) => ({ id: row.id, parent: row.parent_ip_slug, parentNames: parseJson(row.parent_names, {}), child: row.child_ip_slug, childNames: parseJson(row.child_names, {}), type: row.relation_type, primary: Boolean(row.is_primary), metadata: parseJson(row.metadata_json, {}), version: row.version });
  return { ip: current.value, parents: incoming.results.map(relation), children: outgoing.results.map(relation), applications: applications.results.map((row) => ({ ...applicationValue(row), role: row.role })) };
}

export async function handleIpRoutes(request, env, parts) {
  const slug = cleanSegment(parts[0] || "");
  if (!slug && request.method === "GET") {
    const url = new URL(request.url);
    const where = ["i.deleted_at IS NULL"];
    const bindings = [];
    const add = (sql, value) => { if (value) { where.push(sql); bindings.push(value); } };
    add("i.record_class=?", cleanSegment(url.searchParams.get("recordClass") || ""));
    add("i.ip_type=?", cleanSegment(url.searchParams.get("ipType") || url.searchParams.get("type") || ""));
    add("i.primary_industry=?", cleanSegment(url.searchParams.get("industry") || ""));
    const parent = cleanSegment(url.searchParams.get("parent") || "");
    if (parent) { where.push("EXISTS(SELECT 1 FROM ip_relationships r WHERE r.child_ip_slug=i.slug AND r.parent_ip_slug=? AND r.relation_type='brand_parent')"); bindings.push(parent); }
    const q = String(url.searchParams.get("q") || "").trim().slice(0, 200);
    if (q) { where.push("(i.slug LIKE ? OR i.names_json LIKE ? OR i.payload_json LIKE ?)"); bindings.push(...Array(3).fill(`%${q}%`)); }
    const rows = await env.DB.prepare(`SELECT i.* FROM ip_records i WHERE ${where.join(" AND ")} ORDER BY i.record_class,i.updated_at DESC,i.slug LIMIT 300`).bind(...bindings).all();
    const map = await industriesFor(env, rows.results.map((row) => row.slug));
    return json(request, { items: rows.results.map((row) => ipValue(row, map.get(row.slug) || [])), total: rows.results.length });
  }
  if (!slug && request.method === "POST") {
    const auth = await requireActor(request, env, "ips:write");
    return auth.response || writeIp(request, env, auth.actor);
  }
  if (!slug) return error(request, "method_not_allowed", 405);
  if (parts[1] === "graph" && request.method === "GET") {
    const graph = await getIpGraph(env, slug);
    return graph ? json(request, graph) : error(request, "not_found", 404);
  }
  if (parts[1] === "history" && request.method === "GET") {
    const rows = await env.DB.prepare("SELECT id,action,snapshot_json,actor,source_url,created_at FROM library_revisions WHERE entity_type='ip' AND entity_id=? ORDER BY created_at DESC LIMIT 100").bind(slug).all();
    return json(request, { entityType: "ip", entityId: slug, items: rows.results.map((row) => ({ ...row, snapshot: parseJson(row.snapshot_json, {}) })) });
  }
  const current = await loadIp(env, slug);
  if (!current) return error(request, "not_found", 404);
  if (request.method === "GET") return json(request, current.value, { headers: { ETag: entityEtag("ip", slug, current.row.version) } });
  if (request.method === "PATCH") {
    const auth = await requireActor(request, env, "ips:write", slug);
    return auth.response || writeIp(request, env, auth.actor, current);
  }
  return error(request, "method_not_allowed", 405);
}

async function wouldCycle(env, parent, child) {
  const row = await env.DB.prepare(`WITH RECURSIVE descendants(slug) AS (
    SELECT child_ip_slug FROM ip_relationships WHERE parent_ip_slug=? AND relation_type='brand_parent'
    UNION ALL SELECT r.child_ip_slug FROM ip_relationships r JOIN descendants d ON r.parent_ip_slug=d.slug WHERE r.relation_type='brand_parent'
  ) SELECT 1 found FROM descendants WHERE slug=? LIMIT 1`).bind(child, parent).first();
  return Boolean(row);
}

export async function handleRelationRoutes(request, env, parts) {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const ip = cleanSegment(url.searchParams.get("ip") || "");
    const rows = ip
      ? await env.DB.prepare("SELECT * FROM ip_relationships WHERE parent_ip_slug=? OR child_ip_slug=? ORDER BY updated_at DESC").bind(ip, ip).all()
      : await env.DB.prepare("SELECT * FROM ip_relationships ORDER BY updated_at DESC LIMIT 500").all();
    return json(request, { items: rows.results.map((row) => ({ id: row.id, parent: row.parent_ip_slug, child: row.child_ip_slug, type: row.relation_type, primary: Boolean(row.is_primary), metadata: parseJson(row.metadata_json, {}), version: row.version })) });
  }
  const auth = await requireActor(request, env, "relationships:write");
  if (auth.response) return auth.response;
  if (request.method === "POST") {
    const body = await parseBody(request);
    const idem = await checkIdempotency(env, request, auth.actor, body);
    if (idem.error) return error(request, idem.error, idem.status);
    if (idem.replay) return json(request, idem.data, { status: idem.status, headers: { "Idempotency-Replayed": "true" } }, true);
    const parent = cleanSegment(body.parent);
    const child = cleanSegment(body.child);
    const type = cleanSegment(body.type || "brand_parent").replaceAll("-", "_");
    if (!parent || !child || parent === child) return error(request, "invalid_relation", 422);
    if (!RELATION_TYPES.has(type)) return error(request, "invalid_relation_type", 422);
    if (!hasIpScope(auth.actor, parent) || !hasIpScope(auth.actor, child)) return error(request, "forbidden_ip_scope", 403);
    const nodes = await env.DB.prepare("SELECT slug FROM ip_records WHERE slug IN (?,?) AND deleted_at IS NULL").bind(parent, child).all();
    if (nodes.results.length !== 2) return error(request, "ip_not_found", 404);
    const duplicate = await env.DB.prepare("SELECT id FROM ip_relationships WHERE parent_ip_slug=? AND child_ip_slug=? AND relation_type=?").bind(parent, child, type).first();
    if (duplicate) return error(request, "relation_exists", 409, { relationId: duplicate.id });
    if (type === "brand_parent" && await wouldCycle(env, parent, child)) return error(request, "relationship_cycle", 409);
    if (type === "brand_parent" && body.primary !== false) {
      const existing = await env.DB.prepare("SELECT * FROM ip_relationships WHERE child_ip_slug=? AND relation_type='brand_parent' AND is_primary=1").bind(child).first();
      if (existing && existing.parent_ip_slug !== parent) {
        if (!body.replacePrimary) return error(request, "primary_parent_exists", 409, { relationId: existing.id, parent: existing.parent_ip_slug });
        if (!hasRecentStepUp(auth.actor)) return error(request, "totp_step_up_required", 403);
        await env.DB.prepare("DELETE FROM ip_relationships WHERE id=?").bind(existing.id).run();
        const removed = { id: existing.id, parent: existing.parent_ip_slug, child: existing.child_ip_slug, type: existing.relation_type, primary: Boolean(existing.is_primary), metadata: parseJson(existing.metadata_json, {}), version: existing.version };
        await env.DB.prepare("INSERT INTO library_revisions(entity_type,entity_id,action,snapshot_json,actor,source_url,created_at) VALUES('ip-relation',?,'delete',?,?,?,?)").bind(existing.id, JSON.stringify(removed), auth.actor.id, `${env.PUBLIC_SITE_URL}/directory`, now()).run();
        await enqueueOutbox(env, "git.sync", "ip-relation", existing.id, existing.version + 1, { path: `data/runtime/ip-relations/${existing.id}.json`, deleted: true, previous: removed });
        await audit(env, request, auth.actor, "ip-relation.delete", "ip-relation", existing.id, "success", removed, {});
      }
    }
    const id = cleanSegment(body.id || `rel-${parent}-${child}-${type}`);
    const timestamp = now();
    await env.DB.prepare("INSERT INTO ip_relationships(id,parent_ip_slug,child_ip_slug,relation_type,is_primary,metadata_json,version,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?)")
      .bind(id, parent, child, type, type === "brand_parent" && body.primary !== false ? 1 : 0, JSON.stringify(body.metadata || {}), timestamp, timestamp).run();
    const payload = { ok: true, relation: { id, parent, child, type, primary: type === "brand_parent" && body.primary !== false, metadata: body.metadata || {}, version: 1 } };
    await env.DB.prepare("INSERT INTO library_revisions(entity_type,entity_id,action,snapshot_json,actor,source_url,created_at) VALUES('ip-relation',?,'create',?,?,?,?)").bind(id, JSON.stringify(payload.relation), auth.actor.id, `${env.PUBLIC_SITE_URL}/directory`, timestamp).run();
    await enqueueOutbox(env, "git.sync", "ip-relation", id, 1, { path: `data/runtime/ip-relations/${id}.json`, content: payload.relation });
    await storeIdempotency(env, request, auth.actor, idem, 201, payload);
    await audit(env, request, auth.actor, "ip-relation.create", "ip-relation", id, "success", {}, payload.relation);
    return json(request, payload, { status: 201, headers: { ETag: entityEtag("ip-relation", id, 1) } }, true);
  }
  if (request.method === "DELETE" && parts[0]) {
    const id = cleanSegment(parts[0]);
    const body = await parseBody(request);
    const idem = await checkIdempotency(env, request, auth.actor, body);
    if (idem.error) return error(request, idem.error, idem.status);
    if (idem.replay) return json(request, idem.data, { status: idem.status, headers: { "Idempotency-Replayed": "true" } }, true);
    const row = await env.DB.prepare("SELECT * FROM ip_relationships WHERE id=?").bind(id).first();
    if (!row) return error(request, "not_found", 404);
    if (!hasIpScope(auth.actor, row.parent_ip_slug) || !hasIpScope(auth.actor, row.child_ip_slug)) return error(request, "forbidden_ip_scope", 403);
    if (row.relation_type === "brand_parent" && row.is_primary && !hasRecentStepUp(auth.actor)) return error(request, "totp_step_up_required", 403);
    const ifMatch = request.headers.get("if-match");
    const expected = entityEtag("ip-relation", id, row.version);
    if (!ifMatch) return error(request, "if_match_required", 428);
    if (ifMatch !== expected) return error(request, "version_conflict", 412, { currentEtag: expected });
    await env.DB.prepare("DELETE FROM ip_relationships WHERE id=?").bind(id).run();
    const payload = { ok: true, deleted: id };
    const removed = { id: row.id, parent: row.parent_ip_slug, child: row.child_ip_slug, type: row.relation_type, primary: Boolean(row.is_primary), metadata: parseJson(row.metadata_json, {}), version: row.version };
    await env.DB.prepare("INSERT INTO library_revisions(entity_type,entity_id,action,snapshot_json,actor,source_url,created_at) VALUES('ip-relation',?,'delete',?,?,?,?)").bind(id, JSON.stringify(removed), auth.actor.id, `${env.PUBLIC_SITE_URL}/directory`, now()).run();
    await enqueueOutbox(env, "git.sync", "ip-relation", id, row.version + 1, { path: `data/runtime/ip-relations/${id}.json`, deleted: true, previous: removed });
    await storeIdempotency(env, request, auth.actor, idem, 200, payload);
    await audit(env, request, auth.actor, "ip-relation.delete", "ip-relation", id, "success", removed, {});
    return json(request, payload, {}, true);
  }
  return error(request, "method_not_allowed", 405);
}

async function writeApplication(request, env, actor, current = null) {
  const body = await parseBody(request);
  const patch = body.patch || body;
  const idem = await checkIdempotency(env, request, actor, body);
  if (idem.error) return error(request, idem.error, idem.status);
  if (idem.replay) return json(request, idem.data, { status: idem.status, headers: { "Idempotency-Replayed": "true" } }, true);
  const base = current?.value || {};
  const value = deepMerge(base, patch);
  const slug = cleanSegment(current?.row.slug || value.slug || "");
  value.slug = slug;
  value.names = names(value.names);
  value.applicationType = cleanSegment(value.applicationType);
  value.mainLanguage = value.mainLanguage === "en" ? "en" : "zh";
  value.lifecycleStatus = cleanSegment(value.lifecycleStatus || "active") || "active";
  value.guidelineMode = GUIDELINE_MODES.has(value.guidelineMode) ? value.guidelineMode : "inherit";
  value.links = Array.isArray(value.links) ? value.links.map((link) => ({ ip: cleanSegment(link.ip), role: cleanSegment(link.role) })).filter((link) => link.ip && APPLICATION_ROLES.has(link.role)) : [];
  if (!slug || (!value.names.zh && !value.names.en)) return error(request, "slug_and_name_required", 400);
  if (!await termExists(env, value.applicationType, "application_type")) return error(request, "invalid_application_type", 422);
  if (value.links.filter((link) => link.role === "primary").length !== 1) return error(request, "one_primary_ip_required", 422);
  for (const link of value.links) if (!hasIpScope(actor, link.ip)) return error(request, "forbidden_ip_scope", 403, { ip: link.ip });
  const nodes = await env.DB.prepare(`SELECT slug FROM ip_records WHERE slug IN (${value.links.map(() => "?").join(",")}) AND deleted_at IS NULL`).bind(...value.links.map((link) => link.ip)).all();
  if (new Set(nodes.results.map((row) => row.slug)).size !== new Set(value.links.map((link) => link.ip)).size) return error(request, "linked_ip_not_found", 404);
  if (current) {
    const expected = entityEtag("application", slug, current.row.version);
    if (!request.headers.get("if-match")) return error(request, "if_match_required", 428);
    if (request.headers.get("if-match") !== expected) return error(request, "version_conflict", 412, { currentEtag: expected });
  }
  const timestamp = now();
  const version = (current?.row.version || 0) + 1;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO ip_applications(slug,application_type,names_json,main_language,lifecycle_status,guideline_mode,description_json,business_json,location_json,overrides_json,official_website,payload_json,version,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET application_type=excluded.application_type,names_json=excluded.names_json,main_language=excluded.main_language,lifecycle_status=excluded.lifecycle_status,guideline_mode=excluded.guideline_mode,description_json=excluded.description_json,business_json=excluded.business_json,location_json=excluded.location_json,overrides_json=excluded.overrides_json,official_website=excluded.official_website,payload_json=excluded.payload_json,version=excluded.version,updated_at=excluded.updated_at`)
      .bind(slug, value.applicationType, JSON.stringify(value.names), value.mainLanguage, value.lifecycleStatus, value.guidelineMode, JSON.stringify(value.description || {}), JSON.stringify(value.business || {}), JSON.stringify(value.location || {}), JSON.stringify(value.overrides || {}), String(value.officialWebsite || ""), JSON.stringify(value.payload || {}), version, current?.row.created_at || timestamp, timestamp),
    env.DB.prepare("DELETE FROM application_ip_links WHERE application_slug=?").bind(slug),
  ]);
  await env.DB.batch(value.links.map((link) => env.DB.prepare("INSERT INTO application_ip_links(application_slug,ip_slug,role,created_at) VALUES(?,?,?,?)").bind(slug, link.ip, link.role, timestamp)));
  const saved = await loadApplication(env, slug);
  await env.DB.prepare("INSERT INTO library_revisions(entity_type,entity_id,action,snapshot_json,actor,source_url,created_at) VALUES('ip-application',?,?,?,?,?,?)").bind(slug, current ? "update" : "create", JSON.stringify(saved.value), actor.id, `${env.PUBLIC_SITE_URL}/application?application=${slug}`, timestamp).run();
  await enqueueOutbox(env, "git.sync", "ip-application", slug, version, { path: `data/runtime/applications/${slug}.json`, content: saved.value });
  await enqueueOutbox(env, "search.index", "application", slug, version, { entityType: "application", entityId: slug });
  await audit(env, request, actor, current ? "application.update" : "application.create", "ip-application", slug, "success", current?.value || {}, saved.value);
  const response = { ok: true, application: saved.value, version };
  await storeIdempotency(env, request, actor, idem, current ? 200 : 201, response);
  return json(request, response, { status: current ? 200 : 201, headers: { ETag: entityEtag("application", slug, version) } }, true);
}

export async function handleApplicationRoutes(request, env, parts) {
  const slug = cleanSegment(parts[0] || "");
  if (!slug && request.method === "GET") {
    const url = new URL(request.url);
    const ip = cleanSegment(url.searchParams.get("ip") || "");
    const type = cleanSegment(url.searchParams.get("type") || "");
    const where = ["a.deleted_at IS NULL"];
    const bindings = [];
    if (type) { where.push("a.application_type=?"); bindings.push(type); }
    if (ip) { where.push("EXISTS(SELECT 1 FROM application_ip_links l WHERE l.application_slug=a.slug AND l.ip_slug=?)"); bindings.push(ip); }
    const rows = await env.DB.prepare(`SELECT a.* FROM ip_applications a WHERE ${where.join(" AND ")} ORDER BY a.updated_at DESC LIMIT 300`).bind(...bindings).all();
    const items = [];
    for (const row of rows.results) items.push((await loadApplication(env, row.slug)).value);
    return json(request, { items, total: items.length });
  }
  if (!slug && request.method === "POST") {
    const auth = await requireActor(request, env, "applications:write");
    return auth.response || writeApplication(request, env, auth.actor);
  }
  if (!slug) return error(request, "method_not_allowed", 405);
  if (parts[1] === "history" && request.method === "GET") {
    const rows = await env.DB.prepare("SELECT id,action,snapshot_json,actor,source_url,created_at FROM library_revisions WHERE entity_type='ip-application' AND entity_id=? ORDER BY created_at DESC LIMIT 100").bind(slug).all();
    return json(request, { entityType: "ip-application", entityId: slug, items: rows.results.map((row) => ({ ...row, snapshot: parseJson(row.snapshot_json, {}) })) });
  }
  const current = await loadApplication(env, slug);
  if (!current) return error(request, "not_found", 404);
  if (request.method === "GET") return json(request, current.value, { headers: { ETag: entityEtag("application", slug, current.row.version) } });
  if (request.method === "PATCH") {
    const primary = current.value.links.find((link) => link.role === "primary")?.ip || "";
    const auth = await requireActor(request, env, "applications:write", primary);
    return auth.response || writeApplication(request, env, auth.actor, current);
  }
  return error(request, "method_not_allowed", 405);
}

export async function handleAdminStatus(request, env) {
  if (request.method !== "GET") return error(request, "method_not_allowed", 405);
  const auth = await requireActor(request, env, "admin:status");
  if (auth.response) return auth.response;
  const [ips, applications, assets, storage, searchRows, jobs, sessions, lastSync] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) count FROM ip_records WHERE deleted_at IS NULL").first(),
    env.DB.prepare("SELECT COUNT(*) count FROM ip_applications WHERE deleted_at IS NULL").first(),
    env.DB.prepare("SELECT COUNT(*) count FROM assets WHERE deleted_at IS NULL").first(),
    env.DB.prepare("SELECT COALESCE(SUM(bytes),0) bytes FROM assets WHERE deleted_at IS NULL").first(),
    env.DB.prepare("SELECT vector_status,COUNT(*) count FROM search_documents GROUP BY vector_status").all(),
    env.DB.prepare("SELECT status,COUNT(*) count FROM outbox GROUP BY status").all(),
    env.DB.prepare("SELECT COUNT(*) count FROM sessions WHERE revoked_at IS NULL AND expires_at>?").bind(now()).first(),
    env.DB.prepare("SELECT processed_at FROM outbox WHERE event_type='git.sync' AND status='done' ORDER BY processed_at DESC LIMIT 1").first(),
  ]);
  return json(request, {
    counts: { ips: ips.count, applications: applications.count, assets: assets.count, assetBytes: storage.bytes, sessions: sessions.count },
    search: Object.fromEntries(searchRows.results.map((row) => [row.vector_status, row.count])),
    jobs: Object.fromEntries(jobs.results.map((row) => [row.status, row.count])),
    lastGitSyncAt: lastSync?.processed_at || null,
    services: { d1: "connected", r2: env.ORIGINALS && env.PREVIEWS ? "connected" : "unavailable", vectorize: env.VECTORIZE ? "connected" : "unavailable", ai: env.AI ? "connected" : "unavailable", queues: env.WRITE_SYNC && env.PROCESSING ? "connected" : "unavailable" },
    stepUpUntil: auth.actor.stepUpUntil || "",
    checkedAt: now(),
  }, {}, true);
}
