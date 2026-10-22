// API tests against an in-memory SQLite stand-in for D1. Run: npm test (Node 22.5+).
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import worker from '../src/worker.js';

const db = new DatabaseSync(':memory:');
db.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
const stmt = (sql) => ({ sql, args: [], bind(...a) { this.args = a; return this; },
  first() { const r = db.prepare(sql).get(...this.args); return Promise.resolve(r ?? null); },
  all() { return Promise.resolve({ results: db.prepare(sql).all(...this.args) }); },
  run() { const r = db.prepare(sql).run(...this.args); return Promise.resolve({ meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }); } });
const env = { APP_ENV: 'staging', TRIAL_DAYS: '14', ASSETS: { fetch: () => new Response('page') },
  DB: { prepare: stmt, batch: async (list) => { db.exec('BEGIN'); try { const out = []; for (const s of list) out.push(await s.run()); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; } } } };
const base = 'https://wed.example';
let ipCounter = 0;
async function call(path, { method = 'GET', body, sid, plan, origin = base, ip } = {}) {
  const headers = { 'content-type': 'application/json', origin, 'cf-connecting-ip': ip || '10.0.0.' + (++ipCounter % 250) };
  if (sid) headers.cookie = 'sid=' + sid;
  if (plan) headers['x-plan-id'] = String(plan);
  const r = await worker.fetch(new Request(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
  const c = r.headers.get('set-cookie'); const m = c && c.match(/sid=([^;]*)/);
  return { status: r.status, data: await r.json().catch(() => null), sid: m && m[1], headers: r.headers };
}
let failed = 0;
const ok = (c, msg) => { if (!c) { console.error('FAIL', msg); failed++; } else console.log('ok', msg); };
const signup = (email, display, password = 'password1') => call('/api/signup', { method: 'POST', body: { email, display, password, agree: true } });

// ---- accounts ----
ok((await call('/api/signup', { method: 'POST', body: { email: 'a@x.com', display: 'A', password: 'password1' } })).status === 400, 'sign-up requires agreeing to the privacy note');
ok((await signup('not-an-email', 'A')).status === 400, 'bad email rejected');
ok((await signup('a@x.com', 'A', 'short')).status === 400, 'short password rejected');
const nathan = (await signup('Nathan@Example.com', '나단')).sid;
ok(!!nathan, 'public sign-up works without an invite code');
let me = (await call('/api/me', { sid: nathan })).data;
ok(me.user.is_admin === true && me.user.email === 'nathan@example.com', 'first account on an empty site is admin; email lower-cased');
ok((await signup('nathan@example.com', 'dup')).status === 409, 'duplicate email rejected (case-insensitive)');
const duyeon = (await signup('duyeon@example.com', '두연')).sid;
const eve = (await signup('eve@example.com', 'Eve')).sid;
ok((await call('/api/me', { sid: eve })).data.user.is_admin === false, 'later accounts are not admin');
ok((await call('/api/login', { method: 'POST', body: { email: 'NATHAN@example.com', password: 'password1' } })).sid, 'login by email');
ok((await call('/api/login', { method: 'POST', body: { email: 'nathan@example.com', password: 'nope-nope' } })).status === 401, 'wrong password rejected');

// sign-up rate limit per IP
let last;
for (let i = 0; i < 6; i++) last = await call('/api/signup', { method: 'POST', ip: '9.9.9.9', body: { email: `spam${i}@x.com`, display: 's', password: 'password1', agree: true } });
ok(last.status === 429, 'sign-ups are rate-limited per IP');

// ---- plans ----
let r = await call('/api/plans', { method: 'POST', sid: nathan, body: { partner_a: '나단', partner_b: '두연' } });
const P1 = r.data.id;
ok(r.status === 200 && P1, 'create a plan');
me = (await call('/api/me', { sid: nathan })).data;
ok(me.plans.length === 1 && me.plans[0].name === '나단 & 두연' && me.plans[0].role === 'owner' && me.plans[0].access === 'trial', 'new plan: owner, trial, named from partners');
const P2 = (await call('/api/plans', { method: 'POST', sid: eve, body: { partner_a: 'Eve', partner_b: 'Mallory' } })).data.id;

ok((await call('/api/doc/guests', { method: 'PUT', sid: nathan, plan: P1, body: { value: [{ id: 'g1', name: '김' }], baseVersion: 0 } })).status === 200, 'owner writes to own plan');
ok((await call('/api/doc/guests', { method: 'PUT', sid: eve, plan: P2, body: { value: [{ id: 'e1', name: 'Eve guest' }], baseVersion: 0 } })).status === 200, 'another couple writes to their own plan');

// ---- isolation: Eve tries every way into plan 1 ----
ok((await call('/api/state', { sid: eve, plan: P1 })).status === 404, 'ISOLATION: cannot read another plan');
ok((await call('/api/doc/guests', { method: 'PUT', sid: eve, plan: P1, body: { value: [], baseVersion: 1 } })).status === 404, 'ISOLATION: cannot write another plan');
ok((await call('/api/changes?since=0', { sid: eve, plan: P1 })).status === 404, 'ISOLATION: cannot poll another plan');
ok((await call('/api/history', { sid: eve, plan: P1 })).status === 404, 'ISOLATION: cannot list another plan\'s history');
ok((await call('/api/export', { sid: eve, plan: P1 })).status === 404, 'ISOLATION: cannot export another plan');
ok((await call('/api/plan/members', { sid: eve, plan: P1 })).status === 404, 'ISOLATION: cannot see another plan\'s members');
ok((await call('/api/plan/invites', { method: 'POST', sid: eve, plan: P1, body: {} })).status === 404, 'ISOLATION: cannot invite into another plan');
const p1hist = (await call('/api/history', { sid: nathan, plan: P1 })).data.rows[0].id;
ok((await call('/api/history/' + p1hist, { sid: eve, plan: P2 })).status === 404, 'ISOLATION: cannot fetch another plan\'s history item via own plan');
ok((await call('/api/restore', { method: 'POST', sid: eve, plan: P2, body: { id: p1hist } })).status === 404, 'ISOLATION: cannot restore another plan\'s version into own plan');
const evePlanState = (await call('/api/state', { sid: eve, plan: P2 })).data;
ok(evePlanState.docs.guests.value[0].name === 'Eve guest' && Object.values(evePlanState.users).join() === 'Eve', 'ISOLATION: own state and member names only');
ok((await call('/api/state', { sid: nathan })).status === 400, 'data routes require choosing a plan');
ok((await call('/api/admin/plans', { sid: eve })).status === 404, 'non-admin cannot reach admin API');

// ---- invites & roles ----
r = await call('/api/plan/invites', { method: 'POST', sid: nathan, plan: P1, body: { role: 'editor' } });
ok(r.status === 200 && /^[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(r.data.code) && r.data.link.includes('/?join='), 'owner creates an invite code and link');
const code = r.data.code;
ok((await call('/api/plans/join', { method: 'POST', sid: duyeon, body: { code: 'WRONG-CODE1' } })).status === 400, 'wrong invite code rejected');
ok((await call('/api/plans/join', { method: 'POST', sid: duyeon, body: { code: code.toLowerCase() } })).status === 200, 'partner joins with the code (case/dash-insensitive)');
ok((await call('/api/plans/join', { method: 'POST', sid: eve, body: { code } })).status === 400, 'invite is single-use');
ok((await call('/api/state', { sid: duyeon, plan: P1 })).status === 200, 'joined partner can read the plan');
ok((await call('/api/doc/guests', { method: 'PUT', sid: duyeon, plan: P1, body: { value: [{ id: 'g1', name: '김철수' }], baseVersion: 1 } })).status === 200, 'editor can write');
ok((await call('/api/plan/invites', { method: 'POST', sid: duyeon, plan: P1, body: {} })).status === 403, 'editor cannot create invites');
ok((await call('/api/plan', { method: 'PATCH', sid: duyeon, plan: P1, body: { name: 'x' } })).status === 403, 'editor cannot rename the plan');

const vcode = (await call('/api/plan/invites', { method: 'POST', sid: nathan, plan: P1, body: { role: 'viewer' } })).data.code;
const mom = (await signup('mom@example.com', '엄마')).sid;
await call('/api/plans/join', { method: 'POST', sid: mom, body: { code: vcode } });
ok((await call('/api/state', { sid: mom, plan: P1 })).status === 200, 'viewer can read');
r = await call('/api/doc/guests', { method: 'PUT', sid: mom, plan: P1, body: { value: [], baseVersion: 2 } });
ok(r.status === 403 && r.data.error === 'read_only', 'viewer cannot write');

// ---- 스드메 sections and plan photos ----
ok((await call('/api/doc/sdmCatalog', { method: 'PUT', sid: nathan, plan: P1, body: { value: { studios: [{ id: 's1', ko: '테스트 스튜디오', lo: 100, hi: 120 }] }, baseVersion: 0, action: 'import' } })).status === 200, 'sdmCatalog section saves');
ok((await call('/api/doc/sdm', { method: 'PUT', sid: nathan, plan: P1, body: { value: { studio: 's1', short: ['s1'] }, baseVersion: 0 } })).status === 200, 'sdm picks section saves');
const putFile = (sid, plan, name, bytes, type = 'image/jpeg') => worker.fetch(new Request(base + '/api/plan/files/' + name, { method: 'PUT', headers: { cookie: 'sid=' + sid, origin: base, 'content-type': type, 'x-plan-id': String(plan) }, body: bytes }), env);
const getFile = (sid, plan, name) => worker.fetch(new Request(base + '/api/plan/files/' + name + '?plan=' + plan, { headers: { cookie: 'sid=' + sid } }), env);
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 250, 0, 0xff, 0xd9]);
ok((await putFile(nathan, P1, 'sdm-s1.jpg', jpg)).status === 200, 'editor uploads a plan photo');
let fr = await getFile(duyeon, P1, 'sdm-s1.jpg');
ok(fr.status === 200 && fr.headers.get('content-type') === 'image/jpeg' && Buffer.from(await fr.arrayBuffer()).equals(Buffer.from(jpg)), 'plan member downloads the same bytes');
ok((await getFile(mom, P1, 'sdm-s1.jpg')).status === 200, 'viewer can see plan photos');
ok((await putFile(mom, P1, 'sdm-x.jpg', jpg)).status === 403, 'viewer cannot upload photos');
ok((await getFile(eve, P1, 'sdm-s1.jpg')).status === 404, 'ISOLATION: cannot read another plan\'s photo');
ok((await getFile(eve, P2, 'sdm-s1.jpg')).status === 404, 'ISOLATION: photo names are per plan');
ok((await putFile(eve, P1, 'sdm-s1.jpg', jpg)).status === 404, 'ISOLATION: cannot overwrite another plan\'s photo');
ok((await worker.fetch(new Request(base + '/api/plan/files/sdm-s1.jpg?plan=' + P1), env)).status === 401, 'photos need sign-in');
ok((await putFile(nathan, P1, 'evil.html', new TextEncoder().encode('<script>'), 'text/html')).status === 415, 'only image types are accepted');
ok((await putFile(nathan, P1, '../x.jpg', jpg)).status !== 200, 'file names are restricted');
ok((await putFile(nathan, P1, 'big.jpg', new Uint8Array(800_000))).status === 413, 'oversized photos rejected');
ok((await worker.fetch(new Request(base + '/api/plan/files/sdm-s1.jpg', { method: 'DELETE', headers: { cookie: 'sid=' + nathan, origin: base, 'x-plan-id': String(P1) } }), env)).status === 200, 'editor deletes a photo');
ok((await getFile(nathan, P1, 'sdm-s1.jpg')).status === 404, 'deleted photo is gone');
await putFile(nathan, P1, 'sdm-s1.jpg', jpg);
const members = (await call('/api/plan/members', { sid: nathan, plan: P1 })).data.members;
ok(members.length === 3 && members.map((m) => m.role).join() === 'owner,editor,viewer', 'members list with roles');
const momId = members.find((m) => m.display === '엄마').id;
ok((await call('/api/plan/members', { method: 'POST', sid: duyeon, plan: P1, body: { user_id: momId, remove: true } })).status === 403, 'editor cannot remove others');
ok((await call('/api/plan/members', { method: 'POST', sid: nathan, plan: P1, body: { user_id: momId, remove: true } })).status === 200, 'owner removes a member');
ok((await call('/api/state', { sid: mom, plan: P1 })).status === 404, 'removed member loses access immediately');
const nathanId = members.find((m) => m.display === '나단').id;
ok((await call('/api/plan/members', { method: 'POST', sid: nathan, plan: P1, body: { user_id: nathanId, role: 'editor' } })).data.error === 'last_owner', 'cannot demote the last owner');

// ---- concurrency (unchanged behaviour, now per plan) ----
const ra = await call('/api/doc/guests', { method: 'PUT', sid: nathan, plan: P1, body: { value: [{ id: 'g1', name: '김' }, { id: 'g2', name: '이' }], baseVersion: 2 } });
const rb = await call('/api/doc/guests', { method: 'PUT', sid: duyeon, plan: P1, body: { value: [{ id: 'g1', name: '김철수' }], baseVersion: 2 } });
ok(ra.status === 200 && rb.status === 409 && rb.data.version === 3, 'stale write gets 409 with the current copy');
ok((await call('/api/doc/hack', { method: 'PUT', sid: nathan, plan: P1, body: { value: 1, baseVersion: 0 } })).status === 400, 'unknown section rejected');

// ---- access: trial, expiry, payment, AI ----
ok((await call('/api/ai/status', { sid: duyeon, plan: P1 })).data.allowed === false, 'AI is off for a trial plan');
ok((await call('/api/ai/status', { sid: nathan, plan: P1 })).data.allowed === true, 'admin always has AI');
db.prepare('UPDATE plans SET trial_ends = ? WHERE id = ?').run(Date.now() - 1000, P1);
r = await call('/api/doc/guests', { method: 'PUT', sid: duyeon, plan: P1, body: { value: [], baseVersion: 3 } });
ok(r.status === 403 && r.data.error === 'plan_expired', 'expired plan is read-only');
ok((await call('/api/export', { sid: duyeon, plan: P1 })).status === 200, 'expired plan can still export');
ok((await call('/api/admin/plans', { sid: nathan })).data.plans.find((p) => p.id === P1).access === 'expired', 'admin sees the plan as expired');
ok((await call(`/api/admin/plans/${P1}`, { method: 'PATCH', sid: nathan, body: { extendDays: 365, ai_enabled: true, admin_note: 'paid by transfer' } })).status === 200, 'admin records a payment and turns on AI');
me = (await call('/api/me', { sid: duyeon })).data;
ok(me.plans[0].access === 'active' && me.plans[0].writable && me.plans[0].ai, 'paid plan: active, writable, AI on');
ok((await call('/api/doc/guests', { method: 'PUT', sid: duyeon, plan: P1, body: { value: [], baseVersion: 3 } })).status === 200, 'writes work again after payment');
ok((await call(`/api/admin/plans/${P1}`, { method: 'PATCH', sid: eve, body: { extendDays: 9999 } })).status === 404, 'non-admin cannot extend a plan');

// ---- full backup (admin only) restores into an empty database ----
ok((await call('/api/admin/backup', { sid: eve })).status === 404, 'non-admin cannot download the full backup');
ok((await call('/api/admin/backup')).status === 401, 'signed-out visitors cannot download the full backup');
{
  const res = await worker.fetch(new Request(base + '/api/admin/backup', { headers: { cookie: 'sid=' + nathan, origin: base } }), env);
  const sql = await res.text();
  ok(res.status === 200 && /attachment; filename="nadu-wedding-staging-backup-\d{8}-\d{4}\.sql"/.test(res.headers.get('content-disposition') || ''), 'backup downloads as a dated .sql file');
  ok(!sql.includes(nathan) && !/INSERT OR REPLACE INTO "sessions"/.test(sql), 'backup leaves out sign-in sessions');
  const restored = new DatabaseSync(':memory:'); restored.exec(sql);
  const tables = ['users', 'plans', 'plan_members', 'plan_invites', 'plan_docs', 'plan_history', 'plan_files'];
  const same = tables.every((t) => JSON.stringify(db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()) === JSON.stringify(restored.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()));
  ok(same, 'backup restores every account, plan, section and history row exactly');
  const again = new DatabaseSync(':memory:'); again.exec(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8')); again.exec(sql); again.exec(sql);
  ok(again.prepare('SELECT COUNT(*) AS n FROM plan_history').get().n === db.prepare('SELECT COUNT(*) AS n FROM plan_history').get().n, 'backup can be loaded onto an existing schema, even twice');
}

// ---- password reset ----
r = await call('/api/forgot', { method: 'POST', body: { email: 'nobody@example.com' } });
ok(r.status === 200 && r.data.ok, 'forgot-password answers ok for unknown emails (no account fishing)');
const duyeonId = members.find((m) => m.display === '두연').id;
const link = (await call('/api/admin/reset-link', { method: 'POST', sid: nathan, body: { user_id: duyeonId } })).data.link;
ok(link && link.includes('/?reset='), 'admin can create a reset link when email is not set up');
const token = link.split('reset=')[1];
ok((await call('/api/reset', { method: 'POST', body: { token: 'bad', password: 'newpassword' } })).status === 400, 'bad reset token rejected');
r = await call('/api/reset', { method: 'POST', body: { token, password: 'newpassword' } });
ok(r.status === 200 && r.sid, 'reset sets a new password and signs in');
ok((await call('/api/me', { sid: duyeon })).status === 401, 'reset signs out old sessions');
ok((await call('/api/reset', { method: 'POST', body: { token, password: 'another1' } })).status === 400, 'reset link works only once');
ok((await call('/api/login', { method: 'POST', body: { email: 'duyeon@example.com', password: 'newpassword' } })).sid, 'login with the new password');

// ---- account deletion ----
const solo = (await signup('solo@example.com', 'Solo')).sid;
const P3 = (await call('/api/plans', { method: 'POST', sid: solo, body: { partner_a: 'S' } })).data.id;
await call('/api/doc/guests', { method: 'PUT', sid: solo, plan: P3, body: { value: [{ id: 's' }], baseVersion: 0 } });
ok((await call('/api/account', { method: 'DELETE', sid: solo, body: { password: 'wrong' } })).status === 403, 'account deletion needs the password');
ok((await call('/api/account', { method: 'DELETE', sid: solo, body: { password: 'password1' } })).status === 200, 'account deleted');
ok(!db.prepare('SELECT 1 FROM plans WHERE id = ?').get(P3) && !db.prepare('SELECT 1 FROM plan_docs WHERE plan_id = ?').get(P3), 'last member leaving deletes the plan and its data');
ok(!!db.prepare('SELECT 1 FROM plans WHERE id = ?').get(P1), 'other plans untouched');

// ---- misc ----
const bad = await worker.fetch(new Request(base + '/api/doc/guests', { method: 'PUT', headers: { origin: 'https://evil.example', cookie: 'sid=' + nathan, 'x-plan-id': String(P1), 'content-type': 'application/json' }, body: '{"value":[],"baseVersion":4}' }), env);
ok(bad.status === 403, 'cross-site write blocked');
const envR = await call('/api/env');
ok(envR.data.env === 'staging' && envR.data.trialDays === 14, 'environment info is public');
await call('/api/logout', { method: 'POST', sid: nathan });
ok((await call('/api/me', { sid: nathan })).status === 401, 'logout ends session');

if (failed) { console.error(`${failed} test(s) failed`); process.exit(1); }
console.log('all worker tests pass');
