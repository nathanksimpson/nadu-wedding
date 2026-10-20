// 나단 & 두연 웨딩 — API for the shared wedding plan.
// Static page comes from ./public via the ASSETS binding; everything under /api/* lands here.

const SHARED_KEYS = new Set([
  'budget', 'selectedVenue', 'selectedLoan', 'venues', 'nonVenue', 'afterCosts', 'honsu', 'categories', 'loans', 'seeded',
  'wedding', 'checks', 'tasks', 'expenses', 'split', 'guests', 'guestRate', 'giftLog', 'vendors'
]);
const SESSION_DAYS = 30;
const MAX_DOC_BYTES = 400_000;
const HISTORY_KEEP_PER_KEY = 300;
const PBKDF2_ITER = 100_000; // Workers' WebCrypto caps PBKDF2 at 100k iterations

const enc = new TextEncoder();
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const err = (status, error, extra = {}) => json({ error, ...extra }, status);
const nowIso = () => new Date().toISOString();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const randHex = (bytes) => hex(crypto.getRandomValues(new Uint8Array(bytes)));

async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITER }, key, 256);
  return hex(bits);
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function cookie(req, name) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}
const sessionCookie = (token, maxAge) => `sid=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

async function currentUser(req, env) {
  const token = cookie(req, 'sid');
  if (!token) return null;
  return env.DB.prepare(
    'SELECT u.id, u.username, u.display FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?'
  ).bind(token, Date.now()).first();
}
async function newSession(env, userId) {
  const token = randHex(32);
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, userId, Date.now() + SESSION_DAYS * 864e5).run();
  return token;
}
async function usersMap(env) {
  const { results } = await env.DB.prepare('SELECT id, display FROM users').all();
  const m = {}; results.forEach((u) => { m[u.id] = u.display; }); return m;
}
async function readBody(req) { try { return await req.json(); } catch { return null; } }

// ---------- auth ----------
async function signup(req, env) {
  const b = await readBody(req);
  if (!b) return err(400, 'bad_request');
  const username = String(b.username || '').trim(), display = String(b.display || '').trim() || username, password = String(b.password || '');
  if (!env.INVITE_CODE) return err(503, 'invite_not_configured');
  if (!safeEqual(String(b.invite || ''), env.INVITE_CODE)) return err(403, 'bad_invite');
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) return err(400, 'bad_username');
  if (password.length < 8) return err(400, 'weak_password');
  const max = Number(env.MAX_USERS || 4);
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first();
  if (n >= max) return err(403, 'user_limit');
  const salt = randHex(16), pw = await hashPassword(password, salt);
  try {
    const r = await env.DB.prepare('INSERT INTO users (username, display, pw_hash, pw_salt, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(username, display.slice(0, 40), pw, salt, nowIso()).run();
    const token = await newSession(env, r.meta.last_row_id);
    return json({ ok: true }, 200, { 'set-cookie': sessionCookie(token, SESSION_DAYS * 86400) });
  } catch (e) {
    return err(409, 'username_taken');
  }
}
async function login(req, env) {
  const b = await readBody(req);
  if (!b) return err(400, 'bad_request');
  const username = String(b.username || '').trim().toLowerCase(), password = String(b.password || '');
  const since = Date.now() - 15 * 60_000;
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE username = ? AND at > ?').bind(username, since).first();
  if (n >= 10) return err(429, 'too_many_attempts');
  const u = await env.DB.prepare('SELECT id, pw_hash, pw_salt FROM users WHERE username = ?').bind(username).first();
  const ok = u && safeEqual(await hashPassword(password, u.pw_salt), u.pw_hash);
  if (!ok) {
    await env.DB.prepare('INSERT INTO login_attempts (username, at) VALUES (?, ?)').bind(username, Date.now()).run();
    return err(401, 'bad_login');
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE username = ? OR at < ?').bind(username, since).run();
  const token = await newSession(env, u.id);
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(token, SESSION_DAYS * 86400) });
}
async function logout(req, env) {
  const token = cookie(req, 'sid');
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
}

// ---------- plan documents ----------
async function seqNow(env) {
  const r = await env.DB.prepare('SELECT COALESCE(MAX(id), 0) AS seq FROM history').first();
  return r.seq;
}
async function getState(env) {
  const { results } = await env.DB.prepare('SELECT key, value, version, updated_by, updated_at FROM docs').all();
  const docs = {};
  results.forEach((d) => { docs[d.key] = { value: JSON.parse(d.value), version: d.version, updated_by: d.updated_by, updated_at: d.updated_at }; });
  return { docs, seq: await seqNow(env), users: await usersMap(env) };
}

// Optimistic concurrency: a write only lands if the caller saw the latest version.
// The doc update and its history row commit together in one D1 batch (a single transaction);
// the history row is tied to this exact write by a one-time write id (wid).
async function writeDoc(env, key, value, baseVersion, userId, action = 'edit') {
  const text = JSON.stringify(value ?? null);
  if (text.length > MAX_DOC_BYTES) return { status: 413, body: { error: 'too_large' } };
  const wid = randHex(12), at = nowIso();
  const docStmt = baseVersion === 0
    ? env.DB.prepare('INSERT INTO docs (key, value, version, updated_by, updated_at, wid) VALUES (?, ?, 1, ?, ?, ?) ON CONFLICT(key) DO NOTHING')
      .bind(key, text, userId, at, wid)
    : env.DB.prepare('UPDATE docs SET value = ?, version = version + 1, updated_by = ?, updated_at = ?, wid = ? WHERE key = ? AND version = ?')
      .bind(text, userId, at, wid, key, baseVersion);
  const histStmt = env.DB.prepare(
    'INSERT INTO history (key, version, value, user_id, at, action) SELECT key, version, value, updated_by, updated_at, ? FROM docs WHERE key = ? AND wid = ?'
  ).bind(action, key, wid);
  const pruneStmt = env.DB.prepare(
    'DELETE FROM history WHERE key = ? AND id NOT IN (SELECT id FROM history WHERE key = ? ORDER BY id DESC LIMIT ?)'
  ).bind(key, key, HISTORY_KEEP_PER_KEY);
  const [docRes] = await env.DB.batch([docStmt, histStmt, pruneStmt]);
  if (docRes.meta.changes !== 1) {
    const cur = await env.DB.prepare('SELECT value, version, updated_by, updated_at FROM docs WHERE key = ?').bind(key).first();
    return { status: 409, body: { error: 'conflict', key, value: cur ? JSON.parse(cur.value) : null, version: cur ? cur.version : 0, updated_by: cur?.updated_by, updated_at: cur?.updated_at } };
  }
  const row = await env.DB.prepare('SELECT version FROM docs WHERE key = ?').bind(key).first();
  return { status: 200, body: { ok: true, key, version: row.version, updated_at: at, seq: await seqNow(env) } };
}
async function putDoc(req, env, user, key) {
  if (!SHARED_KEYS.has(key)) return err(400, 'unknown_key');
  const b = await readBody(req);
  if (!b || !('value' in b)) return err(400, 'bad_request');
  const base = Number(b.baseVersion || 0);
  const r = await writeDoc(env, key, b.value, base, user.id, b.action === 'import' ? 'import' : 'edit');
  return json(r.body, r.status);
}
async function changes(env, url) {
  const since = Number(url.searchParams.get('since') || 0);
  const seq = await seqNow(env);
  if (seq <= since) return json({ docs: [], seq });
  const { results } = await env.DB.prepare(
    'SELECT key, value, version, updated_by, updated_at FROM docs WHERE key IN (SELECT DISTINCT key FROM history WHERE id > ?)'
  ).bind(since).all();
  return json({ docs: results.map((d) => ({ ...d, value: JSON.parse(d.value) })), seq, users: await usersMap(env) });
}
async function history(env, url) {
  const limit = Math.min(200, Number(url.searchParams.get('limit') || 50));
  const before = Number(url.searchParams.get('before') || 0);
  const key = url.searchParams.get('key');
  let sql = 'SELECT h.id, h.key, h.version, h.at, h.action, h.user_id, LENGTH(h.value) AS size FROM history h';
  const where = [], args = [];
  if (before) { where.push('h.id < ?'); args.push(before); }
  if (key) { where.push('h.key = ?'); args.push(key); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY h.id DESC LIMIT ?'; args.push(limit);
  const { results } = await env.DB.prepare(sql).bind(...args).all();
  return json({ rows: results, users: await usersMap(env) });
}
async function historyItem(env, id) {
  const r = await env.DB.prepare('SELECT id, key, version, value, at, action, user_id FROM history WHERE id = ?').bind(id).first();
  if (!r) return err(404, 'not_found');
  return json({ ...r, value: JSON.parse(r.value) });
}
async function restore(req, env, user) {
  const b = await readBody(req);
  const h = b && await env.DB.prepare('SELECT key, value FROM history WHERE id = ?').bind(Number(b.id)).first();
  if (!h) return err(404, 'not_found');
  for (let i = 0; i < 5; i++) {
    const cur = await env.DB.prepare('SELECT version FROM docs WHERE key = ?').bind(h.key).first();
    const r = await writeDoc(env, h.key, JSON.parse(h.value), cur ? cur.version : 0, user.id, 'restore');
    if (r.status !== 409) return json(r.body, r.status);
  }
  return err(409, 'busy');
}
async function exportAll(env) {
  const state = await getState(env);
  const out = { app: 'nadu-wedding', exportedAt: nowIso(), users: state.users, data: {} };
  Object.entries(state.docs).forEach(([k, d]) => { out.data[k] = d.value; });
  const name = `nadu-wedding-${out.exportedAt.slice(0, 10)}.json`;
  return new Response(JSON.stringify(out, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'no-store' }
  });
}

async function api(req, env, url) {
  const p = url.pathname, m = req.method;
  // Same-origin check for anything that changes data (SameSite=Lax cookies already block cross-site posts).
  if (m !== 'GET' && m !== 'HEAD') {
    const origin = req.headers.get('origin');
    if (origin && origin !== url.origin) return err(403, 'bad_origin');
  }
  if (p === '/api/env' && m === 'GET') return json({ env: env.APP_ENV || 'production' });
  if (p === '/api/login' && m === 'POST') return login(req, env);
  if (p === '/api/signup' && m === 'POST') return signup(req, env);
  if (p === '/api/logout' && m === 'POST') return logout(req, env);

  const user = await currentUser(req, env);
  if (!user) return err(401, 'not_signed_in');

  if (p === '/api/me' && m === 'GET') return json({ user, users: await usersMap(env), env: env.APP_ENV || 'production' });
  if (p === '/api/state' && m === 'GET') return json(await getState(env));
  if (p === '/api/changes' && m === 'GET') return changes(env, url);
  if (p === '/api/history' && m === 'GET') return history(env, url);
  if (p.startsWith('/api/history/') && m === 'GET') return historyItem(env, Number(p.split('/').pop()));
  if (p === '/api/restore' && m === 'POST') return restore(req, env, user);
  if (p === '/api/export' && m === 'GET') return exportAll(env);
  if (p.startsWith('/api/doc/') && m === 'PUT') return putDoc(req, env, user, decodeURIComponent(p.slice('/api/doc/'.length)));
  return err(404, 'not_found');
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await api(req, env, url); }
      catch (e) { console.error(e); return err(500, 'server_error'); }
    }
    return env.ASSETS.fetch(req);
  }
};
