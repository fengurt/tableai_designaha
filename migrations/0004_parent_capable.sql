PRAGMA foreign_keys = ON;

ALTER TABLE ip_records ADD COLUMN parent_capable INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS ip_records_parent_capable_idx
  ON ip_records(parent_capable, lifecycle_status, record_class);

UPDATE ip_records
SET parent_capable = 1
WHERE slug IN (
  SELECT DISTINCT parent_ip_slug
  FROM ip_relationships
  WHERE relation_type = 'brand_parent'
);

