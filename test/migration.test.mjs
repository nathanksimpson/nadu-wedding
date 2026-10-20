// Upgrading a database from the first release keeps every plan section, version and history row.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import worker from '../src/worker.js';

const read = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
const db = new DatabaseSync(':memory:');
db.exec(read('../migrations/0001_initial.sql'));
db.prepare("INSERT INTO users (username, display, pw_hash, pw_salt, created_at) VALUES ('nathan', '나단', 'x', '00', '2026-10-19')").run();
db.prepare("INSERT INTO docs VALUES ('budget', '{\"cash\":1}', 3, 1, '2026-10-19T10:00:00Z', 'w1')").run();
db.prepare("INSERT INTO history (key, version, value, user_id, at, action) VALUES ('budget', 3, '{\"cash\":1}', 1, '2026-10-19T10:00:00Z', 'edit')").run();
db.exec(read('../migrations/0002_plans.sql'));

const stmt = (sql) => ({ args: [], bind(...a) { this.args = a; return this; },
  first() { return Promise.resolve(db.prepare(sql).get(...this.args) ?? null); },
  all() { return Promise.resolve({ results: db.prepare(sql).all(...this.args) }); },
  run() { const r = db.prepare(sql).run(...this.args); return Promise.resolve({ meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }); } });
const env = { ASSETS: { fetch: () => new Response('') }, DB: { prepare: stmt, batch: async (l) => { const o = []; for (const s of l) o.push(await s.run()); return o; } } };
db.prepare("INSERT INTO sessions VALUES ('t', 1, ?)").run(Date.now() + 1e7);
const get = async (p) => (await worker.fetch(new Request('https://x' + p, { headers: { cookie: 'sid=t', 'x-plan-id': '1' } }), env)).json();

let failed = 0; const ok = (c, m) => { console.log(c ? 'ok' : 'FAIL', m); if (!c) failed++; };
const me = await get('/api/me');
ok(me.user.is_admin && me.plans.length === 1 && me.plans[0].role === 'owner' && me.plans[0].access === 'active', 'existing owner becomes admin and owner of plan 1 (active, complimentary)');
const st = await get('/api/state');
ok(st.docs.budget.value.cash === 1 && st.docs.budget.version === 3 && st.seq === 1, 'sections, versions and history carried over');
ok(db.prepare('SELECT COUNT(*) AS n FROM docs').get().n === 1, 'old tables left untouched');
const fresh = new DatabaseSync(':memory:'); fresh.exec(read('../migrations/0001_initial.sql')); fresh.exec(read('../migrations/0002_plans.sql'));
ok(fresh.prepare('SELECT COUNT(*) AS n FROM plans').get().n === 0, 'empty database: no placeholder plan created');
if (failed) process.exit(1);
console.log('migration tests pass');
