PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS library_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  publisher TEXT NOT NULL,
  type TEXT NOT NULL,
  year INTEGER,
  source_date TEXT,
  source_url TEXT NOT NULL,
  authority TEXT NOT NULL,
  refresh TEXT,
  fetched_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL DEFAULT '',
  main_language TEXT NOT NULL DEFAULT 'en',
  description TEXT NOT NULL DEFAULT '',
  official_website TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  logo_source_url TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  headquarters TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  ticker TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'source-verified',
  source_url TEXT NOT NULL,
  source_publisher TEXT NOT NULL,
  source_date TEXT,
  fetched_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS organizations_name_idx ON organizations(name);
CREATE INDEX IF NOT EXISTS organizations_native_name_idx ON organizations(native_name);
CREATE INDEX IF NOT EXISTS organizations_country_idx ON organizations(country);
CREATE INDEX IF NOT EXISTS organizations_industry_idx ON organizations(industry);

CREATE TABLE IF NOT EXISTS organization_collections (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES library_sources(id) ON DELETE CASCADE,
  rank INTEGER,
  year INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (organization_id, source_id)
);

CREATE INDEX IF NOT EXISTS organization_collections_source_rank_idx
  ON organization_collections(source_id, rank);

CREATE TABLE IF NOT EXISTS library_items (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('case', 'report', 'dataset')),
  title_zh TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  summary_zh TEXT NOT NULL DEFAULT '',
  summary_en TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  source_publisher TEXT NOT NULL DEFAULT '',
  published_at TEXT,
  access TEXT NOT NULL DEFAULT 'metadata' CHECK (access IN ('public', 'metadata', 'private')),
  file_key TEXT NOT NULL DEFAULT '',
  external_url TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'draft',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS library_items_type_idx ON library_items(type);
CREATE INDEX IF NOT EXISTS library_items_access_idx ON library_items(access);

CREATE TABLE IF NOT EXISTS library_relations (
  id TEXT PRIMARY KEY,
  from_type TEXT NOT NULL CHECK (from_type IN ('owned-ip', 'organization', 'case', 'report', 'dataset')),
  from_id TEXT NOT NULL,
  to_type TEXT NOT NULL CHECK (to_type IN ('owned-ip', 'organization', 'case', 'report', 'dataset')),
  to_id TEXT NOT NULL,
  relation TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE(from_type, from_id, to_type, to_id, relation)
);

CREATE INDEX IF NOT EXISTS library_relations_from_idx ON library_relations(from_type, from_id);
CREATE INDEX IF NOT EXISTS library_relations_to_idx ON library_relations(to_type, to_id);

CREATE TABLE IF NOT EXISTS library_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'sync',
  source_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS library_revisions_entity_idx ON library_revisions(entity_type, entity_id, created_at);
