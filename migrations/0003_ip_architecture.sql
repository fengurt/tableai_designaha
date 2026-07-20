PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS taxonomy_terms (
  id TEXT PRIMARY KEY,
  dimension TEXT NOT NULL CHECK (dimension IN ('industry', 'ip_type', 'application_type')),
  parent_id TEXT REFERENCES taxonomy_terms(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  labels_json TEXT NOT NULL,
  description_json TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(dimension, slug)
);

CREATE INDEX IF NOT EXISTS taxonomy_dimension_idx ON taxonomy_terms(dimension, active, sort_order);

CREATE TABLE IF NOT EXISTS ip_records (
  slug TEXT PRIMARY KEY,
  record_class TEXT NOT NULL CHECK (record_class IN ('owned', 'reference')),
  ip_type TEXT NOT NULL,
  primary_industry TEXT NOT NULL,
  names_json TEXT NOT NULL,
  main_language TEXT NOT NULL DEFAULT 'zh',
  lifecycle_status TEXT NOT NULL DEFAULT 'active',
  guideline_mode TEXT NOT NULL DEFAULT 'independent' CHECK (guideline_mode IN ('independent', 'inherit', 'extend')),
  source_url TEXT NOT NULL DEFAULT '',
  source_publisher TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'internal',
  payload_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ip_records_type_idx ON ip_records(ip_type, record_class, lifecycle_status);
CREATE INDEX IF NOT EXISTS ip_records_industry_idx ON ip_records(primary_industry, lifecycle_status);

CREATE TABLE IF NOT EXISTS ip_taxonomy (
  ip_slug TEXT NOT NULL REFERENCES ip_records(slug) ON DELETE CASCADE,
  term_id TEXT NOT NULL REFERENCES taxonomy_terms(id) ON DELETE RESTRICT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (ip_slug, term_id)
);

CREATE INDEX IF NOT EXISTS ip_taxonomy_term_idx ON ip_taxonomy(term_id, is_primary, ip_slug);

CREATE TABLE IF NOT EXISTS ip_relationships (
  id TEXT PRIMARY KEY,
  parent_ip_slug TEXT NOT NULL REFERENCES ip_records(slug) ON DELETE CASCADE,
  child_ip_slug TEXT NOT NULL REFERENCES ip_records(slug) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('brand_parent', 'endorsed_by', 'operated_by', 'licensed_by', 'member_of', 'co_branded_with')),
  is_primary INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (parent_ip_slug <> child_ip_slug),
  UNIQUE(parent_ip_slug, child_ip_slug, relation_type)
);

CREATE UNIQUE INDEX IF NOT EXISTS ip_relationship_primary_parent_idx
  ON ip_relationships(child_ip_slug)
  WHERE relation_type='brand_parent' AND is_primary=1;
CREATE INDEX IF NOT EXISTS ip_relationship_parent_idx ON ip_relationships(parent_ip_slug, relation_type);
CREATE INDEX IF NOT EXISTS ip_relationship_child_idx ON ip_relationships(child_ip_slug, relation_type);

CREATE TABLE IF NOT EXISTS ip_applications (
  slug TEXT PRIMARY KEY,
  application_type TEXT NOT NULL,
  names_json TEXT NOT NULL,
  main_language TEXT NOT NULL DEFAULT 'zh',
  lifecycle_status TEXT NOT NULL DEFAULT 'active',
  guideline_mode TEXT NOT NULL DEFAULT 'inherit' CHECK (guideline_mode IN ('inherit', 'extend', 'independent')),
  description_json TEXT NOT NULL DEFAULT '{}',
  business_json TEXT NOT NULL DEFAULT '{}',
  location_json TEXT NOT NULL DEFAULT '{}',
  overrides_json TEXT NOT NULL DEFAULT '{}',
  official_website TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ip_applications_type_idx ON ip_applications(application_type, lifecycle_status);

CREATE TABLE IF NOT EXISTS application_ip_links (
  application_slug TEXT NOT NULL REFERENCES ip_applications(slug) ON DELETE CASCADE,
  ip_slug TEXT NOT NULL REFERENCES ip_records(slug) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('primary', 'endorsed', 'operated', 'licensed', 'partner')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (application_slug, ip_slug, role)
);

CREATE UNIQUE INDEX IF NOT EXISTS application_primary_ip_idx
  ON application_ip_links(application_slug)
  WHERE role='primary';
CREATE INDEX IF NOT EXISTS application_ip_idx ON application_ip_links(ip_slug, role, application_slug);

CREATE TABLE IF NOT EXISTS system_snapshots (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

ALTER TABLE sessions ADD COLUMN step_up_until TEXT;
ALTER TABLE api_keys ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

DELETE FROM search_fts WHERE document_id IN (SELECT id FROM search_documents WHERE entity_type='brand');
DELETE FROM search_documents WHERE entity_type='brand';
