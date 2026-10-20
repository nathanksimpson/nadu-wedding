-- Upgrade an existing single-plan database (the original 나단 & 두연 app) to multi-couple.
-- Run ONCE. Purely additive: the old `docs` and `history` tables are left in place untouched
-- so the previous version of the app keeps working and nothing can be lost.

ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users(email COLLATE NOCASE) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, partner_a TEXT NOT NULL DEFAULT '', partner_b TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'trial', trial_ends INTEGER, paid_until INTEGER, ai_enabled INTEGER NOT NULL DEFAULT 0,
  admin_note TEXT NOT NULL DEFAULT '', created_by INTEGER, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS plan_members (
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, joined_at TEXT NOT NULL, PRIMARY KEY (plan_id, user_id));
CREATE INDEX IF NOT EXISTS plan_members_user ON plan_members(user_id);
CREATE TABLE IF NOT EXISTS plan_invites (
  code_hash TEXT PRIMARY KEY, plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE, role TEXT NOT NULL,
  created_by INTEGER, expires_at INTEGER NOT NULL, uses_left INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS plan_invites_plan ON plan_invites(plan_id);
CREATE TABLE IF NOT EXISTS plan_docs (
  plan_id INTEGER NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, version INTEGER NOT NULL, updated_by INTEGER,
  updated_at TEXT NOT NULL, wid TEXT NOT NULL, PRIMARY KEY (plan_id, key));
CREATE TABLE IF NOT EXISTS plan_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT, plan_id INTEGER NOT NULL, key TEXT NOT NULL, version INTEGER NOT NULL,
  value TEXT NOT NULL, user_id INTEGER, at TEXT NOT NULL, action TEXT NOT NULL DEFAULT 'edit');
CREATE INDEX IF NOT EXISTS plan_history_plan ON plan_history(plan_id, id);
CREATE INDEX IF NOT EXISTS plan_history_key ON plan_history(plan_id, key, id);
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS rate_events (bucket TEXT NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS rate_events_bucket ON rate_events(bucket, at);

-- The existing shared plan becomes plan #1 (complimentary: active with no end date), only if there is data or users.
INSERT INTO plans (id, name, partner_a, partner_b, status, trial_ends, paid_until, ai_enabled, admin_note, created_by, created_at)
SELECT 1, '나단 & 두연', '나단', '두연', 'active', NULL, NULL, 0, 'Original plan (migrated)', (SELECT MIN(id) FROM users), strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE id = 1)
  AND (EXISTS (SELECT 1 FROM users) OR EXISTS (SELECT 1 FROM docs));

-- Existing accounts join plan #1: the first account is its owner and the site admin, the rest are editors.
INSERT OR IGNORE INTO plan_members (plan_id, user_id, role, joined_at)
SELECT 1, id, CASE WHEN id = (SELECT MIN(id) FROM users) THEN 'owner' ELSE 'editor' END, created_at FROM users
WHERE EXISTS (SELECT 1 FROM plans WHERE id = 1);
UPDATE users SET is_admin = 1 WHERE id = (SELECT MIN(id) FROM users);

-- Copy the plan's sections and full history (same ids, same versions).
INSERT OR IGNORE INTO plan_docs (plan_id, key, value, version, updated_by, updated_at, wid)
SELECT 1, key, value, version, updated_by, updated_at, wid FROM docs WHERE EXISTS (SELECT 1 FROM plans WHERE id = 1);
INSERT OR IGNORE INTO plan_history (id, plan_id, key, version, value, user_id, at, action)
SELECT id, 1, key, version, value, user_id, at, action FROM history WHERE EXISTS (SELECT 1 FROM plans WHERE id = 1);
