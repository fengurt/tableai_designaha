import { hasIpScope, hasScope } from "./security.js";
import { chineseNgrams, parseJson } from "./utils.js";

function visible(row, actor) {
  if (row.access === "public") return true;
  return hasScope(actor, "assets:read_private") && hasIpScope(actor, row.ip_slug);
}

function embeddingRows(result) {
  const data = result?.data ?? result?.result?.data;
  if (Array.isArray(data?.[0])) return data;
  if (Array.isArray(data)) return [data];
  throw new Error("embedding_response_invalid");
}

export async function indexSearchDocument(env, id) {
  const result = await indexSearchDocuments(env, [id]);
  return result.indexed.length ? { indexed: id } : { deleted: id };
}

export async function indexSearchDocuments(env, ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return { indexed: [], deleted: [] };
  const placeholders = unique.map(() => "?").join(",");
  const rows = await env.DB.prepare(`SELECT * FROM search_documents WHERE id IN (${placeholders})`).bind(...unique).all();
  const rowById = new Map(rows.results.map((row) => [row.id, row]));
  const deleted = unique.filter((id) => !rowById.has(id));
  if (deleted.length) await env.VECTORIZE?.deleteByIds(deleted);
  const ordered = unique.map((id) => rowById.get(id)).filter(Boolean);
  if (!ordered.length) return { indexed: [], deleted };
  if (env.SEMANTIC_SEARCH_ENABLED === "false") return { indexed: [], deleted, skipped: "semantic_disabled" };
  const result = await env.AI.run("@cf/baai/bge-m3", { text: ordered.map((row) => `${row.title}\n${row.body}`) });
  const embeddings = embeddingRows(result);
  if (embeddings.length !== ordered.length) throw new Error("embedding_count_mismatch");
  await env.VECTORIZE.upsert(ordered.map((row, index) => ({
    id: row.id,
    values: embeddings[index],
    namespace: row.access === "public" ? "public" : `private-${row.ip_slug || "shared"}`,
    metadata: { access: row.access, entity_type: row.entity_type, entity_id: row.entity_id, ip_slug: row.ip_slug, language: row.language, version: row.version },
  })));
  await env.DB.prepare(`UPDATE search_documents SET vector_status='ready' WHERE id IN (${placeholders})`).bind(...unique).run();
  return { indexed: ordered.map((row) => row.id), deleted };
}

async function lexical(env, query, limit) {
  const terms = chineseNgrams(query).split(/\s+/).filter(Boolean).slice(0, 20);
  if (!terms.length) return [];
  const expression = terms.map((term) => `"${term.replaceAll('"', '""')}"*`).join(" OR ");
  const rows = await env.DB.prepare(`SELECT d.*, bm25(search_fts, 8.0, 2.0, 1.0) AS lexical_score
    FROM search_fts JOIN search_documents d ON d.id=search_fts.document_id
    WHERE search_fts MATCH ? ORDER BY lexical_score LIMIT ?`).bind(expression, limit).all();
  return rows.results;
}

async function semantic(env, actor, query, limit) {
  if (!env.AI || !env.VECTORIZE || env.SEMANTIC_SEARCH_ENABLED === "false") return [];
  const result = await env.AI.run("@cf/baai/bge-m3", { text: [query] });
  const vector = embeddingRows(result)[0];
  const options = { topK: Math.min(limit, 50), returnMetadata: "all" };
  const canReadPrivate = hasScope(actor, "assets:read_private");
  const scopes = canReadPrivate && Array.isArray(actor?.ipScopes) ? actor.ipScopes : [];
  const queries = scopes.includes("*")
    ? [env.VECTORIZE.query(vector, options)]
    : [
        env.VECTORIZE.query(vector, { ...options, namespace: "public" }),
        ...scopes.map((slug) => env.VECTORIZE.query(vector, { ...options, namespace: `private-${slug}` })),
      ];
  const queryResults = await Promise.all(queries);
  const matchById = new Map();
  for (const queryResult of queryResults) {
    for (const match of queryResult.matches || []) {
      if (!matchById.has(match.id) || matchById.get(match.id).score < match.score) matchById.set(match.id, match);
    }
  }
  const matches = [...matchById.values()].sort((a, b) => b.score - a.score).slice(0, Math.min(limit, 50));
  if (!matches.length) return [];
  const placeholders = matches.map(() => "?").join(",");
  const rows = await env.DB.prepare(`SELECT * FROM search_documents WHERE id IN (${placeholders})`).bind(...matches.map((match) => match.id)).all();
  const byId = new Map(rows.results.map((row) => [row.id, row]));
  return matches.map((match) => ({ ...byId.get(match.id), semantic_score: match.score })).filter((row) => row.id);
}

function publicResult(row, score) {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    ipSlug: row.ip_slug,
    language: row.language,
    access: row.access,
    title: row.title,
    excerpt: row.body.slice(0, 360),
    score,
    version: row.version,
    metadata: parseJson(row.metadata_json || "{}"),
  };
}

export async function search(env, actor, { query, mode = "hybrid", limit = 20, types = [], ip = "", industry = "", ipType = "" }) {
  const capped = Math.min(Math.max(Number(limit || 20), 1), 50);
  const poolSize = Math.min(capped * 3, 50);
  const [lexicalRows, semanticRows] = await Promise.all([
    mode === "semantic" ? [] : lexical(env, query, poolSize),
    mode === "lexical" ? [] : semantic(env, actor, query, poolSize).catch(() => []),
  ]);
  const scores = new Map();
  const rows = new Map();
  const add = (items, weight) => items.forEach((row, index) => {
    const metadata = parseJson(row.metadata_json || "{}");
    if (!visible(row, actor) || (ip && row.ip_slug !== ip) || (types.length && !types.includes(row.entity_type))) return;
    if (industry && metadata.primaryIndustry !== industry && !metadata.industries?.includes?.(industry)) return;
    if (ipType && metadata.ipType !== ipType) return;
    rows.set(row.id, row);
    scores.set(row.id, (scores.get(row.id) || 0) + weight / (60 + index + 1));
  });
  add(lexicalRows, 1.2);
  add(semanticRows, 1.0);
  const normalized = query.normalize("NFKC").toLowerCase();
  for (const row of rows.values()) {
    if (row.title.normalize("NFKC").toLowerCase() === normalized) scores.set(row.id, (scores.get(row.id) || 0) + 1);
    scores.set(row.id, (scores.get(row.id) || 0) * Number(row.source_authority || 1));
  }
  return [...rows.values()].sort((a, b) => scores.get(b.id) - scores.get(a.id)).slice(0, capped).map((row) => publicResult(row, scores.get(row.id)));
}
