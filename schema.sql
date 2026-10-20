-- Nadu Wedding Planner — full schema for a NEW database.
-- Existing databases are upgraded with migrations/0002_plans.sql instead.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,   -- the email for new accounts; legacy usernames kept
  display TEXT NOT NULL,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  created_at TEXT NOT NULL,
  email TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users(email COLLATE NOCASE) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- One plan per couple. Access: trial until trial_ends, active while paid_until is in the future
-- (or status 'active' with no end date = complimentary), otherwise expired (read-only).
CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  partner_a TEXT NOT NULL DEFAULT '',
  partner_b TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'trial',
  trial_ends INTEGER,
  paid_until INTEGER,
  ai_enabled INTEGER NOT NULL DEFAULT 0,
  admin_note TEXT NOT NULL DEFAULT '',
  created_by INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_members (
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,              -- owner | editor | viewer
  joined_at TEXT NOT NULL,
  PRIMARY KEY (plan_id, user_id)
);
CREATE INDEX IF NOT EXISTS plan_members_user ON plan_members(user_id);

-- Invite codes are stored hashed; the plain code is shown once to the person who made it.
CREATE TABLE IF NOT EXISTS plan_invites (
  code_hash TEXT PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_by INTEGER,
  expires_at INTEGER NOT NULL,
  uses_left INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS plan_invites_plan ON plan_invites(plan_id);

-- Each plan's sections, versioned for safe two-person editing.
CREATE TABLE IF NOT EXISTS plan_docs (
  plan_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  version INTEGER NOT NULL,
  updated_by INTEGER,
  updated_at TEXT NOT NULL,
  wid TEXT NOT NULL,
  PRIMARY KEY (plan_id, key)
);

CREATE TABLE IF NOT EXISTS plan_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  version INTEGER NOT NULL,
  value TEXT NOT NULL,
  user_id INTEGER,
  at TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'edit'
);
CREATE INDEX IF NOT EXISTS plan_history_plan ON plan_history(plan_id, id);
CREATE INDEX IF NOT EXISTS plan_history_key ON plan_history(plan_id, key, id);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  username TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempts_user ON login_attempts(username, at);

-- Generic rate limiting (sign-ups and reset emails per IP / per address).
CREATE TABLE IF NOT EXISTS rate_events (
  bucket TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_events_bucket ON rate_events(bucket, at);
