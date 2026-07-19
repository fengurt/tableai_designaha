PRAGMA foreign_keys = ON;

ALTER TABLE library_items ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE library_relations ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS brand_records (
  slug TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  git_commit TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL DEFAULT 'owned-ip',
  owner_id TEXT NOT NULL,
  role TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  access TEXT NOT NULL CHECK (access IN ('public', 'private')),
  source_object_key TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  extension TEXT NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  status TEXT NOT NULL DEFAULT 'ready',
  version INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS assets_owner_idx ON assets(owner_type, owner_id, access, status);
CREATE INDEX IF NOT EXISTS assets_sha_idx ON assets(sha256);

CREATE TABLE IF NOT EXISTS asset_variants (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  format TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE(asset_id, kind, format)
);

CREATE INDEX IF NOT EXISTS asset_variants_asset_idx ON asset_variants(asset_id);

CREATE TABLE IF NOT EXISTS asset_aliases (
  path TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES asset_variants(id) ON DELETE SET NULL,
  redirect_status INTEGER NOT NULL DEFAULT 308,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS asset_jobs (
  id TEXT PRIMARY KEY,
  asset_id TEXT REFERENCES assets(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS asset_jobs_status_idx ON asset_jobs(status, created_at);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  prefix TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'service',
  label TEXT NOT NULL,
  scopes_json TEXT NOT NULL DEFAULT '[]',
  ip_scopes_json TEXT NOT NULL DEFAULT '[]',
  expires_at TEXT,
  revoked_at TEXT,
  last_used_at TEXT,
  created_by TEXT NOT NULL DEFAULT 'bootstrap',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS api_keys_prefix_idx ON api_keys(prefix, revoked_at, expires_at);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_hash TEXT NOT NULL,
  scopes_json TEXT NOT NULL,
  ip_scopes_json TEXT NOT NULL,
  totp_verified_at TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token_hash, revoked_at, expires_at);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL DEFAULT '',
  request_id TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL,
  before_json TEXT NOT NULL DEFAULT '{}',
  after_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_events_resource_idx ON audit_events(resource_type, resource_id, created_at);
CREATE INDEX IF NOT EXISTS audit_events_actor_idx ON audit_events(actor_id, created_at);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  api_key_id TEXT NOT NULL,
  key TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  body_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY(api_key_id, key)
);

CREATE INDEX IF NOT EXISTS idempotency_expiry_idx ON idempotency_keys(expires_at);

CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  aggregate_version INTEGER NOT NULL DEFAULT 1,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox(status, next_attempt_at, created_at);

CREATE TABLE IF NOT EXISTS search_documents (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  ip_slug TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'und',
  access TEXT NOT NULL DEFAULT 'public' CHECK (access IN ('public', 'private')),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  search_tokens TEXT NOT NULL DEFAULT '',
  source_authority REAL NOT NULL DEFAULT 1.0,
  content_hash TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  vector_status TEXT NOT NULL DEFAULT 'pending',
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS search_documents_entity_idx ON search_documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS search_documents_access_idx ON search_documents(access, ip_slug);

CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
  document_id UNINDEXED,
  title,
  body,
  search_tokens,
  tokenize = 'unicode61 remove_diacritics 2'
);
