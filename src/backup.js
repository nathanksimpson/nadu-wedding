// Full database backup as a SQL file that loads straight back into D1:
//   npx wrangler d1 execute <database> --remote --file <backup>.sql
// Tables are recreated if missing (CREATE TABLE IF NOT EXISTS) and every row is written with
// INSERT OR REPLACE, so the file restores into an empty database or on top of the same schema.
// Short-lived security data (sessions, login attempts, reset links, rate counters) is left out:
// after a restore everyone simply signs in again with their existing password.
// Tables are written in creation order so parent rows (users, plans) load before rows that reference them.

const SKIP = new Set(['sessions', 'login_attempts', 'password_resets', 'rate_events', 'sqlite_sequence', 'd1_migrations']);
const skipTable = (name) => SKIP.has(name) || name.startsWith('_cf_') || name.startsWith('sqlite_');
const ident = (s) => '"' + String(s).replace(/"/g, '""') + '"';

function literal(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' || typeof v === 'bigint') return Number.isFinite(Number(v)) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) {
    const bytes = new Uint8Array(v.buffer ? v.buffer : v);
    return "X'" + [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('') + "'";
  }
  return "'" + String(v).replace(/'/g, "''") + "'";
}

export async function buildSqlBackup(db, { appName = 'nadu-wedding', env = 'production' } = {}) {
  const { results: objects } = await db.prepare(
    "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL AND type IN ('table', 'index') ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, rowid"
  ).all();
  const tables = objects.filter((o) => o.type === 'table' && !skipTable(o.name));
  const indexes = objects.filter((o) => o.type === 'index' && !skipTable(o.tbl_name) && !o.name.startsWith('sqlite_'));
  const counts = {};
  const out = [
    `-- ${appName} full backup (${env}) taken ${new Date().toISOString()}`,
    '-- Restore: npx wrangler d1 execute <database-name> --remote --file <this-file>.sql',
    '-- Excludes sign-in sessions and other short-lived security data; passwords are kept as hashes.',
    'PRAGMA defer_foreign_keys = true;',
    ''
  ];
  for (const t of tables) {
    out.push(t.sql.replace(/^CREATE TABLE\s+(?!IF NOT EXISTS)/i, 'CREATE TABLE IF NOT EXISTS ') + ';');
  }
  for (const i of indexes) {
    out.push(i.sql.replace(/^CREATE (UNIQUE )?INDEX\s+(?!IF NOT EXISTS)/i, 'CREATE $1INDEX IF NOT EXISTS ') + ';');
  }
  out.push('');
  for (const t of tables) {
    const { results: rows } = await db.prepare(`SELECT * FROM ${ident(t.name)}`).all();
    counts[t.name] = rows.length;
    if (!rows.length) continue;
    const cols = Object.keys(rows[0]);
    const head = `INSERT OR REPLACE INTO ${ident(t.name)} (${cols.map(ident).join(', ')}) VALUES `;
    for (const r of rows) out.push(head + '(' + cols.map((c) => literal(r[c])).join(', ') + ');');
  }
  out.push('', `-- rows: ${JSON.stringify(counts)}`, '');
  return { sql: out.join('\n'), counts };
}

export function backupResponse(sql, env = 'production') {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13).replace('T', '-');
  const name = `nadu-wedding-${env}-backup-${stamp}.sql`;
  return new Response(sql, {
    headers: {
      'content-type': 'application/sql; charset=utf-8',
      'content-disposition': `attachment; filename="${name}"`,
      'cache-control': 'no-store'
    }
  });
}
