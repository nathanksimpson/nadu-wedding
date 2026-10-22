-- Per-plan files (photos for the 스드메 catalog). Additive; safe to run more than once.
-- Stored as base64 text so backups and exports stay plain SQL/JSON.
CREATE TABLE IF NOT EXISTS plan_files (
  plan_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data TEXT NOT NULL,
  updated_by INTEGER,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (plan_id, name)
);
