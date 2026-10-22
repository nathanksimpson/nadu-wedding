-- Privacy & security hardening (docs/privacy-security-plan.md). Additive; run once per database.
-- Paid export/import add-on, expired-plan retention, two-step login, admin idle timeout, audit log.

ALTER TABLE plans ADD COLUMN io_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plans ADD COLUMN warned_at INTEGER;            -- retention warning email sent (ms)
ALTER TABLE users ADD COLUMN totp_secret TEXT;             -- encrypted when DATA_KEY is set
ALTER TABLE users ADD COLUMN totp_pending TEXT;            -- during setup, before the first code is confirmed
ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN mfa INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN last_seen INTEGER;

-- 접속기록: who did what, when, from where. Rows are HMAC-signed; ids never repeat.
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  user_id INTEGER,
  ip TEXT,
  plan_id INTEGER,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  keep_until INTEGER NOT NULL,
  mac TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_log_at ON audit_log(at);
CREATE INDEX IF NOT EXISTS audit_log_user ON audit_log(user_id, at);

-- Plans that were expired by hand without an end date get one now, so retention can count from it.
UPDATE plans SET paid_until = CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE status = 'expired' AND paid_until IS NULL AND trial_ends IS NULL;
