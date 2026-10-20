-- Original single-plan schema (first release). Kept for reference and for the migration test.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display TEXT NOT NULL,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- One row per plan section (budget, venues, expenses, guests...). version guards concurrent writes.
CREATE TABLE IF NOT EXISTS docs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  version INTEGER NOT NULL,
  updated_by INTEGER,
  updated_at TEXT NOT NULL,
  wid TEXT NOT NULL
);

-- Every saved version of every section: who, when, what.
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  version INTEGER NOT NULL,
  value TEXT NOT NULL,
  user_id INTEGER,
  at TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'edit'
);
CREATE INDEX IF NOT EXISTS history_key ON history(key, id);

CREATE TABLE IF NOT EXISTS login_attempts (
  username TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempts_user ON login_attempts(username, at);
