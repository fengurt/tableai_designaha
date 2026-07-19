import { authenticate, createApiKey, hasIpScope, hasScope, issueSession, requireCsrf, verifyTotp } from "./security.js";
import { signMediaPath } from "./media.js";
import { search } from "./search.js";
import { applyRateLimit, audit, checkIdempotency, cleanSegment, deepMerge, enqueueOutbox, entityEtag, json, now, parseBody, parseJson, storeIdempotency } from "./utils.js";

const SAFE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/avif", "image/svg+xml", "application/pdf", "application/postscript", "application/illustrator", "application/vnd.adobe.photoshop", "application/octet-stream"]);

function error(request, code, status = 400, extra = {}) { return json(request, { error: code, ...extra }, { status }, true); }
function cookieHeaders(cookie) { return { "Set-Cookie": cookie }; }

async function requireActor(request, env, scope, ipSlug = "") {
  const actor = await authenticate(request, env);
  if (!actor) return { response: error(request, "unauthorized", 401) };
  if (!hasScope(actor, scope)) return { response: error(request, "forbidden_scope", 403, { required: scope }) };
  if (!hasIpScope(actor, ipSlug)) return { response: error(request, "forbidden_ip_scope", 403, { ip: ipSlug }) };
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !(await requireCsrf(request, actor, env))) return { response: error(request, "csrf_required", 403) };
  if (!(await applyRateLimit(request, env, actor, request.method === "GET" ? "read" : "write"))) return { response: error(request, "rate_limited", 429) };
  return { actor };
}

async function authRoutes(request, env, parts) {
  if (parts[1] === "exchange" && request.method === "POST") {
    const loginKey = request.headers.get("cf-connecting-ip") || "unknown";
    if (env.LOGIN_LIMITER && !(await env.LOGIN_LIMITER.limit({ key: loginKey })).success) return error(request, "rate_limited", 429);
    const body = await parseBody(request);
    const actor = await authenticate(new Request(request.url, { headers: { authorization: `Bearer ${body.apiKey || ""}` } }), env);
    if (!actor) return error(request, "bad_api_key", 401);
    if (env.ADMIN_TOTP_SECRET && !(await verifyTotp(env.ADMIN_TOTP_SECRET, body.totp))) return error(request, "bad_totp", 401);
    const session = await issueSession(env, actor);
    await audit(env, request, actor, "auth.exchange", "session", "", "success");
    return json(request, { ok: true, connected: true, csrfToken: session.csrf, expiresAt: session.expiresAt, scopes: actor.scopes, ipScopes: actor.ipScopes }, { headers: cookieHeaders(session.cookie) }, true);
  }
  if (parts[1] === "session" && request.method === "GET") {
    const actor = await authenticate(request, env);
    return actor ? json(request, { connected: true, actor: { id: actor.id, kind: actor.kind, scopes: actor.scopes, ipScopes: actor.ipScopes } }, {}, true) : error(request, "unauthorized", 401);
  }
  if (parts[1] === "logout" && request.method === "POST") {
    const actor = await authenticate(request, env);
    if (actor?.sessionId) await env.DB.prepare("UPDATE sessions SET revoked_at=? WHERE id=?").bind(now(), actor.sessionId).run();
    return json(request, { ok: true }, { headers: cookieHeaders("__Host-iptrust_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict") }, true);
  }
  return error(request, "not_found", 404);
}

async function keyRoutes(request, env, parts) {
  const auth = await requireActor(request, env, "keys:manage");
  if (auth.response) return auth.response;
  if (request.method === "GET") {
    const rows = await env.DB.prepare("SELECT id,prefix,kind,label,scopes_json,ip_scopes_json,expires_at,revoked_at,last_used_at,created_by,created_at FROM api_keys ORDER BY created_at DESC").all();
    return json(request, { items: rows.results.map((row) => ({ ...row, scopes: parseJson(row.scopes_json, []), ipScopes: parseJson(row.ip_scopes_json, []) })) }, {}, true);
  }
  if (request.method === "POST" && !parts[1]) {
    const body = await parseBody(request);
    const idem = await checkIdempotency(env, request, auth.actor, body);
    if (idem.error) return error(request, idem.error, idem.status);
    if (idem.replay) return json(request, idem.data, { status: idem.status, headers: { "Idempotency-Replayed": "true" } }, true);
    const created = await createApiKey(env, { ...body, createdBy: auth.actor.id });
    const payload = { ok: true, key: created, warning: "The token is shown once. Store it in 1Password now." };
    await storeIdempotency(env, request, auth.actor, idem, 201, payload);
    await audit(env, request, auth.actor, "key.create", "api-key", created.id, "success", {}, { ...created, token: "[redacted]" });
    return json(request, payload, { status: 201 }, true);
  }
  if (request.method === "DELETE" && parts[1]) {
    await env.DB.prepare("UPDATE api_keys SET revoked_at=? WHERE id=?").bind(now(), parts[1]).run();
    await env.DB.prepare("UPDATE sessions SET revoked_at=? WHERE api_key_id=? AND revoked_at IS NULL").bind(now(), parts[1]).run();
    await audit(env, request, auth.actor, "key.revoke", "api-key", parts[1], "success");
    return json(request, { ok: true, revoked: parts[1] }, {}, true);
  }
  return error(request, "method_not_allowed", 405);
}

async function loadBrand(request, env, slug) {
  const row = await env.DB.prepare("SELECT * FROM brand_records WHERE slug=?").bind(slug).first();
  if (row) return { payload: parseJson(row.payload_json), version: row.version, row };
  const response = await fetch(`${env.PUBLIC_SITE_URL}/api/brands/${encodeURIComponent(slug)}.json`);
  if (!response.ok) return null;
  return { payload: await response.json(), version: 1, row: null };
}

async function brandRoutes(request, env, parts) {
  const slug = cleanSegment(parts[1] || "");
  if (!slug) return error(request, "brand_required", 400);
  const current = await loadBrand(request, env, slug);
  if (!current) return error(request, "not_found", 404);
  if (request.method === "GET") return json(request, current.payload, { headers: { ETag: entityEtag("brand", slug, current.version) } });
  if (request.method !== "PATCH") return error(request, "method_not_allowed", 405);
  const auth = await requireActor(request, env, "brands:write", slug);
  if (auth.response) return auth.response;
  const ifMatch = request.headers.get("if-match");
  if (!ifMatch) return error(request, "if_match_required", 428);
  if (ifMatch !== entityEtag("brand", slug, current.version)) return error(request, "version_conflict", 412, { currentEtag: entityEtag("brand", slug, current.version) });
  const body = await parseBody(request);
  const idem = await checkIdempotency(env, request, auth.actor, body);
  if (idem.error) return error(request, idem.error, idem.status);
  if (idem.replay) return json(request, idem.data, { status: idem.status, headers: { "Idempotency-Replayed": "true" } }, true);
  const next = deepMerge(current.payload, body.patch || body);
  const version = current.version + 1;
  await env.DB.prepare("INSERT INTO brand_records(slug,payload_json,version,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET payload_json=excluded.payload_json,version=excluded.version,updated_at=excluded.updated_at")
    .bind(slug, JSON.stringify(next), version, current.row?.created_at || now(), now()).run();
  await env.DB.prepare("INSERT INTO library_revisions(entity_type,entity_id,action,snapshot_json,actor,source_url,created_at) VALUES('brand',?,'update',?,?,?,?)")
    .bind(slug, JSON.stringify(next), auth.actor.id, `${env.PUBLIC_SITE_URL}/brand?brand=${slug}`, now()).run();
  await enqueueOutbox(env, "git.sync", "brand", slug, version, { path: `data/runtime/brands/${slug}.json`, content: next });
  await enqueueOutbox(env, "search.index", "brand", slug, version, { entityType: "brand", entityId: slug });
  const payload = { ok: true, brand: next, version };
  await storeIdempotency(env, request, auth.actor, idem, 200, payload);
  await audit(env, request, auth.actor, "brand.update", "brand", slug, "success", current.payload, next);
  return json(request, payload, { headers: { ETag: entityEtag("brand", slug, version) } }, true);
}

function assetResult(row, variants, env, actor) {
  const publicUrl = row.access === "public" ? `${env.MEDIA_BASE_URL}/${row.source_object_key}` : "";
  return {
    id: row.id, ownerType: row.owner_type, ownerId: row.owner_id, role: row.role, title: row.title, access: row.access,
    filename: row.source_filename, sha256: row.sha256, mimeType: row.mime_type, extension: row.extension, bytes: row.bytes,
    width: row.width, height: row.height, status: row.status, version: row.version, publicUrl,
    variants: variants.map((item) => ({ id: item.id, kind: item.kind, format: item.format, mimeType: item.mime_type, bytes: item.bytes, width: item.width, height: item.height, url: `${env.MEDIA_BASE_URL}/${item.object_key}` })),
    canRequestPrivateUrl: row.access === "private" && hasScope(actor, "assets:read_private") && hasIpScope(actor, row.owner_id),
    metadata: parseJson(row.metadata_json), updatedAt: row.updated_at,
  };
}

async function listAssets(request, env, actor) {
  const url = new URL(request.url);
  const ip = cleanSegment(url.searchParams.get("ip") || "");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 200);
  const where = ["deleted_at IS NULL"];
  const bindings = [];
  if (ip) { where.push("owner_id=?"); bindings.push(ip); }
  if (!hasScope(actor, "assets:read_private")) where.push("access='public'");
  const rows = await env.DB.prepare(`SELECT * FROM assets WHERE ${where.join(" AND ")} ORDER BY updated_at DESC LIMIT ?`).bind(...bindings, limit).all();
  const items = [];
  for (const row of rows.results) {
    if (row.access === "private" && !hasIpScope(actor, row.owner_id)) continue;
    const variants = await env.DB.prepare("SELECT * FROM asset_variants WHERE asset_id=? ORDER BY kind,format").bind(row.id).all();
    items.push(assetResult(row, variants.results, env, actor));
  }
  return json(request, { items, total: items.length }, {}, Boolean(actor));
}

async function getAsset(request, env, id, actor) {
  const row = await env.DB.prepare("SELECT * FROM assets WHERE id=? AND deleted_at IS NULL").bind(id).first();
  if (!row) return error(request, "not_found", 404);
  if (row.access === "private" && (!hasScope(actor, "assets:read_private") || !hasIpScope(actor, row.owner_id))) return error(request, "forbidden", 403);
  const variants = await env.DB.prepare("SELECT * FROM asset_variants WHERE asset_id=? ORDER BY kind,format").bind(id).all();
  return json(request, assetResult(row, variants.results, env, actor), { headers: { ETag: entityEtag("asset", id, row.version) } }, Boolean(actor));
}

async function startUpload(request, env, actor) {
  const body = await parseBody(request);
  const idem = await checkIdempotency(env, request, actor, body);
  if (idem.error) return error(request, idem.error, idem.status);
  if (idem.replay) return json(request, idem.data, { status: idem.status, headers: { "Idempotency-Replayed": "true" } }, true);
  const sourceAssetId = cleanSegment(body.sourceAssetId || "");
  const sourceAsset = sourceAssetId ? await env.DB.prepare("SELECT * FROM assets WHERE id=? AND deleted_at IS NULL").bind(sourceAssetId).first() : null;
  if (sourceAssetId && !sourceAsset) return error(request, "source_asset_not_found", 404);
  const ownerId = cleanSegment(sourceAsset?.owner_id || body.ownerId);
  if (!ownerId || !hasIpScope(actor, ownerId)) return error(request, "forbidden_ip_scope", 403);
  const bytes = Number(body.bytes || 0);
  if (!Number.isFinite(bytes) || bytes < 1 || bytes > Number(env.MAX_UPLOAD_BYTES || 524288000)) return error(request, "invalid_size", 413, { maxBytes: Number(env.MAX_UPLOAD_BYTES || 524288000) });
  const mime = String(body.mimeType || "application/octet-stream").toLowerCase();
  if (!SAFE_MIME.has(mime)) return error(request, "mime_not_allowed", 415);
  const sha = String(body.sha256 || "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(sha)) return error(request, "sha256_required", 400);
  const filename = String(body.filename || "asset.bin").replace(/[\\/\0]/g, "-").slice(0, 220);
  const extension = cleanSegment(filename.split(".").at(-1) || "bin");
  const role = cleanSegment(body.role || "source") || "source";
  const access = sourceAsset ? "public" : body.access === "public" && !["ai", "psd"].includes(extension) ? "public" : "private";
  const assetId = sourceAsset?.id || cleanSegment(body.assetId || `${ownerId}-${role}-${sha.slice(0, 12)}`);
  const objectKey = `${access}/${ownerId}/${assetId}/${sha}/${sourceAsset ? role : role === "source" ? "source" : role}.${extension}`;
  const bucket = access === "private" ? env.ORIGINALS : env.PREVIEWS;
  const upload = await bucket.createMultipartUpload(objectKey, { httpMetadata: { contentType: mime, cacheControl: access === "public" ? "public, max-age=31536000, immutable" : "private, no-store" }, customMetadata: { sha256: sha, ownerId, assetId, role, access, filename } });
  const jobId = crypto.randomUUID();
  const job = { uploadId: upload.uploadId, objectKey, access, ownerId, assetId, variantOf: sourceAsset?.id || "", filename, extension, mime, bytes, sha256: sha, role, title: String(body.title || filename).slice(0, 240), width: body.width || null, height: body.height || null };
  await env.DB.prepare("INSERT INTO asset_jobs(id,type,status,payload_json,created_at,updated_at) VALUES(?,'upload','uploading',?,?,?)").bind(jobId, JSON.stringify(job), now(), now()).run();
  const apiOrigin = new URL(request.url).origin;
  const payload = { ok: true, upload: { id: jobId, assetId, uploadId: upload.uploadId, partSize: 16 * 1024 * 1024, maxBytes: Number(env.MAX_UPLOAD_BYTES || 524288000), partsUrl: `${apiOrigin}/api/v2/assets/uploads/${jobId}/parts/{partNumber}`, completeUrl: `${apiOrigin}/api/v2/assets/uploads/${jobId}/complete` } };
  await storeIdempotency(env, request, actor, idem, 201, payload);
  await audit(env, request, actor, "asset.upload.start", "asset", assetId, "success", {}, { ...job, uploadId: "[redacted]" });
  return json(request, payload, { status: 201 }, true);
}

async function uploadPart(request, env, actor, jobId, partNumber) {
  const jobRow = await env.DB.prepare("SELECT * FROM asset_jobs WHERE id=? AND status='uploading'").bind(jobId).first();
  if (!jobRow) return error(request, "upload_not_found", 404);
  const job = parseJson(jobRow.payload_json);
  if (!hasIpScope(actor, job.ownerId)) return error(request, "forbidden_ip_scope", 403);
  const length = Number(request.headers.get("content-length") || 0);
  if (!length || length > 20 * 1024 * 1024) return error(request, "invalid_part_size", 413, { maxPartBytes: 20 * 1024 * 1024 });
  const bucket = job.access === "private" ? env.ORIGINALS : env.PREVIEWS;
  const upload = bucket.resumeMultipartUpload(job.objectKey, job.uploadId);
  const part = await upload.uploadPart(Number(partNumber), request.body);
  return json(request, { ok: true, partNumber: part.partNumber, etag: part.etag }, {}, true);
}

async function completeUpload(request, env, actor, jobId) {
  const body = await parseBody(request);
  const idem = await checkIdempotency(env, request, actor, body);
  if (idem.error) return error(request, idem.error, idem.status);
  if (idem.replay) return json(request, idem.data, { status: idem.status, headers: { "Idempotency-Replayed": "true" } }, true);
  const jobRow = await env.DB.prepare("SELECT * FROM asset_jobs WHERE id=? AND status='uploading'").bind(jobId).first();
  if (!jobRow) return error(request, "upload_not_found", 404);
  const job = parseJson(jobRow.payload_json);
  if (!hasIpScope(actor, job.ownerId)) return error(request, "forbidden_ip_scope", 403);
  const parts = Array.isArray(body.parts) ? body.parts.map((part) => ({ partNumber: Number(part.partNumber), etag: String(part.etag) })).sort((a, b) => a.partNumber - b.partNumber) : [];
  if (!parts.length) return error(request, "parts_required", 400);
  const bucket = job.access === "private" ? env.ORIGINALS : env.PREVIEWS;
  const object = await bucket.resumeMultipartUpload(job.objectKey, job.uploadId).complete(parts);
  if (object.size !== job.bytes) return error(request, "size_mismatch", 422, { expected: job.bytes, actual: object.size });
  const timestamp = now();
  if (job.variantOf) {
    const variantId = `${job.assetId}-${job.role}-${job.extension}`;
    await env.DB.batch([
      env.DB.prepare("INSERT INTO asset_variants(id,asset_id,kind,object_key,format,mime_type,sha256,bytes,width,height,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(asset_id,kind,format) DO UPDATE SET object_key=excluded.object_key,mime_type=excluded.mime_type,sha256=excluded.sha256,bytes=excluded.bytes,width=excluded.width,height=excluded.height,created_at=excluded.created_at")
        .bind(variantId, job.assetId, job.role, job.objectKey, job.extension, job.mime, job.sha256, job.bytes, job.width, job.height, timestamp),
      env.DB.prepare("UPDATE assets SET status='ready',version=version+1,updated_at=? WHERE id=?").bind(timestamp, job.assetId),
      env.DB.prepare("UPDATE asset_jobs SET asset_id=?,status='done',completed_at=?,updated_at=? WHERE id=?").bind(job.assetId, timestamp, timestamp, jobId),
    ]);
    await enqueueOutbox(env, "search.index", "asset", job.assetId, 1, { entityType: "asset", entityId: job.assetId });
  } else {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO assets(id,owner_type,owner_id,role,title,access,source_object_key,source_filename,sha256,mime_type,extension,bytes,width,height,status,version,metadata_json,created_at,updated_at) VALUES(?,'owned-ip',?,?,?,?,?,?,?,?,?,?,?,?,'processing',1,?,?,?) ON CONFLICT(id) DO UPDATE SET source_object_key=excluded.source_object_key,sha256=excluded.sha256,mime_type=excluded.mime_type,bytes=excluded.bytes,status='processing',version=assets.version+1,updated_at=excluded.updated_at")
        .bind(job.assetId, job.ownerId, job.role, job.title, job.access, job.objectKey, job.filename, job.sha256, job.mime, job.extension, job.bytes, job.width, job.height, JSON.stringify({ uploadJobId: jobId }), timestamp, timestamp),
      env.DB.prepare("UPDATE asset_jobs SET asset_id=?,status='queued',updated_at=? WHERE id=?").bind(job.assetId, timestamp, jobId),
    ]);
    await enqueueOutbox(env, "asset.process", "asset", job.assetId, 1, { jobId, assetId: job.assetId, ownerId: job.ownerId, objectKey: job.objectKey, access: job.access, mimeType: job.mime, extension: job.extension, expectedSha256: job.sha256 });
  }
  const payload = { ok: true, assetId: job.assetId, jobId, variant: job.variantOf ? { kind: job.role, format: job.extension } : null, status: job.variantOf ? "ready" : "processing", etag: object.httpEtag };
  await storeIdempotency(env, request, actor, idem, 202, payload);
  await audit(env, request, actor, "asset.upload.complete", "asset", job.assetId, "success", {}, { jobId, bytes: object.size, sha256: job.sha256 });
  return json(request, payload, { status: 202, headers: { ETag: entityEtag("asset", job.assetId, 1) } }, true);
}

async function updateAssetProcessingStatus(request, env, actor, row) {
  const body = await parseBody(request);
  const idem = await checkIdempotency(env, request, actor, body);
  if (idem.error) return error(request, idem.error, idem.status);
  if (idem.replay) return json(request, idem.data, { status: idem.status, headers: { "Idempotency-Replayed": "true" } }, true);
  const status = ["processing", "converting", "failed", "ready"].includes(body.status) ? body.status : "failed";
  const metadata = { ...parseJson(row.metadata_json), processingError: status === "failed" ? String(body.error || "conversion_failed").slice(0, 1000) : "" };
  await env.DB.prepare("UPDATE assets SET status=?,metadata_json=?,updated_at=? WHERE id=?").bind(status, JSON.stringify(metadata), now(), row.id).run();
  await env.DB.prepare("UPDATE asset_jobs SET status=?,error=?,updated_at=?,completed_at=CASE WHEN ? IN ('failed','ready') THEN ? ELSE completed_at END WHERE asset_id=? AND status NOT IN ('done','failed')")
    .bind(status, metadata.processingError, now(), status, now(), row.id).run();
  const payload = { ok: true, assetId: row.id, status };
  await storeIdempotency(env, request, actor, idem, 200, payload);
  await audit(env, request, actor, "asset.processing_status", "asset", row.id, status === "failed" ? "failure" : "success", { status: row.status }, payload);
  return json(request, payload, {}, true);
}

async function assetRoutes(request, env, parts) {
  const actor = await authenticate(request, env);
  if (request.method === "GET" && !parts[1]) return listAssets(request, env, actor);
  if (request.method === "GET" && parts[1] && parts[1] !== "uploads") return getAsset(request, env, parts[1], actor);
  if (request.method === "POST" && parts[1] === "uploads" && !parts[2]) {
    const auth = await requireActor(request, env, "assets:upload");
    return auth.response || startUpload(request, env, auth.actor);
  }
  if (request.method === "PUT" && parts[1] === "uploads" && parts[3] === "parts") {
    const auth = await requireActor(request, env, "assets:upload");
    return auth.response || uploadPart(request, env, auth.actor, parts[2], parts[4]);
  }
  if (request.method === "POST" && parts[1] === "uploads" && parts[3] === "complete") {
    const auth = await requireActor(request, env, "assets:upload");
    return auth.response || completeUpload(request, env, auth.actor, parts[2]);
  }
  if (request.method === "POST" && parts[2] === "status") {
    const row = await env.DB.prepare("SELECT * FROM assets WHERE id=? AND deleted_at IS NULL").bind(parts[1]).first();
    if (!row) return error(request, "not_found", 404);
    const auth = await requireActor(request, env, "assets:upload", row.owner_id);
    return auth.response || updateAssetProcessingStatus(request, env, auth.actor, row);
  }
  if (request.method === "POST" && parts[2] === "sign") {
    const row = await env.DB.prepare("SELECT * FROM assets WHERE id=? AND deleted_at IS NULL").bind(parts[1]).first();
    if (!row) return error(request, "not_found", 404);
    const auth = await requireActor(request, env, "assets:read_private", row.owner_id);
    if (auth.response) return auth.response;
    const body = await parseBody(request);
    const signed = await signMediaPath(env, `/${row.source_object_key}`, body.ttlSeconds);
    await audit(env, request, auth.actor, "asset.sign", "asset", row.id, "success");
    return json(request, { ok: true, ...signed }, {}, true);
  }
  if (request.method === "DELETE" && parts[1]) {
    const row = await env.DB.prepare("SELECT * FROM assets WHERE id=? AND deleted_at IS NULL").bind(parts[1]).first();
    if (!row) return error(request, "not_found", 404);
    const auth = await requireActor(request, env, "assets:delete", row.owner_id);
    if (auth.response) return auth.response;
    if (!request.headers.get("if-match")) return error(request, "if_match_required", 428);
    if (request.headers.get("if-match") !== entityEtag("asset", row.id, row.version)) return error(request, "version_conflict", 412, { currentEtag: entityEtag("asset", row.id, row.version) });
    await env.DB.prepare("UPDATE assets SET deleted_at=?,status='deleted',version=version+1,updated_at=? WHERE id=?").bind(now(), now(), row.id).run();
    await enqueueOutbox(env, "git.sync", "asset", row.id, row.version + 1, { deleted: true, assetId: row.id, ownerId: row.owner_id });
    await audit(env, request, auth.actor, "asset.delete", "asset", row.id, "success", row, {});
    return json(request, { ok: true, deleted: row.id }, {}, true);
  }
  return error(request, "not_found", 404);
}

async function libraryRoutes(request, env, parts) {
  if (request.method === "GET") {
    const target = new URL(`${env.PUBLIC_SITE_URL}/api/library/${parts[1] || "organizations"}`);
    target.search = new URL(request.url).search;
    const response = await fetch(target);
    return new Response(response.body, { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  }
  const auth = await requireActor(request, env, "library:write");
  if (auth.response) return auth.response;
  const body = await parseBody(request);
  const idem = await checkIdempotency(env, request, auth.actor, body);
  if (idem.error) return error(request, idem.error, idem.status);
  if (idem.replay) return json(request, idem.data, { status: idem.status, headers: { "Idempotency-Replayed": "true" } }, true);
  const id = cleanSegment(parts[2] || body.id || crypto.randomUUID());
  const existing = await env.DB.prepare("SELECT * FROM library_items WHERE id=?").bind(id).first();
  if (["PATCH", "DELETE"].includes(request.method)) {
    if (!request.headers.get("if-match")) return error(request, "if_match_required", 428);
    if (!existing) return error(request, "not_found", 404);
    if (request.headers.get("if-match") !== entityEtag("library", id, existing.version)) return error(request, "version_conflict", 412, { currentEtag: entityEtag("library", id, existing.version) });
  }
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM library_items WHERE id=?").bind(id).run();
    await enqueueOutbox(env, "git.sync", "library", id, existing.version + 1, { deleted: true, id, type: existing.type });
    const payload = { ok: true, deleted: id };
    await storeIdempotency(env, request, auth.actor, idem, 200, payload);
    return json(request, payload, {}, true);
  }
  const version = (existing?.version || 0) + 1;
  const type = ["case", "report", "dataset"].includes(body.type || existing?.type) ? (body.type || existing.type) : "case";
  const value = {
    id, slug: cleanSegment(body.slug || existing?.slug || id), type,
    titleZh: body.title?.zh ?? existing?.title_zh ?? "", titleEn: body.title?.en ?? existing?.title_en ?? "",
    summaryZh: body.summary?.zh ?? existing?.summary_zh ?? "", summaryEn: body.summary?.en ?? existing?.summary_en ?? "",
    sourceUrl: body.sourceUrl ?? existing?.source_url ?? "", sourcePublisher: body.sourcePublisher ?? existing?.source_publisher ?? "",
    publishedAt: body.publishedAt ?? existing?.published_at ?? null, access: body.access ?? existing?.access ?? "metadata",
    fileKey: body.fileKey ?? existing?.file_key ?? "", externalUrl: body.externalUrl ?? existing?.external_url ?? "",
    verificationStatus: body.verificationStatus ?? existing?.verification_status ?? "draft", metadata: body.metadata ?? parseJson(existing?.metadata_json || "{}"), version,
  };
  await env.DB.prepare(`INSERT INTO library_items(id,slug,type,title_zh,title_en,summary_zh,summary_en,source_url,source_publisher,published_at,access,file_key,external_url,verification_status,metadata_json,created_at,updated_at,version)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,type=excluded.type,title_zh=excluded.title_zh,title_en=excluded.title_en,summary_zh=excluded.summary_zh,summary_en=excluded.summary_en,source_url=excluded.source_url,source_publisher=excluded.source_publisher,published_at=excluded.published_at,access=excluded.access,file_key=excluded.file_key,external_url=excluded.external_url,verification_status=excluded.verification_status,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at,version=excluded.version`)
    .bind(id, value.slug, type, value.titleZh, value.titleEn, value.summaryZh, value.summaryEn, value.sourceUrl, value.sourcePublisher, value.publishedAt, value.access, value.fileKey, value.externalUrl, value.verificationStatus, JSON.stringify(value.metadata), existing?.created_at || now(), now(), version).run();
  await enqueueOutbox(env, "git.sync", "library", id, version, { path: `data/runtime/library/${type}/${id}.json`, content: value });
  await enqueueOutbox(env, "search.index", "library", id, version, { entityType: type, entityId: id });
  const payload = { ok: true, item: value };
  await storeIdempotency(env, request, auth.actor, idem, existing ? 200 : 201, payload);
  await audit(env, request, auth.actor, existing ? "library.update" : "library.create", type, id, "success", existing || {}, value);
  return json(request, payload, { status: existing ? 200 : 201, headers: { ETag: entityEtag("library", id, version) } }, true);
}

async function searchRoute(request, env) {
  const actor = await authenticate(request, env);
  if (!(await applyRateLimit(request, env, actor, "read"))) return error(request, "rate_limited", 429);
  const url = new URL(request.url);
  const query = String(url.searchParams.get("q") || "").trim().slice(0, 500);
  if (!query) return error(request, "query_required", 400);
  const mode = ["lexical", "semantic", "hybrid"].includes(url.searchParams.get("mode")) ? url.searchParams.get("mode") : "hybrid";
  const items = await search(env, actor, { query, mode, limit: url.searchParams.get("limit"), types: (url.searchParams.get("types") || "").split(",").filter(Boolean), ip: cleanSegment(url.searchParams.get("ip") || "") });
  return json(request, { query, mode, total: items.length, items }, {}, Boolean(actor));
}

async function auditRoute(request, env) {
  const auth = await requireActor(request, env, "audit:read");
  if (auth.response) return auth.response;
  const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit") || 100), 1), 500);
  const rows = await env.DB.prepare("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT ?").bind(limit).all();
  return json(request, { items: rows.results }, {}, true);
}

async function jobRoutes(request, env, parts) {
  if (request.method === "GET") {
    const auth = await requireActor(request, env, "audit:read");
    if (auth.response) return auth.response;
    const [outbox, assetJobs, counts] = await Promise.all([
      env.DB.prepare("SELECT id,event_type,aggregate_type,aggregate_id,aggregate_version,status,attempts,last_error,created_at,processed_at FROM outbox ORDER BY created_at DESC LIMIT 200").all(),
      env.DB.prepare("SELECT id,asset_id,type,status,attempts,error,created_at,updated_at,completed_at FROM asset_jobs ORDER BY created_at DESC LIMIT 200").all(),
      env.DB.prepare("SELECT status,COUNT(*) count FROM outbox GROUP BY status").all(),
    ]);
    return json(request, { counts: Object.fromEntries(counts.results.map((row) => [row.status, row.count])), outbox: outbox.results, assetJobs: assetJobs.results }, {}, true);
  }
  if (request.method === "POST" && parts[1] === "replay") {
    const auth = await requireActor(request, env, "jobs:manage");
    if (auth.response) return auth.response;
    const body = await parseBody(request);
    const idem = await checkIdempotency(env, request, auth.actor, body);
    if (idem.error) return error(request, idem.error, idem.status);
    if (idem.replay) return json(request, idem.data, { status: idem.status, headers: { "Idempotency-Replayed": "true" } }, true);
    const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map((id) => String(id)).filter(Boolean))].slice(0, 200) : [];
    let result;
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(",");
      result = await env.DB.prepare(`UPDATE outbox SET status='pending',attempts=0,next_attempt_at=?,processed_at=NULL WHERE id IN (${placeholders})`).bind(now(), ...ids).run();
    } else {
      result = await env.DB.prepare("UPDATE outbox SET status='pending',attempts=0,next_attempt_at=?,processed_at=NULL WHERE status='failed'").bind(now()).run();
    }
    const payload = { ok: true, replayed: result.meta?.changes || 0 };
    await storeIdempotency(env, request, auth.actor, idem, 200, payload);
    await audit(env, request, auth.actor, "jobs.replay", "outbox", ids.join(","), "success", {}, payload);
    return json(request, payload, {}, true);
  }
  return error(request, "method_not_allowed", 405);
}

export async function handleApi(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": request.headers.get("origin") || "*", "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type, If-Match, Idempotency-Key, X-CSRF-Token, X-Admin-Key", "Access-Control-Max-Age": "86400" } });
  const parts = new URL(request.url).pathname.replace(/^\/api\/v2\/?/, "").split("/").filter(Boolean);
  try {
    if (parts[0] === "auth") return authRoutes(request, env, parts);
    if (parts[0] === "admin" && parts[1] === "keys") return keyRoutes(request, env, parts.slice(1));
    if (parts[0] === "admin" && parts[1] === "jobs") return jobRoutes(request, env, parts.slice(1));
    if (parts[0] === "brands") return brandRoutes(request, env, parts);
    if (parts[0] === "assets") return assetRoutes(request, env, parts);
    if (parts[0] === "library") return libraryRoutes(request, env, parts);
    if (parts[0] === "search") return searchRoute(request, env);
    if (parts[0] === "audit") return auditRoute(request, env);
    if (parts[0] === "health") return json(request, { ok: true, service: "iptrust-edge", bindings: { d1: Boolean(env.DB), originals: Boolean(env.ORIGINALS), previews: Boolean(env.PREVIEWS), ai: Boolean(env.AI), vectorize: Boolean(env.VECTORIZE), images: Boolean(env.IMAGES), queues: Boolean(env.WRITE_SYNC && env.PROCESSING) } });
    return error(request, "not_found", 404);
  } catch (cause) {
    console.error("api_error", cause);
    return error(request, "internal_error", 500, { message: cause instanceof Error ? cause.message : "Unknown error" });
  }
}
