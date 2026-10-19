import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import worker from '../src/worker.js';
const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
const stmt = (sql) => ({ sql, args: [], bind(...a) { this.args = a; return this; },
  first() { const r = db.prepare(sql).get(...this.args); return Promise.resolve(r ?? null); },
  all() { return Promise.resolve({ results: db.prepare(sql).all(...this.args) }); },
  run() { const r = db.prepare(sql).run(...this.args); return Promise.resolve({ meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }); } });
const env = { INVITE_CODE: 'secret-code', MAX_USERS: '4', ASSETS: { fetch: () => new Response('page') },
  DB: { prepare: stmt, batch: async (list) => { db.exec('BEGIN'); try { const out = []; for (const s of list) out.push(await s.run()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } } } };
const base = 'https://wed.example';
async function call(path, { method = 'GET', body, sid } = {}) {
  const r = await worker.fetch(new Request(base + path, { method, headers: { 'content-type': 'application/json', origin: base, ...(sid ? { cookie: 'sid=' + sid } : {}) }, body: body ? JSON.stringify(body) : undefined }), env);
  const c = r.headers.get('set-cookie'); const m = c && c.match(/sid=([^;]*)/);
  return { status: r.status, data: await r.json().catch(() => null), sid: m && m[1] };
}
const ok = (c, msg) => { if (!c) { console.error('FAIL', msg); process.exit(1); } console.log('ok', msg); };
let r = await call('/api/signup', { method: 'POST', body: { username: 'nathan', display: '나단', password: 'password1', invite: 'nope' } });
ok(r.status === 403, 'bad invite rejected');
const a = (await call('/api/signup', { method: 'POST', body: { username: 'nathan', display: '나단', password: 'password1', invite: 'secret-code' } })).sid;
const b = (await call('/api/signup', { method: 'POST', body: { username: 'duyeon', display: '두연', password: 'password2', invite: 'secret-code' } })).sid;
ok(a && b, 'two accounts created');
ok((await call('/api/login', { method: 'POST', body: { username: 'Nathan', password: 'wrong-pass' } })).status === 401, 'wrong password rejected');
ok((await call('/api/login', { method: 'POST', body: { username: 'nathan', password: 'password1' } })).sid, 'login works');
ok((await call('/api/state')).status === 401, 'state needs login');
r = await call('/api/doc/guests', { method: 'PUT', sid: a, body: { value: [{ id: 'g1', name: '김' }], baseVersion: 0 } });
ok(r.status === 200 && r.data.version === 1, 'first write v1');
const ra = await call('/api/doc/guests', { method: 'PUT', sid: a, body: { value: [{ id: 'g1', name: '김' }, { id: 'g2', name: '이' }], baseVersion: 1 } });
const rb = await call('/api/doc/guests', { method: 'PUT', sid: b, body: { value: [{ id: 'g1', name: '김철수' }], baseVersion: 1 } });
ok(ra.status === 200 && rb.status === 409 && rb.data.version === 2, 'stale write gets 409 with current copy');
ok((await call('/api/doc/guests', { method: 'PUT', sid: b, body: { value: [{ id: 'g1', name: '김' }], baseVersion: 0 } })).status === 409, 'second first-write conflicts');
r = await call('/api/history', { sid: b });
ok(r.data.rows.length === 2 && r.data.rows[0].user_id === 1, 'history has only the two landed writes');
const chg = await call('/api/changes?since=1', { sid: b });
ok(chg.data.docs.length === 1 && chg.data.docs[0].version === 2, 'changes feed returns newer doc');
r = await call('/api/restore', { method: 'POST', sid: b, body: { id: 1 } });
ok(r.status === 200 && r.data.version === 3, 'restore makes v3');
r = await call('/api/state', { sid: a });
ok(r.data.docs.guests.value.length === 1 && r.data.docs.guests.updated_by === 2, 'restored value visible to other user');
r = await call('/api/history', { sid: a });
ok(r.data.rows[0].action === 'restore', 'restore recorded in history');
ok((await call('/api/doc/hack', { method: 'PUT', sid: a, body: { value: 1, baseVersion: 0 } })).status === 400, 'unknown section rejected');
const ex = await worker.fetch(new Request(base + '/api/export', { headers: { cookie: 'sid=' + a } }), env);
ok(ex.headers.get('content-disposition').includes('attachment'), 'export downloads');
const bad = await worker.fetch(new Request(base + '/api/doc/guests', { method: 'PUT', headers: { origin: 'https://evil.example', cookie: 'sid=' + a, 'content-type': 'application/json' }, body: '{"value":[],"baseVersion":3}' }), env);
ok(bad.status === 403, 'cross-site write blocked');
await call('/api/logout', { method: 'POST', sid: a });
ok((await call('/api/me', { sid: a })).status === 401, 'logout ends session');
console.log('all worker tests pass');
