const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Admin-Key",
  "Access-Control-Max-Age": "86400",
};

function json(data, init = {}) {
  return Response.json(data, { ...init, headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=120, stale-while-revalidate=3600", ...(init.headers || {}) } });
}

function writeJson(data, init = {}) {
  return Response.json(data, { ...init, headers: { ...CORS_HEADERS, "Cache-Control": "no-store", ...(init.headers || {}) } });
}

function authorized(request, env) {
  const expected = env.ADMIN_API_KEY || env.IPTRUST_ADMIN_KEY;
  const supplied = request.headers.get("x-admin-key") || (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return Boolean(expected && supplied === expected);
}

function githubConfig(env) {
  return {
    token: env.GITHUB_ADMIN_TOKEN || env.GITHUB_TOKEN || env.GH_TOKEN || "",
    owner: env.GITHUB_OWNER || "fengurt",
    repo: env.GITHUB_REPO || "tableai_designaha",
    branch: env.GITHUB_BRANCH || "main",
  };
}

function githubHeaders(token) {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "iptrust-library-api",
  };
}

function decodeBase64Utf8(value) {
  const binary = atob(String(value || "").replace(/\n/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value); let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary);
}

function githubContentUrl(config, path) {
  const safePath = encodeURIComponent(path).replaceAll("%2F", "/");
  return `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${safePath}`;
}

async function syncGithubCollection(env, path, update, message) {
  const config = githubConfig(env);
  if (!config.token) return { status: "d1-only", reason: "github-token-not-configured" };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const read = await fetch(`${githubContentUrl(config, path)}?ref=${encodeURIComponent(config.branch)}`, { headers: githubHeaders(config.token) });
    const current = await read.json().catch(() => ({}));
    if (!read.ok) return { status: "d1-only", reason: current.message || "github-read-failed" };
    const records = update(JSON.parse(decodeBase64Utf8(current.content)));
    const saved = await fetch(githubContentUrl(config, path), {
      method: "PUT",
      headers: githubHeaders(config.token),
      body: JSON.stringify({ message, content: encodeBase64Utf8(`${JSON.stringify(records, null, 2)}\n`), sha: current.sha, branch: config.branch }),
    });
    const result = await saved.json().catch(() => ({}));
    if (saved.ok) return { status: "github-synced", commit: result.commit?.sha || "", url: result.commit?.html_url || "" };
    if (saved.status !== 409 || attempt === 1) return { status: "d1-only", reason: result.message || "github-write-failed" };
  }
  return { status: "d1-only", reason: "github-sync-retry-exhausted" };
}

function gitItem(item) {
  return {
    id: item.id, slug: item.slug, type: item.type,
    title: { zh: item.titleZh, en: item.titleEn },
    summary: { zh: item.summaryZh, en: item.summaryEn },
    sourceUrl: item.sourceUrl, sourcePublisher: item.sourcePublisher, publishedAt: item.publishedAt,
    access: item.access, fileKey: item.fileKey, externalUrl: item.externalUrl,
    verificationStatus: item.verificationStatus, metadata: JSON.parse(item.metadataJson || "{}"),
    createdAt: item.createdAt, updatedAt: item.updatedAt,
  };
}

function gitRelation(item) {
  return {
    id: item.id, fromType: item.fromType, fromId: item.fromId, toType: item.toType, toId: item.toId,
    relation: item.relation, note: item.note || "", createdAt: item.createdAt,
  };
}

async function syncGitItem(env, item, action) {
  const path = `data/library/${item.type}s.json`;
  return syncGithubCollection(env, path, (records) => {
    const next = records.filter((entry) => entry.id !== item.id);
    if (action !== "delete") next.push(gitItem(item));
    return next.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) || a.id.localeCompare(b.id));
  }, `${action === "delete" ? "Delete" : "Update"} ${item.type} ${item.slug || item.id} from IPTrust API`);
}

async function syncGitRelation(env, item, action) {
  return syncGithubCollection(env, "data/library/relations.json", (records) => {
    const next = records.filter((entry) => entry.id !== item.id);
    if (action !== "delete") next.push(gitRelation(item));
    return next.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")) || a.id.localeCompare(b.id));
  }, `${action === "delete" ? "Delete" : "Update"} library relation ${item.id} from IPTrust API`);
}

function cleanSegment(value = "") {
  const clean = decodeURIComponent(value).trim();
  return /^[a-z0-9-]+$/i.test(clean) ? clean : "";
}

function rowToOrganization(row) {
  return {
    id: row.id, slug: row.slug, name: row.name, nativeName: row.native_name, mainLanguage: row.main_language,
    description: row.description, officialWebsite: row.official_website, logoUrl: row.logo_url,
    logoSourceUrl: row.logo_source_url, logoSource: row.logo_source || "monogram", logoProvider: row.logo_provider || "",
    logoQuality: row.logo_quality || "fallback", logoStatus: row.logo_status || "pending", logoProvenanceUrl: row.logo_provenance_url || "",
    fallbackLogoUrl: row.fallback_logo_url || "", logoCheckedAt: row.logo_checked_at || null, country: row.country, headquarters: row.headquarters, industry: row.industry,
    ticker: row.ticker, verificationStatus: row.verification_status, sourceUrl: row.source_url,
    sourcePublisher: row.source_publisher, sourceDate: row.source_date, fetchedAt: row.fetched_at, updatedAt: row.updated_at,
    sourceId: row.source_id, rank: row.rank, year: row.year,
  };
}

function rowToItem(row, canReadFile) {
  return {
    id: row.id, slug: row.slug, type: row.type,
    title: { zh: row.title_zh, en: row.title_en }, summary: { zh: row.summary_zh, en: row.summary_en },
    sourceUrl: row.source_url, sourcePublisher: row.source_publisher, publishedAt: row.published_at,
    access: row.access, fileUrl: canReadFile && row.file_key ? `/api/media/${row.file_key}` : "",
    externalUrl: row.external_url, verificationStatus: row.verification_status,
    metadata: JSON.parse(row.metadata_json || "{}"), createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function staticData(request, env, name) {
  const url = new URL(`/api/library/${name}.json`, request.url);
  const response = env.ASSETS ? await env.ASSETS.fetch(new Request(url)) : await fetch(url);
  return response.ok ? response.json() : [];
}

async function listOrganizations(request, env) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const source = cleanSegment(url.searchParams.get("source") || "");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
  if (!env.LIBRARY_DB) {
    let rows = await staticData(request, env, "organizations");
    if (q) rows = rows.filter((item) => JSON.stringify(item).toLowerCase().includes(q.toLowerCase()));
    if (source) rows = rows.filter((item) => item.sourceId === source);
    return json({ type: "organization", total: rows.length, limit, offset, items: rows.slice(offset, offset + limit), storage: "git-snapshot" });
  }
  const where = []; const bindings = [];
  if (q) { where.push("(o.name LIKE ? OR o.native_name LIKE ? OR o.description LIKE ? OR o.industry LIKE ?)"); bindings.push(...Array(4).fill(`%${q}%`)); }
  if (source) { where.push("oc.source_id = ?"); bindings.push(source); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const base = `FROM organizations o JOIN organization_collections oc ON oc.organization_id=o.id ${clause}`;
  const total = await env.LIBRARY_DB.prepare(`SELECT COUNT(*) total ${base}`).bind(...bindings).first();
  const result = await env.LIBRARY_DB.prepare(`SELECT o.*,oc.source_id,oc.rank,oc.year ${base} ORDER BY oc.source_id,COALESCE(oc.rank,999999),o.name LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all();
  return json({ type: "organization", total: total?.total || 0, limit, offset, items: result.results.map(rowToOrganization), storage: "d1" });
}

async function listItems(request, env, type, canReadFile) {
  const url = new URL(request.url); const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
  if (!env.LIBRARY_DB) {
    let rows = await staticData(request, env, `${type}s`);
    if (q) rows = rows.filter((item) => JSON.stringify(item).toLowerCase().includes(q.toLowerCase()));
    return json({ type, total: rows.length, limit, offset, items: rows.slice(offset, offset + limit), storage: "git-snapshot" });
  }
  const where = ["type = ?"]; const bindings = [type];
  if (q) { where.push("(title_zh LIKE ? OR title_en LIKE ? OR summary_zh LIKE ? OR summary_en LIKE ?)"); bindings.push(...Array(4).fill(`%${q}%`)); }
  const clause = `WHERE ${where.join(" AND ")}`;
  const total = await env.LIBRARY_DB.prepare(`SELECT COUNT(*) total FROM library_items ${clause}`).bind(...bindings).first();
  const result = await env.LIBRARY_DB.prepare(`SELECT * FROM library_items ${clause} ORDER BY COALESCE(published_at,updated_at) DESC LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all();
  return json({ type, total: total?.total || 0, limit, offset, items: result.results.map((row) => rowToItem(row, canReadFile || row.access === "public")), storage: "d1" });
}

async function getRelations(request, env) {
  const url = new URL(request.url); const entityType = url.searchParams.get("entityType") || ""; const entityId = url.searchParams.get("entityId") || "";
  if (!env.LIBRARY_DB) {
    const rows = await staticData(request, env, "relations");
    return json({ items: rows.filter((item) => (item.fromType === entityType && item.fromId === entityId) || (item.toType === entityType && item.toId === entityId)), storage: "git-snapshot" });
  }
  const result = await env.LIBRARY_DB.prepare("SELECT * FROM library_relations WHERE (from_type=? AND from_id=?) OR (to_type=? AND to_id=?) ORDER BY created_at DESC").bind(entityType, entityId, entityType, entityId).all();
  return json({ items: result.results, storage: "d1" });
}

async function getHistory(request, env) {
  const url = new URL(request.url);
  const entityType = cleanSegment(url.searchParams.get("entityType") || "");
  const entityId = cleanSegment(url.searchParams.get("entityId") || "");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 30), 1), 100);
  if (!entityType || !entityId) return json({ error: "entityType_and_entityId_required" }, { status: 400 });
  if (!env.LIBRARY_DB) return json({ items: [], storage: "git-snapshot" });
  const result = await env.LIBRARY_DB.prepare("SELECT * FROM library_revisions WHERE entity_type=? AND entity_id=? ORDER BY created_at DESC LIMIT ?").bind(entityType, entityId, limit).all();
  return json({ items: result.results.map((row) => ({ ...row, snapshot: JSON.parse(row.snapshot_json || "{}") })), storage: "d1" });
}

function localized(value) {
  if (typeof value === "string") return { zh: value, en: "" };
  return { zh: value?.zh || "", en: value?.en || "" };
}

function itemPayload(body, existing = {}) {
  const type = body.type || existing.type;
  if (!["case", "report", "dataset"].includes(type)) throw new Error("invalid_type");
  const title = localized(body.title ?? { zh: existing.title_zh, en: existing.title_en });
  const summary = localized(body.summary ?? { zh: existing.summary_zh, en: existing.summary_en });
  const access = body.access || existing.access || "metadata";
  if (!["public", "metadata", "private"].includes(access)) throw new Error("invalid_access");
  const now = new Date().toISOString();
  const id = cleanSegment(body.id || existing.id || `${type}-${crypto.randomUUID()}`);
  const slug = cleanSegment(body.slug || existing.slug || id);
  if (!id || !slug || (!title.zh && !title.en)) throw new Error("id_slug_and_title_required");
  return {
    id, slug, type,
    titleZh: title.zh, titleEn: title.en, summaryZh: summary.zh, summaryEn: summary.en,
    sourceUrl: body.sourceUrl ?? existing.source_url ?? "",
    sourcePublisher: body.sourcePublisher ?? existing.source_publisher ?? "",
    publishedAt: body.publishedAt ?? existing.published_at ?? null,
    access,
    fileKey: body.fileKey ?? existing.file_key ?? "",
    externalUrl: body.externalUrl ?? existing.external_url ?? "",
    verificationStatus: body.verificationStatus ?? existing.verification_status ?? "draft",
    metadataJson: JSON.stringify(body.metadata ?? JSON.parse(existing.metadata_json || "{}")),
    createdAt: existing.created_at || now,
    updatedAt: now,
  };
}

async function revision(env, entityType, entityId, action, snapshot, request) {
  const actor = request.headers.get("x-iptrust-actor") || "system-api";
  await env.LIBRARY_DB.prepare("INSERT INTO library_revisions(entity_type,entity_id,action,snapshot_json,actor,source_url,created_at) VALUES(?,?,?,?,?,?,?)")
    .bind(entityType, entityId, action, JSON.stringify(snapshot), actor, snapshot.sourceUrl || "", new Date().toISOString()).run();
}

async function writeItem(request, env, id = "") {
  const body = await request.json();
  const existing = id ? await env.LIBRARY_DB.prepare("SELECT * FROM library_items WHERE id=?").bind(id).first() : null;
  if (id && !existing) return writeJson({ error: "not_found" }, { status: 404 });
  const item = itemPayload({ ...body, id: id || body.id }, existing || {});
  await env.LIBRARY_DB.prepare(`INSERT INTO library_items(id,slug,type,title_zh,title_en,summary_zh,summary_en,source_url,source_publisher,published_at,access,file_key,external_url,verification_status,metadata_json,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,type=excluded.type,title_zh=excluded.title_zh,title_en=excluded.title_en,summary_zh=excluded.summary_zh,summary_en=excluded.summary_en,source_url=excluded.source_url,source_publisher=excluded.source_publisher,published_at=excluded.published_at,access=excluded.access,file_key=excluded.file_key,external_url=excluded.external_url,verification_status=excluded.verification_status,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at`)
    .bind(item.id, item.slug, item.type, item.titleZh, item.titleEn, item.summaryZh, item.summaryEn, item.sourceUrl, item.sourcePublisher, item.publishedAt, item.access, item.fileKey, item.externalUrl, item.verificationStatus, item.metadataJson, item.createdAt, item.updatedAt).run();
  await revision(env, item.type, item.id, existing ? "update" : "create", item, request);
  const sync = await syncGitItem(env, item, existing ? "update" : "create");
  return writeJson({ ok: true, item, sync });
}

async function writeRelation(request, env) {
  const body = await request.json();
  const allowed = ["owned-ip", "organization", "case", "report", "dataset"];
  if (!allowed.includes(body.fromType) || !allowed.includes(body.toType) || !cleanSegment(body.fromId) || !cleanSegment(body.toId)) {
    return writeJson({ error: "invalid_relation" }, { status: 400 });
  }
  const item = {
    id: cleanSegment(body.id || `relation-${crypto.randomUUID()}`),
    fromType: body.fromType, fromId: body.fromId, toType: body.toType, toId: body.toId,
    relation: cleanSegment(body.relation || "related-to") || "related-to",
    note: String(body.note || "").slice(0, 2000), createdAt: new Date().toISOString(),
  };
  await env.LIBRARY_DB.prepare("INSERT INTO library_relations(id,from_type,from_id,to_type,to_id,relation,note,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(from_type,from_id,to_type,to_id,relation) DO UPDATE SET note=excluded.note")
    .bind(item.id, item.fromType, item.fromId, item.toType, item.toId, item.relation, item.note, item.createdAt).run();
  await revision(env, "relation", item.id, "create", item, request);
  const sync = await syncGitRelation(env, item, "update");
  return writeJson({ ok: true, relation: item, sync });
}

async function deleteEntity(request, env, type, id) {
  const table = type === "items" ? "library_items" : type === "relations" ? "library_relations" : "";
  if (!table || !id) return writeJson({ error: "not_found" }, { status: 404 });
  const existing = await env.LIBRARY_DB.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first();
  if (!existing) return writeJson({ error: "not_found" }, { status: 404 });
  await revision(env, type === "items" ? existing.type : "relation", id, "delete", existing, request);
  await env.LIBRARY_DB.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id).run();
  let sync;
  if (type === "items") {
    sync = await syncGitItem(env, itemPayload({ id: existing.id }, existing), "delete");
  } else {
    sync = await syncGitRelation(env, {
      id: existing.id, fromType: existing.from_type, fromId: existing.from_id, toType: existing.to_type,
      toId: existing.to_id, relation: existing.relation, note: existing.note, createdAt: existing.created_at,
    }, "delete");
  }
  return writeJson({ ok: true, deleted: id, sync });
}

export async function onRequest({ request, env, params }) {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  const path = (Array.isArray(params.path) ? params.path.join("/") : String(params.path || "")).replace(/^\/+|\/+$/g, "");
  const [resource, id] = path.split("/");
  if (request.method !== "GET") {
    if (!authorized(request, env)) return writeJson({ error: "unauthorized" }, { status: 401 });
    if (!env.LIBRARY_DB) return writeJson({ error: "d1_binding_required" }, { status: 503 });
    try {
      if (["POST", "PATCH"].includes(request.method) && resource === "items") return writeItem(request, env, id);
      if (request.method === "POST" && resource === "relations") return writeRelation(request, env);
      if (request.method === "DELETE") return deleteEntity(request, env, resource, id);
      return writeJson({ error: "method_not_allowed" }, { status: 405 });
    } catch (error) {
      return writeJson({ error: error instanceof Error ? error.message : "invalid_request" }, { status: 400 });
    }
  }
  const canReadFile = authorized(request, env);
  if (!path || path === "organizations") return listOrganizations(request, env);
  if (["cases", "reports", "datasets"].includes(path)) return listItems(request, env, path.slice(0, -1), canReadFile);
  if (path === "relations") return getRelations(request, env);
  if (path === "history") return getHistory(request, env);
  return json({ error: "not_found", routes: ["/api/library/organizations", "/api/library/cases", "/api/library/reports", "/api/library/datasets", "/api/library/relations", "/api/library/history"] }, { status: 404 });
}
