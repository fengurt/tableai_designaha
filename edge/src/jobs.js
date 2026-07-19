import { indexSearchDocument, indexSearchDocuments } from "./search.js";
import { chineseNgrams, now, parseJson } from "./utils.js";
import { sha256 } from "./security.js";

async function githubFile(env, path, content, version) {
  if (!env.GITHUB_SERVICE_TOKEN) throw new Error("github_service_token_missing");
  const endpoint = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;
  const headers = { Authorization: `Bearer ${env.GITHUB_SERVICE_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "iptrust-edge", "X-GitHub-Api-Version": "2022-11-28" };
  const current = await fetch(`${endpoint}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`, { headers });
  const existing = current.ok ? await current.json() : null;
  if (existing) {
    const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(existing.content.replace(/\s/g, "")), (char) => char.charCodeAt(0))));
    if (Number(decoded?._iptrustVersion || 0) > Number(version || 0)) return { skipped: "newer_git_version" };
  }
  const document = { ...content, _iptrustVersion: version, _iptrustSyncedAt: now() };
  const encoded = btoa(unescape(encodeURIComponent(`${JSON.stringify(document, null, 2)}\n`)));
  const response = await fetch(endpoint, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ message: `sync: ${path} v${version}`, content: encoded, branch: env.GITHUB_BRANCH, ...(existing?.sha ? { sha: existing.sha } : {}) }) });
  if (!response.ok) throw new Error(`github_sync_${response.status}:${await response.text()}`);
  return response.json();
}

async function materializeSearchDocument(env, payload, deferVector = false) {
  const type = payload.entityType;
  const id = payload.entityId;
  let document;
  if (type === "brand") {
    const row = await env.DB.prepare("SELECT * FROM brand_records WHERE slug=?").bind(id).first();
    if (!row) return null;
    const brand = parseJson(row.payload_json);
    const title = brand.displayName || brand.name || brand.names?.zh || brand.names?.en || id;
    const body = [brand.secondaryName, brand.description, brand.introduction, brand.business, ...(brand.tags || []), ...(brand.tracks || []), ...(brand.audiences || [])].filter(Boolean).join("\n");
    document = { id: `brand:${id}`, entityType: "brand", entityId: id, ipSlug: id, language: brand.mainLanguage || "und", access: "public", title, body, metadata: { slug: id, website: brand.website || "" }, authority: 1.3, version: row.version };
  } else if (["case", "report", "dataset", "library"].includes(type)) {
    const row = await env.DB.prepare("SELECT * FROM library_items WHERE id=?").bind(id).first();
    if (!row) return null;
    document = { id: `${row.type}:${id}`, entityType: row.type, entityId: id, ipSlug: "", language: row.title_zh ? "zh" : "en", access: row.access === "private" ? "private" : "public", title: row.title_zh || row.title_en, body: [row.summary_zh, row.summary_en, row.source_publisher].filter(Boolean).join("\n"), metadata: { sourceUrl: row.source_url, sourcePublisher: row.source_publisher }, authority: row.verification_status === "verified" ? 1.25 : 1, version: row.version };
  } else if (type === "organization") {
    const row = await env.DB.prepare("SELECT * FROM organizations WHERE id=?").bind(id).first();
    if (!row) return null;
    document = { id: `organization:${id}`, entityType: "organization", entityId: id, ipSlug: "", language: row.main_language || "und", access: "public", title: row.native_name || row.name, body: [row.name, row.native_name, row.description, row.industry, row.country, row.headquarters].filter(Boolean).join("\n"), metadata: { website: row.official_website, sourceUrl: row.source_url, sourcePublisher: row.source_publisher, logoUrl: row.logo_url }, authority: row.verification_status === "source-verified" ? 1.35 : 1, version: 1 };
  } else if (type === "asset") {
    const row = await env.DB.prepare("SELECT * FROM assets WHERE id=? AND deleted_at IS NULL").bind(id).first();
    if (!row) return null;
    document = { id: `asset:${id}`, entityType: "asset", entityId: id, ipSlug: row.owner_id, language: "und", access: row.access, title: row.title || row.source_filename, body: `${row.role}\n${row.source_filename}\n${row.mime_type}`, metadata: { mimeType: row.mime_type, role: row.role, bytes: row.bytes }, authority: 1, version: row.version };
  }
  if (!document) return null;
  const contentHash = await sha256(`${document.title}\n${document.body}`);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO search_documents(id,entity_type,entity_id,ip_slug,language,access,title,body,metadata_json,search_tokens,source_authority,content_hash,version,vector_status,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?) ON CONFLICT(id) DO UPDATE SET entity_type=excluded.entity_type,entity_id=excluded.entity_id,ip_slug=excluded.ip_slug,language=excluded.language,access=excluded.access,title=excluded.title,body=excluded.body,metadata_json=excluded.metadata_json,search_tokens=excluded.search_tokens,source_authority=excluded.source_authority,content_hash=excluded.content_hash,version=excluded.version,vector_status='pending',updated_at=excluded.updated_at`)
      .bind(document.id, document.entityType, document.entityId, document.ipSlug, document.language, document.access, document.title, document.body, JSON.stringify(document.metadata), chineseNgrams(`${document.title} ${document.body}`), document.authority, contentHash, document.version, now()),
    env.DB.prepare("DELETE FROM search_fts WHERE document_id=?").bind(document.id),
  ]);
  await env.DB.prepare("INSERT INTO search_fts(document_id,title,body,search_tokens) VALUES(?,?,?,?)").bind(document.id, document.title, document.body, chineseNgrams(`${document.title} ${document.body}`)).run();
  return deferVector ? document.id : indexSearchDocument(env, document.id);
}

async function processAsset(env, payload) {
  const row = await env.DB.prepare("SELECT * FROM assets WHERE id=?").bind(payload.assetId).first();
  if (!row) return { skipped: "asset_missing" };
  if (row.access === "public" && /^image\/(png|jpeg|webp|avif|svg\+xml)$/.test(row.mime_type)) {
    await env.DB.prepare("UPDATE assets SET status='ready',updated_at=? WHERE id=?").bind(now(), row.id).run();
    return materializeSearchDocument(env, { entityType: "asset", entityId: row.id });
  }
  if (!env.GITHUB_SERVICE_TOKEN) throw new Error("github_service_token_missing");
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.GITHUB_SERVICE_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "iptrust-edge" },
    body: JSON.stringify({ event_type: "iptrust-asset-process", client_payload: { assetId: row.id, ownerId: row.owner_id, jobId: payload.jobId || "", mimeType: row.mime_type, extension: row.extension } }),
  });
  if (!response.ok) throw new Error(`github_dispatch_${response.status}:${await response.text()}`);
  await env.DB.prepare("UPDATE assets SET status='converting',updated_at=? WHERE id=?").bind(now(), row.id).run();
  return { dispatched: row.id };
}

async function processMessage(env, message) {
  const event = message.body || {};
  if (event.eventType === "git.sync") {
    const payload = event.payload || {};
    if (!payload.path || !payload.content) return { skipped: "no_git_document" };
    return githubFile(env, payload.path, payload.content, event.version);
  }
  if (event.eventType === "search.index") return materializeSearchDocument(env, event.payload || {});
  if (event.eventType === "asset.process") return processAsset(env, event.payload || {});
  throw new Error(`unknown_event:${event.eventType}`);
}

export async function handleQueue(batch, env) {
  if (batch.queue === "iptrust-dlq") {
    for (const message of batch.messages) {
      const outboxId = message.body?.outboxId;
      if (outboxId) await env.DB.prepare("UPDATE outbox SET status='failed',last_error=CASE WHEN last_error='' THEN 'dead_letter_queue' ELSE last_error END WHERE id=?").bind(outboxId).run();
      message.ack();
    }
    env.METRICS?.writeDataPoint({ blobs: ["dead_letter", batch.queue], doubles: [batch.messages.length] });
    return;
  }
  const searchMessages = batch.messages.filter((message) => message.body?.eventType === "search.index");
  const otherMessages = batch.messages.filter((message) => message.body?.eventType !== "search.index");
  if (searchMessages.length) {
    try {
      const ids = [];
      for (const message of searchMessages) {
        const id = await materializeSearchDocument(env, message.body?.payload || {}, true);
        if (id) ids.push(id);
      }
      await indexSearchDocuments(env, ids);
      const outboxIds = searchMessages.map((message) => message.body?.outboxId).filter(Boolean);
      if (outboxIds.length) {
        const placeholders = outboxIds.map(() => "?").join(",");
        await env.DB.prepare(`UPDATE outbox SET status='done',processed_at=? WHERE id IN (${placeholders})`).bind(now(), ...outboxIds).run();
      }
      searchMessages.forEach((message) => message.ack());
    } catch (error) {
      console.error("queue_search_batch_error", error);
      for (const message of searchMessages) {
        if (message.body?.outboxId) await env.DB.prepare("UPDATE outbox SET attempts=attempts+1,last_error=?,next_attempt_at=? WHERE id=?").bind(String(error).slice(0, 1000), new Date(Date.now() + 60000).toISOString(), message.body.outboxId).run();
        message.retry({ delaySeconds: Math.min(300, 15 * (Number(message.attempts || 0) + 1)) });
      }
    }
  }
  for (const message of otherMessages) {
    try {
      await processMessage(env, message);
      if (message.body?.outboxId) await env.DB.prepare("UPDATE outbox SET status='done',processed_at=? WHERE id=?").bind(now(), message.body.outboxId).run();
      message.ack();
    } catch (error) {
      console.error("queue_error", message.id, error);
      if (message.body?.outboxId) await env.DB.prepare("UPDATE outbox SET attempts=attempts+1,last_error=?,next_attempt_at=? WHERE id=?").bind(String(error).slice(0, 1000), new Date(Date.now() + 60000).toISOString(), message.body.outboxId).run();
      message.retry({ delaySeconds: Math.min(300, 15 * (Number(message.attempts || 0) + 1)) });
    }
  }
}

async function flushOutbox(env) {
  const rows = await env.DB.prepare("SELECT * FROM outbox WHERE status='pending' AND next_attempt_at<=? ORDER BY created_at LIMIT 200").bind(now()).all();
  for (const row of rows.results) {
    const binding = row.event_type === "git.sync" ? env.WRITE_SYNC : env.PROCESSING;
    await binding.send({ outboxId: row.id, eventType: row.event_type, aggregateType: row.aggregate_type, aggregateId: row.aggregate_id, version: row.aggregate_version, payload: parseJson(row.payload_json) });
    await env.DB.prepare("UPDATE outbox SET status='queued',attempts=attempts+1 WHERE id=? AND status='pending'").bind(row.id).run();
  }
  return rows.results.length;
}

export async function handleScheduled(controller, env) {
  const flushed = await flushOutbox(env);
  if (controller.cron === "17 3 * * *") {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE expires_at<? OR (revoked_at IS NOT NULL AND revoked_at<?)").bind(now(), new Date(Date.now() - 30 * 86400000).toISOString()),
      env.DB.prepare("DELETE FROM idempotency_keys WHERE expires_at<?").bind(now()),
      env.DB.prepare("UPDATE outbox SET status='pending',next_attempt_at=? WHERE status='queued' AND processed_at IS NULL AND created_at<?").bind(now(), new Date(Date.now() - 3600000).toISOString()),
    ]);
  }
  env.METRICS?.writeDataPoint({ blobs: ["scheduled", controller.cron], doubles: [flushed] });
}
