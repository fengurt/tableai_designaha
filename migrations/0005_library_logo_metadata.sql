ALTER TABLE organizations ADD COLUMN logo_source TEXT NOT NULL DEFAULT 'monogram';
ALTER TABLE organizations ADD COLUMN logo_provider TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN logo_quality TEXT NOT NULL DEFAULT 'fallback';
ALTER TABLE organizations ADD COLUMN logo_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE organizations ADD COLUMN logo_provenance_url TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN fallback_logo_url TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN logo_checked_at TEXT;

CREATE INDEX IF NOT EXISTS organizations_logo_status_idx ON organizations(logo_status);
