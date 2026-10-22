// Nadu Wedding Planner — API.
// Static page comes from ./public via the ASSETS binding; everything under /api/* lands here.
//
// Model: public email accounts; each couple works in a "plan". Every data route is scoped to
// one plan (X-Plan-Id header) and checked against the caller's membership on every request.
// Roles: owner (settings, invites, members) · editor (edit data) · viewer (read only).
// Access: trial → active (paid, set by an admin) → expired (read-only; export always works).
// Export is free for every member at any time: people have the right to their own data (개인정보보호법 제35조,
// fees only for actual costs under 제38조), so it is never sold. Paid add-ons per plan: ai_enabled (AI features)
// and io_enabled (import: loading files into a plan). Site admins have both.
// Privacy & security (docs/privacy-security-plan.md): encryption at rest (DATA_KEY), audit log, admin two-step
// login and idle timeout, ID-number refusal, read rate limits, bot blocking, security headers, retention job.

import { buildSqlBackup, backupResponse } from './backup.js';
import {
  sealText, openText, keyStatus, isEncrypted, keyIdOf, currentKey, sealBackup, newTotpSecret, totpOk, otpauthUri, weakPassword,
  findRrn, findCard, audit, verifyAudit, botVerdict, ROBOTS_TXT, withSecurityHeaders
} from './security.js';

const SHARED_KEYS = new Set([
  'budget', 'selectedVenue', 'selectedLoan', 'venues', 'nonVenue', 'afterCosts', 'honsu', 'categories', 'loans', 'seeded',
  'wedding', 'checks', 'tasks', 'expenses', 'split', 'guests', 'guestRate', 'giftLog', 'vendors', 'sdm', 'sdmCatalog'
]);
const SESSION_DAYS = 30;
const MAX_DOC_BYTES = 400_000;
const HISTORY_KEEP_PER_KEY = 300;
const PBKDF2_ITER = 100_000; // Workers' WebCrypto caps PBKDF2 at 100k iterations
const RESET_MINUTES = 60;
const INVITE_DAYS = 7;
const MAX_PLANS_PER_USER = 3;
const ROLES = ['owner', 'editor', 'viewer'];
const DAY = 864e5;
const ADMIN_IDLE_MS = 30 * 60_000;
const LOGIN_MAX_FAILS = 5, LOGIN_LOCK_MS = 15 * 60_000;
const RETENTION_DAYS = 365, RETENTION_WARN_DAYS = 30;

const enc = new TextEncoder();
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const err = (status, error, extra = {}) => json({ error, ...extra }, status);
const nowIso = () => new Date().toISOString();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const randHex = (bytes) => hex(crypto.getRandomValues(new Uint8Array(bytes)));
const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const randCode = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => CODE_ALPHABET[b % 32]).join('');
const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const isEmail = (s) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(s);
const clip = (s, n) => String(s ?? '').trim().slice(0, n);

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
const clientIp = (req) => req.headers.get('cf-connecting-ip') || 'unknown';
async function readBody(req) { try { return await req.json(); } catch { return null; } }

// ---------- rate limiting ----------
async function overLimit(env, bucket, max, windowMs) {
  const since = Date.now() - windowMs;
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM rate_events WHERE bucket = ? AND at > ?').bind(bucket, since).first();
  return n >= max;
}
async function hit(env, bucket) {
  await env.DB.prepare('INSERT INTO rate_events (bucket, at) VALUES (?, ?)').bind(bucket, Date.now()).run();
  if (Math.random() < 0.05) await env.DB.prepare('DELETE FROM rate_events WHERE at < ?').bind(Date.now() - 8 * DAY).run();
}

// Read limits per account and per IP. Uses Cloudflare's rate-limiting bindings when configured (wrangler.jsonc
// "ratelimits"), else a per-isolate counter. Repeated trips lock reads for 15 minutes and are logged.
const memHits = new Map(), memLocks = new Map();
async function limiterOk(binding, key, limit) {
  if (binding && binding.limit) { try { return (await binding.limit({ key })).success; } catch { return true; } }
  const now = Date.now(), w = memHits.get(key) || [];
  const recent = w.filter((t) => now - t < 60_000); recent.push(now); memHits.set(key, recent);
  if (memHits.size > 5000) memHits.clear();
  return recent.length <= limit;
}
async function readGate(req, env, user, kind) {
  const now = Date.now(), lockKey = 'lock:' + user.id;
  if ((memLocks.get(lockKey) || 0) > now) return err(429, 'slow_down', { retryMinutes: Math.ceil((memLocks.get(lockKey) - now) / 60_000) });
  const files = kind === 'file';
  const okUser = await limiterOk(files ? env.FILE_LIMITER : env.READ_LIMITER, `${kind}:u:${user.id}`, files ? 600 : 120);
  const okIp = await limiterOk(files ? env.FILE_LIMITER : env.READ_LIMITER, `${kind}:ip:${clientIp(req)}`, files ? 900 : 240);
  if (okUser && okIp) return null;
  await hit(env, 'trip:' + user.id);
  if (await overLimit(env, 'trip:' + user.id, 3, 10 * 60_000)) {
    memLocks.set(lockKey, now + 15 * 60_000);
    await audit(env, req, { userId: user.id, action: 'read_lockout', detail: kind });
  } else await audit(env, req, { userId: user.id, action: 'rate_limited', detail: kind });
  return err(429, 'slow_down', { retryMinutes: 1 });
}

// ---------- sessions & users ----------
async function currentUser(req, env) {
  const token = cookie(req, 'sid');
  if (!token) return null;
  const u = await env.DB.prepare(
    'SELECT u.id, u.username, u.display, u.email, u.is_admin, u.totp_enabled, s.mfa, s.last_seen FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?'
  ).bind(token, Date.now()).first();
  if (!u) return null;
  const now = Date.now();
  if (u.is_admin) {
    // Admin sessions end after 30 minutes without activity (안전성 확보조치 기준 제6조④).
    if (u.last_seen && now - u.last_seen > ADMIN_IDLE_MS) {
      await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
      await audit(env, req, { userId: u.id, action: 'admin_idle_logout' });
      return null;
    }
    if (!u.last_seen || now - u.last_seen > 60_000) await env.DB.prepare('UPDATE sessions SET last_seen = ? WHERE token = ?').bind(now, token).run();
  }
  u.token = token;
  return u;
}
async function newSession(env, userId, mfa = false) {
  const token = randHex(32);
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at, mfa, last_seen) VALUES (?, ?, ?, ?, ?)')
    .bind(token, userId, Date.now() + SESSION_DAYS * DAY, mfa ? 1 : 0, Date.now()).run();
  return token;
}
const signedIn = (token, body = { ok: true }) => json(body, 200, { 'set-cookie': sessionCookie(token, SESSION_DAYS * 86400) });

// ---------- plans & access ----------
function access(plan, now = Date.now()) {
  if (plan.paid_until && plan.paid_until > now) return 'active';
  if (plan.status === 'active' && !plan.paid_until) return 'active'; // complimentary, no end date
  if (plan.trial_ends && plan.trial_ends > now) return 'trial';
  return 'expired';
}
function planView(p, role, isAdmin) {
  const acc = access(p);
  return {
    id: p.id, name: p.name, partner_a: p.partner_a, partner_b: p.partner_b, role,
    access: acc, trial_ends: p.trial_ends, paid_until: p.paid_until,
    ai: !!(isAdmin || (p.ai_enabled && acc === 'active')),
    io: !!(isAdmin || (p.io_enabled && acc === 'active')),
    writable: !!(isAdmin || (role !== 'viewer' && acc !== 'expired'))
  };
}
async function myPlans(env, user) {
  const { results } = await env.DB.prepare(
    'SELECT p.*, m.role FROM plan_members m JOIN plans p ON p.id = m.plan_id WHERE m.user_id = ? ORDER BY p.id'
  ).bind(user.id).all();
  return results.map((p) => planView(p, p.role, !!user.is_admin));
}
// Resolve the plan named in X-Plan-Id and the caller's role in it. Non-members get 404 (no hint the plan exists).
async function planCtx(req, env, user, url) {
  // Header for API calls; ?plan= only so a plain download link (export) can name the plan.
  const id = Number(req.headers.get('x-plan-id') || url.searchParams.get('plan') || 0);
  if (!id) return { error: err(400, 'no_plan') };
  const row = await env.DB.prepare(
    'SELECT p.*, m.role FROM plans p JOIN plan_members m ON m.plan_id = p.id AND m.user_id = ? WHERE p.id = ?'
  ).bind(user.id, id).first();
  if (!row) return { error: err(404, 'plan_not_found') };
  const view = planView(row, row.role, !!user.is_admin);
  return { plan: row, role: row.role, view };
}
async function membersMap(env, planId) {
  const { results } = await env.DB.prepare(
    'SELECT u.id, u.display FROM plan_members m JOIN users u ON u.id = m.user_id WHERE m.plan_id = ?'
  ).bind(planId).all();
  const m = {}; results.forEach((u) => { m[u.id] = u.display; }); return m;
}
async function deletePlan(env, planId) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM plan_docs WHERE plan_id = ?').bind(planId),
    env.DB.prepare('DELETE FROM plan_history WHERE plan_id = ?').bind(planId),
    env.DB.prepare('DELETE FROM plan_files WHERE plan_id = ?').bind(planId),
    env.DB.prepare('DELETE FROM plan_invites WHERE plan_id = ?').bind(planId),
    env.DB.prepare('DELETE FROM plan_members WHERE plan_id = ?').bind(planId),
    env.DB.prepare('DELETE FROM plans WHERE id = ?').bind(planId)
  ]);
}

// ---------- email ----------
async function sendEmail(env, to, subject, text) {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return false;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text })
  });
  return r.ok;
}
async function makeResetLink(env, origin, userId) {
  const token = randHex(24);
  await env.DB.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256(token), userId, Date.now() + RESET_MINUTES * 60_000).run();
  return `${origin}/?reset=${token}`;
}

// ---------- optional bot check (Cloudflare Turnstile) ----------
async function turnstileOk(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip })
  });
  const d = await r.json().catch(() => ({}));
  return !!d.success;
}

// ---------- auth ----------
async function signup(req, env) {
  const b = await readBody(req);
  if (!b) return err(400, 'bad_request');
  const email = clip(b.email, 254).toLowerCase(), display = clip(b.display, 40), password = String(b.password || '');
  if (!isEmail(email)) return err(400, 'bad_email');
  if (!display) return err(400, 'no_name');
  const weak = weakPassword(password, email); if (weak) return err(400, weak);
  // Under-14s need a parent's consent (개인정보보호법 제22조의2); the service is for adults planning a wedding.
  if (!b.age14) return err(400, 'age_required');
  const ip = clientIp(req);
  const { n: userCount } = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first();
  if (String(env.SIGNUP_OPEN ?? 'true') === 'false' && userCount > 0) return err(403, 'signup_closed');
  if (await overLimit(env, 'signup:' + ip, 5, 60 * 60_000)) return err(429, 'too_many_attempts');
  if (!(await turnstileOk(env, b.turnstile, ip))) return err(403, 'bot_check_failed');
  await hit(env, 'signup:' + ip);
  const exists = await env.DB.prepare('SELECT 1 FROM users WHERE email = ? OR username = ?').bind(email, email).first();
  if (exists) return err(409, 'email_taken');
  // The very first account on an empty site becomes its admin.
  const { n: admins } = await env.DB.prepare('SELECT COUNT(*) AS n FROM users WHERE is_admin = 1').first();
  const salt = randHex(16), pw = await hashPassword(password, salt);
  const r = await env.DB.prepare('INSERT INTO users (username, display, pw_hash, pw_salt, created_at, email, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(email, display, pw, salt, nowIso(), email, admins ? 0 : 1).run();
  await audit(env, req, { userId: r.meta.last_row_id, action: 'signup', target: email, detail: admins ? '' : 'first account: admin' });
  return signedIn(await newSession(env, r.meta.last_row_id));
}
async function login(req, env) {
  const b = await readBody(req);
  if (!b) return err(400, 'bad_request');
  const id = clip(b.email ?? b.username, 254).toLowerCase(), password = String(b.password || '');
  const since = Date.now() - LOGIN_LOCK_MS;
  // Failed-login limit (안전성 확보조치 기준 제5조⑥): 5 failures lock the account for 15 minutes.
  const { n, first } = await env.DB.prepare('SELECT COUNT(*) AS n, MIN(at) AS first FROM login_attempts WHERE username = ? AND at > ?').bind(id, since).first();
  if (n >= LOGIN_MAX_FAILS) return err(429, 'too_many_attempts', { retryMinutes: Math.max(1, Math.ceil((first + LOGIN_LOCK_MS - Date.now()) / 60_000)) });
  if (!(await turnstileOk(env, b.turnstile, clientIp(req)))) return err(403, 'bot_check_failed');
  const u = await env.DB.prepare('SELECT id, pw_hash, pw_salt, totp_enabled, totp_secret FROM users WHERE email = ? OR username = ?').bind(id, id).first();
  const ok = u && safeEqual(await hashPassword(password, u.pw_salt), u.pw_hash);
  const fail = async (code, why) => {
    await env.DB.prepare('INSERT INTO login_attempts (username, at) VALUES (?, ?)').bind(id, Date.now()).run();
    await audit(env, req, { userId: u ? u.id : null, action: 'login_fail', target: id, detail: why });
    const left = LOGIN_MAX_FAILS - n - 1;
    return err(401, code, { attemptsLeft: Math.max(0, left) });
  };
  if (!ok) return fail('bad_login', 'password');
  let mfa = false;
  if (u.totp_enabled) {
    if (!b.code) return err(401, 'totp_required');  // password was right: ask for the 6-digit code
    if (!(await totpOk(await openText(env, u.totp_secret), b.code))) return fail('bad_code', 'two-step code');
    mfa = true;
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE username = ? OR at < ?').bind(id, since).run();
  await audit(env, req, { userId: u.id, action: 'login', detail: mfa ? 'two-step' : '' });
  return signedIn(await newSession(env, u.id, mfa));
}
async function logout(req, env) {
  const token = cookie(req, 'sid');
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
}
// Always answers ok, so nobody can find out which emails have accounts.
async function forgot(req, env, url) {
  const b = await readBody(req);
  const email = clip(b && b.email, 254).toLowerCase();
  const ip = clientIp(req);
  if (await overLimit(env, 'forgot:' + ip, 5, 60 * 60_000) || await overLimit(env, 'forgot:' + email, 3, 60 * 60_000)) return err(429, 'too_many_attempts');
  if (!(await turnstileOk(env, b && b.turnstile, ip))) return err(403, 'bot_check_failed');
  await hit(env, 'forgot:' + ip); await hit(env, 'forgot:' + email);
  const u = isEmail(email) && await env.DB.prepare('SELECT id, display FROM users WHERE email = ?').bind(email).first();
  if (u) {
    const link = await makeResetLink(env, url.origin, u.id);
    await sendEmail(env, email, 'Nadu Wedding Planner 비밀번호 재설정 · Password reset',
      `${u.display}님,\n\n아래 링크에서 새 비밀번호를 설정하세요 (${RESET_MINUTES}분 동안 유효).\nSet a new password with this link (valid for ${RESET_MINUTES} minutes):\n\n${link}\n\n요청하지 않았다면 이 메일을 무시하세요. If you didn't ask for this, ignore this email.`);
  }
  return json({ ok: true, emailConfigured: !!(env.RESEND_API_KEY && env.MAIL_FROM) });
}
async function reset(req, env) {
  const b = await readBody(req);
  const token = String(b && b.token || ''), password = String(b && b.password || '');
  const th = await sha256(token);
  const r = await env.DB.prepare('SELECT p.user_id, u.email FROM password_resets p JOIN users u ON u.id = p.user_id WHERE p.token_hash = ? AND p.expires_at > ?').bind(th, Date.now()).first();
  if (!r) return err(400, 'bad_reset_link');
  const weak = weakPassword(password, r.email); if (weak) return err(400, weak);
  const salt = randHex(16), pw = await hashPassword(password, salt);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET pw_hash = ?, pw_salt = ? WHERE id = ?').bind(pw, salt, r.user_id),
    env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(r.user_id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(r.user_id) // sign out everywhere
  ]);
  await audit(env, req, { userId: r.user_id, action: 'password_reset' });
  return signedIn(await newSession(env, r.user_id));
}

// ---------- account ----------
async function updateAccount(req, env, user) {
  const b = await readBody(req);
  if (!b) return err(400, 'bad_request');
  const sets = [], args = [];
  if (b.display !== undefined) { const d = clip(b.display, 40); if (!d) return err(400, 'no_name'); sets.push('display = ?'); args.push(d); }
  if (b.email !== undefined) {
    const e = clip(b.email, 254).toLowerCase();
    if (!isEmail(e)) return err(400, 'bad_email');
    const taken = await env.DB.prepare('SELECT 1 FROM users WHERE (email = ? OR username = ?) AND id != ?').bind(e, e, user.id).first();
    if (taken) return err(409, 'email_taken');
    sets.push('email = ?'); args.push(e);
  }
  if (b.newPassword !== undefined) {
    const u = await env.DB.prepare('SELECT pw_hash, pw_salt FROM users WHERE id = ?').bind(user.id).first();
    if (!safeEqual(await hashPassword(String(b.password || ''), u.pw_salt), u.pw_hash)) return err(403, 'bad_password');
    const weak = weakPassword(String(b.newPassword), user.email); if (weak) return err(400, weak);
    const salt = randHex(16); sets.push('pw_hash = ?', 'pw_salt = ?'); args.push(await hashPassword(String(b.newPassword), salt), salt);
  }
  if (!sets.length) return json({ ok: true });
  await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...args, user.id).run();
  await audit(env, req, { userId: user.id, action: b.newPassword !== undefined ? 'password_change' : 'account_update', detail: sets.map((x) => x.split(' ')[0]).join(',') });
  return json({ ok: true });
}
// ---------- two-step login (authenticator app) ----------
async function twoStep(req, env, user, step) {
  const b = await readBody(req) || {};
  const u = await env.DB.prepare('SELECT pw_hash, pw_salt, totp_secret, totp_pending, totp_enabled FROM users WHERE id = ?').bind(user.id).first();
  const pwOk = async () => safeEqual(await hashPassword(String(b.password || ''), u.pw_salt), u.pw_hash);
  if (step === 'setup') {
    if (!(await pwOk())) return err(403, 'bad_password');
    const secret = newTotpSecret();
    await env.DB.prepare('UPDATE users SET totp_pending = ? WHERE id = ?').bind(await sealText(env, secret), user.id).run();
    return json({ secret, uri: otpauthUri(secret, user.email || user.username) });
  }
  if (step === 'enable') {
    if (!u.totp_pending) return err(400, 'no_setup');
    const secret = await openText(env, u.totp_pending);
    if (!(await totpOk(secret, b.code))) return err(400, 'bad_code');
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET totp_secret = ?, totp_pending = NULL, totp_enabled = 1 WHERE id = ?').bind(await sealText(env, secret), user.id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').bind(user.id, user.token), // other devices sign in again
      env.DB.prepare('UPDATE sessions SET mfa = 1 WHERE token = ?').bind(user.token)
    ]);
    await audit(env, req, { userId: user.id, action: '2fa_on' });
    return json({ ok: true });
  }
  if (step === 'disable') {
    if (!u.totp_enabled) return json({ ok: true });
    if (!(await pwOk())) return err(403, 'bad_password');
    if (!(await totpOk(await openText(env, u.totp_secret), b.code))) return err(400, 'bad_code');
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET totp_secret = NULL, totp_pending = NULL, totp_enabled = 0 WHERE id = ?').bind(user.id),
      env.DB.prepare('UPDATE sessions SET mfa = 0 WHERE user_id = ?').bind(user.id)
    ]);
    await audit(env, req, { userId: user.id, action: '2fa_off' });
    return json({ ok: true });
  }
  return err(404, 'not_found');
}
async function deleteAccount(req, env, user) {
  const b = await readBody(req);
  const u = await env.DB.prepare('SELECT pw_hash, pw_salt FROM users WHERE id = ?').bind(user.id).first();
  if (!safeEqual(await hashPassword(String(b && b.password || ''), u.pw_salt), u.pw_hash)) return err(403, 'bad_password');
  const { results } = await env.DB.prepare('SELECT plan_id, role FROM plan_members WHERE user_id = ?').bind(user.id).all();
  for (const m of results) {
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM plan_members WHERE plan_id = ? AND user_id != ?').bind(m.plan_id, user.id).first();
    if (!n) { await deletePlan(env, m.plan_id); continue; }  // last member: the plan and all its data go too
    if (m.role === 'owner') {                                 // hand ownership to the longest-standing member
      await env.DB.prepare(`UPDATE plan_members SET role = 'owner' WHERE plan_id = ? AND user_id = (
        SELECT user_id FROM plan_members WHERE plan_id = ? AND user_id != ? ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, joined_at LIMIT 1)`)
        .bind(m.plan_id, m.plan_id, user.id).run();
    }
  }
  await env.DB.batch([
    env.DB.prepare('DELETE FROM plan_members WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id)
  ]);
  await audit(env, req, { userId: user.id, action: 'account_delete', detail: `plans: ${results.map((m) => m.plan_id).join(',')}` });
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', 0) });
}

// ---------- plan management ----------
async function createPlan(req, env, user) {
  const b = await readBody(req) || {};
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM plan_members WHERE user_id = ? AND role = 'owner'").bind(user.id).first();
  if (n >= MAX_PLANS_PER_USER && !user.is_admin) return err(403, 'plan_limit');
  const a = clip(b.partner_a, 30), bb = clip(b.partner_b, 30);
  const name = clip(b.name, 60) || [a, bb].filter(Boolean).join(' & ') || 'Our wedding';
  const trialDays = Math.max(0, Number(env.TRIAL_DAYS ?? 14));
  const r = await env.DB.prepare(
    "INSERT INTO plans (name, partner_a, partner_b, status, trial_ends, created_by, created_at) VALUES (?, ?, ?, 'trial', ?, ?, ?)"
  ).bind(name, a, bb, Date.now() + trialDays * DAY, user.id, nowIso()).run();
  const id = r.meta.last_row_id;
  await env.DB.prepare("INSERT INTO plan_members (plan_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)").bind(id, user.id, nowIso()).run();
  await audit(env, req, { userId: user.id, planId: id, action: 'plan_create' });
  return json({ ok: true, id });
}
async function updatePlan(req, env, ctx) {
  if (ctx.role !== 'owner') return err(403, 'owner_only');
  const b = await readBody(req) || {};
  const a = b.partner_a !== undefined ? clip(b.partner_a, 30) : ctx.plan.partner_a;
  const bb = b.partner_b !== undefined ? clip(b.partner_b, 30) : ctx.plan.partner_b;
  const name = b.name !== undefined ? (clip(b.name, 60) || [a, bb].filter(Boolean).join(' & ') || ctx.plan.name) : ctx.plan.name;
  await env.DB.prepare('UPDATE plans SET name = ?, partner_a = ?, partner_b = ? WHERE id = ?').bind(name, a, bb, ctx.plan.id).run();
  return json({ ok: true });
}
async function listMembers(env, ctx) {
  const { results } = await env.DB.prepare(
    'SELECT u.id, u.display, u.email, m.role, m.joined_at FROM plan_members m JOIN users u ON u.id = m.user_id WHERE m.plan_id = ? ORDER BY m.joined_at'
  ).bind(ctx.plan.id).all();
  let invites = [];
  if (ctx.role === 'owner') {
    invites = (await env.DB.prepare('SELECT substr(code_hash, 1, 8) AS ref, role, expires_at, uses_left FROM plan_invites WHERE plan_id = ? AND expires_at > ? AND uses_left > 0')
      .bind(ctx.plan.id, Date.now()).all()).results;
  }
  return json({ members: results, invites });
}
async function createInvite(req, env, ctx, url) {
  if (ctx.role !== 'owner') return err(403, 'owner_only');
  const b = await readBody(req) || {};
  const role = b.role === 'viewer' ? 'viewer' : 'editor';
  const code = randCode(10);
  await env.DB.prepare('INSERT INTO plan_invites (code_hash, plan_id, role, created_by, expires_at, uses_left) VALUES (?, ?, ?, ?, ?, 1)')
    .bind(await sha256(code), ctx.plan.id, role, ctx.userId, Date.now() + INVITE_DAYS * DAY).run();
  await audit(env, req, { userId: ctx.userId, planId: ctx.plan.id, action: 'invite_create', detail: role });
  return json({ code: code.replace(/(.{5})/, '$1-'), link: `${url.origin}/?join=${code}`, role, expires_at: Date.now() + INVITE_DAYS * DAY });
}
async function revokeInvite(req, env, ctx) {
  if (ctx.role !== 'owner') return err(403, 'owner_only');
  const b = await readBody(req) || {};
  await env.DB.prepare('DELETE FROM plan_invites WHERE plan_id = ? AND substr(code_hash, 1, 8) = ?').bind(ctx.plan.id, String(b.ref || '')).run();
  return json({ ok: true });
}
async function joinPlan(req, env, user) {
  const b = await readBody(req) || {};
  if (await overLimit(env, 'join:' + user.id, 10, 60 * 60_000)) return err(429, 'too_many_attempts');
  await hit(env, 'join:' + user.id);
  const inv = await env.DB.prepare('SELECT * FROM plan_invites WHERE code_hash = ? AND expires_at > ? AND uses_left > 0')
    .bind(await sha256(normCode(b.code)), Date.now()).first();
  if (!inv) return err(400, 'bad_invite');
  const already = await env.DB.prepare('SELECT 1 FROM plan_members WHERE plan_id = ? AND user_id = ?').bind(inv.plan_id, user.id).first();
  if (!already) {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO plan_members (plan_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').bind(inv.plan_id, user.id, inv.role, nowIso()),
      env.DB.prepare('UPDATE plan_invites SET uses_left = uses_left - 1 WHERE code_hash = ?').bind(inv.code_hash)
    ]);
    await audit(env, req, { userId: user.id, planId: inv.plan_id, action: 'join', detail: inv.role });
  }
  return json({ ok: true, id: inv.plan_id });
}
async function updateMember(req, env, ctx) {
  const b = await readBody(req) || {};
  const target = Number(b.user_id);
  const self = target === ctx.userId;
  if (!self && ctx.role !== 'owner') return err(403, 'owner_only');
  const m = await env.DB.prepare('SELECT role FROM plan_members WHERE plan_id = ? AND user_id = ?').bind(ctx.plan.id, target).first();
  if (!m) return err(404, 'not_found');
  const { n: owners } = await env.DB.prepare("SELECT COUNT(*) AS n FROM plan_members WHERE plan_id = ? AND role = 'owner'").bind(ctx.plan.id).first();
  if (b.remove) {
    const { n: members } = await env.DB.prepare('SELECT COUNT(*) AS n FROM plan_members WHERE plan_id = ?').bind(ctx.plan.id).first();
    if (members === 1) return err(400, 'last_member'); // delete the account or plan instead
    if (m.role === 'owner' && owners === 1) return err(400, 'last_owner');
    await env.DB.prepare('DELETE FROM plan_members WHERE plan_id = ? AND user_id = ?').bind(ctx.plan.id, target).run();
    await audit(env, req, { userId: ctx.userId, planId: ctx.plan.id, action: 'member_remove', target: String(target) });
    return json({ ok: true });
  }
  if (ctx.role !== 'owner') return err(403, 'owner_only');
  if (!ROLES.includes(b.role)) return err(400, 'bad_role');
  if (m.role === 'owner' && b.role !== 'owner' && owners === 1) return err(400, 'last_owner');
  await env.DB.prepare('UPDATE plan_members SET role = ? WHERE plan_id = ? AND user_id = ?').bind(b.role, ctx.plan.id, target).run();
  await audit(env, req, { userId: ctx.userId, planId: ctx.plan.id, action: 'member_role', target: String(target), detail: `${m.role} -> ${b.role}` });
  return json({ ok: true });
}

// ---------- plan documents ----------
async function seqNow(env, planId) {
  const r = await env.DB.prepare('SELECT COALESCE(MAX(id), 0) AS seq FROM plan_history WHERE plan_id = ?').bind(planId).first();
  return r.seq;
}
async function getState(env, ctx) {
  const { results } = await env.DB.prepare('SELECT key, value, version, updated_by, updated_at FROM plan_docs WHERE plan_id = ?').bind(ctx.plan.id).all();
  const docs = {};
  for (const d of results) docs[d.key] = { value: JSON.parse(await openText(env, d.value)), version: d.version, updated_by: d.updated_by, updated_at: d.updated_at };
  return { docs, seq: await seqNow(env, ctx.plan.id), users: await membersMap(env, ctx.plan.id), plan: ctx.view };
}
// Optimistic concurrency: a write only lands if the caller saw the latest version.
// The doc update and its history row commit together in one D1 batch (a single transaction).
async function writeDoc(env, planId, key, value, baseVersion, userId, action = 'edit') {
  const plain = JSON.stringify(value ?? null);
  if (plain.length > MAX_DOC_BYTES) return { status: 413, body: { error: 'too_large' } };
  const text = await sealText(env, plain); // encrypted at rest when DATA_KEY is set; history copies the sealed value
  const wid = randHex(12), at = nowIso();
  const docStmt = baseVersion === 0
    ? env.DB.prepare('INSERT INTO plan_docs (plan_id, key, value, version, updated_by, updated_at, wid) VALUES (?, ?, ?, 1, ?, ?, ?) ON CONFLICT(plan_id, key) DO NOTHING')
      .bind(planId, key, text, userId, at, wid)
    : env.DB.prepare('UPDATE plan_docs SET value = ?, version = version + 1, updated_by = ?, updated_at = ?, wid = ? WHERE plan_id = ? AND key = ? AND version = ?')
      .bind(text, userId, at, wid, planId, key, baseVersion);
  const histStmt = env.DB.prepare(
    'INSERT INTO plan_history (plan_id, key, version, value, user_id, at, action) SELECT plan_id, key, version, value, updated_by, updated_at, ? FROM plan_docs WHERE plan_id = ? AND key = ? AND wid = ?'
  ).bind(action, planId, key, wid);
  const pruneStmt = env.DB.prepare(
    'DELETE FROM plan_history WHERE plan_id = ? AND key = ? AND id NOT IN (SELECT id FROM plan_history WHERE plan_id = ? AND key = ? ORDER BY id DESC LIMIT ?)'
  ).bind(planId, key, planId, key, HISTORY_KEEP_PER_KEY);
  const [docRes] = await env.DB.batch([docStmt, histStmt, pruneStmt]);
  if (docRes.meta.changes !== 1) {
    const cur = await env.DB.prepare('SELECT value, version, updated_by, updated_at FROM plan_docs WHERE plan_id = ? AND key = ?').bind(planId, key).first();
    return { status: 409, body: { error: 'conflict', key, value: cur ? JSON.parse(await openText(env, cur.value)) : null, version: cur ? cur.version : 0, updated_by: cur?.updated_by, updated_at: cur?.updated_at } };
  }
  const row = await env.DB.prepare('SELECT version FROM plan_docs WHERE plan_id = ? AND key = ?').bind(planId, key).first();
  return { status: 200, body: { ok: true, key, version: row.version, updated_at: at, seq: await seqNow(env, planId) } };
}
const readOnly = (ctx) => err(403, ctx.view.access === 'expired' ? 'plan_expired' : 'read_only', { access: ctx.view.access });
async function putDoc(req, env, ctx, key) {
  if (!SHARED_KEYS.has(key)) return err(400, 'unknown_key');
  if (!ctx.view.writable) return readOnly(ctx);
  const b = await readBody(req);
  if (!b || !('value' in b)) return err(400, 'bad_request');
  const isImport = b.action === 'import';
  if (isImport && !ctx.view.io) return err(402, 'addon_required', { addon: 'io' });
  // Resident/foreigner registration numbers are never stored (개인정보보호법 제24조의2); card numbers get a warning.
  const plain = JSON.stringify(b.value ?? null);
  if (findRrn(plain)) return err(400, 'id_number');
  const r = await writeDoc(env, ctx.plan.id, key, b.value, Number(b.baseVersion || 0), ctx.userId, isImport ? 'import' : 'edit');
  if (r.status === 200 && findCard(plain)) r.body.warn = ['card'];
  if (r.status === 200 && isImport) await audit(env, req, { userId: ctx.userId, planId: ctx.plan.id, action: 'import', target: key });
  return json(r.body, r.status);
}
// ---------- plan files (photos) ----------
const FILE_NAME = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_FILE_BYTES = 700_000, MAX_PLAN_FILES = 400, MAX_PLAN_FILE_BYTES = 40_000_000;
function b64encode(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); }
function b64decode(str) { const bin = atob(str), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
async function getFile(env, ctx, name) {
  if (!FILE_NAME.test(name)) return err(404, 'not_found');
  const f = await env.DB.prepare('SELECT mime, data, updated_at FROM plan_files WHERE plan_id = ? AND name = ?').bind(ctx.plan.id, name).first();
  if (!f) return err(404, 'not_found');
  return new Response(b64decode(await openText(env, f.data)), { headers: {
    'content-type': f.mime, 'cache-control': 'private, max-age=300', 'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; sandbox", 'last-modified': new Date(f.updated_at).toUTCString() } });
}
async function putFile(req, env, ctx, name, url) {
  if (!ctx.view.writable) return readOnly(ctx);
  if (url.searchParams.get('import') && !ctx.view.io) return err(402, 'addon_required', { addon: 'io' });
  if (!FILE_NAME.test(name)) return err(400, 'bad_name');
  const mime = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!FILE_TYPES.has(mime)) return err(415, 'unsupported_type');
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (!bytes.length) return err(400, 'empty');
  if (bytes.length > MAX_FILE_BYTES) return err(413, 'too_large');
  const tot = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS b FROM plan_files WHERE plan_id = ? AND name != ?').bind(ctx.plan.id, name).first();
  if (tot.n >= MAX_PLAN_FILES || tot.b + bytes.length > MAX_PLAN_FILE_BYTES) return err(413, 'plan_storage_full');
  await env.DB.prepare('INSERT OR REPLACE INTO plan_files (plan_id, name, mime, size, data, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(ctx.plan.id, name, mime, bytes.length, await sealText(env, b64encode(bytes)), ctx.userId, nowIso()).run();
  return json({ ok: true, name, size: bytes.length });
}
async function deleteFile(env, ctx, name) {
  if (!ctx.view.writable) return readOnly(ctx);
  if (!FILE_NAME.test(name)) return err(400, 'bad_name');
  await env.DB.prepare('DELETE FROM plan_files WHERE plan_id = ? AND name = ?').bind(ctx.plan.id, name).run();
  return json({ ok: true });
}

async function changes(env, ctx, url) {
  const since = Number(url.searchParams.get('since') || 0);
  const seq = await seqNow(env, ctx.plan.id);
  if (seq <= since) return json({ docs: [], seq, plan: ctx.view });
  const { results } = await env.DB.prepare(
    'SELECT key, value, version, updated_by, updated_at FROM plan_docs WHERE plan_id = ? AND key IN (SELECT DISTINCT key FROM plan_history WHERE plan_id = ? AND id > ?)'
  ).bind(ctx.plan.id, ctx.plan.id, since).all();
  const docs = [];
  for (const d of results) docs.push({ ...d, value: JSON.parse(await openText(env, d.value)) });
  return json({ docs, seq, users: await membersMap(env, ctx.plan.id), plan: ctx.view });
}
async function history(env, ctx, url) {
  const limit = Math.min(200, Number(url.searchParams.get('limit') || 50));
  const before = Number(url.searchParams.get('before') || 0);
  const key = url.searchParams.get('key');
  let sql = 'SELECT id, key, version, at, action, user_id, LENGTH(value) AS size FROM plan_history WHERE plan_id = ?';
  const args = [ctx.plan.id];
  if (before) { sql += ' AND id < ?'; args.push(before); }
  if (key) { sql += ' AND key = ?'; args.push(key); }
  sql += ' ORDER BY id DESC LIMIT ?'; args.push(limit);
  const { results } = await env.DB.prepare(sql).bind(...args).all();
  return json({ rows: results, users: await membersMap(env, ctx.plan.id) });
}
async function historyItem(env, ctx, id) {
  const r = await env.DB.prepare('SELECT id, key, version, value, at, action, user_id FROM plan_history WHERE id = ? AND plan_id = ?').bind(id, ctx.plan.id).first();
  if (!r) return err(404, 'not_found');
  return json({ ...r, value: JSON.parse(await openText(env, r.value)) });
}
async function restore(req, env, ctx) {
  if (!ctx.view.writable) return readOnly(ctx);
  const b = await readBody(req);
  const h = b && await env.DB.prepare('SELECT key, value FROM plan_history WHERE id = ? AND plan_id = ?').bind(Number(b.id), ctx.plan.id).first();
  if (!h) return err(404, 'not_found');
  for (let i = 0; i < 5; i++) {
    const cur = await env.DB.prepare('SELECT version FROM plan_docs WHERE plan_id = ? AND key = ?').bind(ctx.plan.id, h.key).first();
    const r = await writeDoc(env, ctx.plan.id, h.key, JSON.parse(await openText(env, h.value)), cur ? cur.version : 0, ctx.userId, 'restore');
    if (r.status !== 409) return json(r.body, r.status);
  }
  return err(409, 'busy');
}
// Export: free for every member, any time (개인정보보호법 제35조). Logged and covered by the read limits.
async function exportAll(req, env, ctx) {
  const state = await getState(env, ctx);
  const out = { app: 'nadu-wedding', exportedAt: nowIso(), plan: { name: ctx.plan.name, partner_a: ctx.plan.partner_a, partner_b: ctx.plan.partner_b }, users: state.users, data: {} };
  Object.entries(state.docs).forEach(([k, d]) => { out.data[k] = d.value; });
  await audit(env, req, { userId: ctx.userId, planId: ctx.plan.id, action: 'export', detail: 'json' });
  const name = `nadu-wedding-${out.exportedAt.slice(0, 10)}.json`;
  return new Response(JSON.stringify(out, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'no-store' }
  });
}

// ---------- admin (site owner): manual payments, AI add-on, support ----------
async function adminPlans(env) {
  const { results: plans } = await env.DB.prepare(`
    SELECT p.*, (SELECT MAX(updated_at) FROM plan_docs d WHERE d.plan_id = p.id) AS last_edit,
           (SELECT COALESCE(SUM(LENGTH(value)), 0) FROM plan_docs d WHERE d.plan_id = p.id) AS bytes
    FROM plans p ORDER BY p.id DESC`).all();
  const { results: members } = await env.DB.prepare(
    'SELECT m.plan_id, m.role, u.id, u.display, u.email FROM plan_members m JOIN users u ON u.id = m.user_id').all();
  const { results: loose } = await env.DB.prepare(
    'SELECT id, display, email, created_at FROM users WHERE id NOT IN (SELECT user_id FROM plan_members) ORDER BY id DESC LIMIT 100').all();
  return json({
    plans: plans.map((p) => ({ ...p, access: access(p), members: members.filter((m) => m.plan_id === p.id), endsAt: planEnd(p),
      retention: retentionInfo(p) })),
    usersWithoutPlan: loose,
    emailConfigured: !!(env.RESEND_API_KEY && env.MAIL_FROM)
  });
}
const planEnd = (p) => p.status === 'active' && !p.paid_until ? null : (Math.max(p.paid_until || 0, p.trial_ends || 0) || null);
function retentionInfo(p, now = Date.now()) {
  if (access(p, now) !== 'expired') return null;
  const end = planEnd(p); if (!end) return null;
  return { warnAt: end + (RETENTION_DAYS - RETENTION_WARN_DAYS) * DAY, deleteAt: end + RETENTION_DAYS * DAY, warned: p.warned_at || null };
}
async function adminUpdatePlan(req, env, id, adminId) {
  const b = await readBody(req) || {};
  const p = await env.DB.prepare('SELECT * FROM plans WHERE id = ?').bind(id).first();
  if (!p) return err(404, 'not_found');
  const sets = [], args = [];
  if (b.extendDays !== undefined) {                // record a payment: extend from today or from the current end
    const days = Math.max(1, Math.min(3650, Number(b.extendDays) || 0));
    const from = Math.max(Date.now(), p.paid_until || 0);
    sets.push("paid_until = ?", "status = 'active'", 'warned_at = NULL'); args.push(from + days * DAY);
  }
  if (b.paid_until !== undefined) { sets.push('paid_until = ?'); args.push(b.paid_until ? Number(b.paid_until) : null); }
  if (b.status !== undefined) {
    if (!['trial', 'active', 'expired'].includes(b.status)) return err(400, 'bad_status');
    sets.push('status = ?'); args.push(b.status);
    // Expiring by hand records the end date, so the retention period has a start.
    if (b.status === 'expired' && b.paid_until === undefined) { sets.push('paid_until = ?'); args.push(Date.now()); }
  }
  if (b.trial_ends !== undefined) { sets.push('trial_ends = ?'); args.push(b.trial_ends ? Number(b.trial_ends) : null); }
  if (b.ai_enabled !== undefined) { sets.push('ai_enabled = ?'); args.push(b.ai_enabled ? 1 : 0); }
  if (b.io_enabled !== undefined) { sets.push('io_enabled = ?'); args.push(b.io_enabled ? 1 : 0); }
  if (b.admin_note !== undefined) { sets.push('admin_note = ?'); args.push(clip(b.admin_note, 500)); }
  if (!sets.length) return json({ ok: true });
  await env.DB.prepare(`UPDATE plans SET ${sets.join(', ')} WHERE id = ?`).bind(...args, id).run();
  await audit(env, req, { userId: adminId, planId: id, action: 'admin_plan_update', detail: JSON.stringify(b).slice(0, 300) });
  return json({ ok: true });
}
async function adminResetLink(req, env, url, adminId) {
  const b = await readBody(req) || {};
  const u = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(Number(b.user_id)).first();
  if (!u) return err(404, 'not_found');
  await audit(env, req, { userId: adminId, action: 'admin_reset_link', target: String(u.id) });
  return json({ link: await makeResetLink(env, url.origin, u.id), minutes: RESET_MINUTES });
}
// Full backup: needs a reason (logged, 안전성 확보조치 기준 제8조②) and a passphrase; the file is encrypted with it.
async function adminBackup(req, env, adminId) {
  const b = await readBody(req) || {};
  const reason = clip(b.reason, 200), pass = String(b.passphrase || '');
  if (reason.length < 3) return err(400, 'reason_required');
  if (pass.length < 12) return err(400, 'weak_passphrase');
  const envName = env.APP_ENV || 'production';
  const { sql, counts } = await buildSqlBackup(env.DB, { env: envName });
  await audit(env, req, { userId: adminId, action: 'admin_backup', detail: reason, target: JSON.stringify(counts).slice(0, 200) });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13).replace('T', '-');
  return new Response(await sealBackup(sql, pass), { headers: {
    'content-type': 'application/octet-stream', 'cache-control': 'no-store',
    'content-disposition': `attachment; filename="nadu-wedding-${envName}-backup-${stamp}.nadubackup"` } });
}
const AUDIT_KINDS = {
  downloads: ['export', 'export_csv', 'import', 'admin_backup', 'admin_notify_list'],
  security: ['login_fail', 'read_lockout', 'rate_limited', 'admin_idle_logout', '2fa_on', '2fa_off', 'password_reset', 'password_change'],
  admin: ['admin_plan_update', 'admin_reset_link', 'admin_backup', 'admin_reencrypt', 'retention_warn', 'retention_delete', 'retention_purge'],
  members: ['signup', 'join', 'invite_create', 'member_role', 'member_remove', 'account_delete', 'plan_create']
};
async function adminAudit(env, url) {
  const days = Math.min(400, Math.max(1, Number(url.searchParams.get('days') || 31)));
  const kind = url.searchParams.get('kind');
  let sql = 'SELECT a.id, a.at, a.user_id, u.email, a.ip, a.plan_id, a.action, a.target, a.detail FROM audit_log a LEFT JOIN users u ON u.id = a.user_id WHERE a.at > ?';
  const args = [Date.now() - days * DAY];
  if (AUDIT_KINDS[kind]) { sql += ` AND a.action IN (${AUDIT_KINDS[kind].map(() => '?').join(',')})`; args.push(...AUDIT_KINDS[kind]); }
  sql += ' ORDER BY a.id DESC LIMIT 500';
  const { results } = await env.DB.prepare(sql).bind(...args).all();
  const counts = {};
  (await env.DB.prepare('SELECT action, COUNT(*) AS n FROM audit_log WHERE at > ? GROUP BY action').bind(Date.now() - days * DAY).all()).results.forEach((r) => { counts[r.action] = r.n; });
  return json({ rows: results, counts, days });
}
// Encryption status, and how many stored values still need (re-)encrypting under the current key.
async function plaintextCounts(env) {
  const k = await currentKey(env);
  const id = k ? k.id : '';
  const q = async (table, col) => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${col} IS NOT NULL AND ${col} NOT LIKE ?`).bind(`enc1:${id}:%`).first()).n;
  return { plan_docs: await q('plan_docs', 'value'), plan_history: await q('plan_history', 'value'), plan_files: await q('plan_files', 'data'), totp: await q('users', 'totp_secret') };
}
async function adminSecurity(env) {
  const legacy = (await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('docs', 'history')").all()).results.map((r) => r.name);
  const { results: plans } = await env.DB.prepare('SELECT * FROM plans').all();
  const now = Date.now();
  const pending = plans.map((p) => ({ id: p.id, name: p.name, r: retentionInfo(p, now) })).filter((x) => x.r).map((x) => ({ id: x.id, name: x.name, ...x.r }));
  const admins = (await env.DB.prepare('SELECT id, email, totp_enabled FROM users WHERE is_admin = 1').all()).results;
  return json({
    encryption: await keyStatus(env), plaintext: await plaintextCounts(env),
    email: !!(env.RESEND_API_KEY && env.MAIL_FROM), turnstile: !!(env.TURNSTILE_SECRET && env.TURNSTILE_SITEKEY),
    signupOpen: String(env.SIGNUP_OPEN ?? 'true') !== 'false', rateLimitBinding: !!(env.READ_LIMITER && env.READ_LIMITER.limit),
    privacyOfficer: { name: env.PRIVACY_OFFICER || null, email: env.PRIVACY_EMAIL || env.CONTACT_EMAIL || null },
    legacyTables: legacy, retention: pending, admins
  });
}
// Re-encrypt up to 100 rows per call (plaintext, or sealed with an older key). Call until remaining is 0.
async function adminReencrypt(req, env, adminId) {
  const k = await currentKey(env);
  if (!k) return err(400, 'no_key');
  const like = `enc1:${k.id}:%`;
  let done = 0;
  for (const [table, col, idCols] of [['plan_docs', 'value', ['plan_id', 'key']], ['plan_history', 'value', ['id']], ['plan_files', 'data', ['plan_id', 'name']], ['users', 'totp_secret', ['id']]]) {
    const { results } = await env.DB.prepare(`SELECT ${idCols.join(', ')}, ${col} AS v FROM ${table} WHERE ${col} IS NOT NULL AND ${col} NOT LIKE ? LIMIT ?`).bind(like, 100 - done).all();
    for (const r of results) {
      const sealed = await sealText(env, await openText(env, r.v));
      await env.DB.prepare(`UPDATE ${table} SET ${col} = ? WHERE ${idCols.map((c) => c + ' = ?').join(' AND ')} AND ${col} = ?`).bind(sealed, ...idCols.map((c) => r[c]), r.v).run();
      done++;
    }
    if (done >= 100) break;
  }
  const remaining = await plaintextCounts(env);
  if (done) await audit(env, req, { userId: adminId, action: 'admin_reencrypt', detail: `${done} rows → ${k.id}` });
  return json({ done, remaining, key: k.id });
}
// Emails of everyone affected, for a breach notice within 72 hours (개인정보보호법 제34조).
async function adminNotifyList(req, env, url, adminId) {
  const plan = url.searchParams.get('plan');
  const { results } = plan && plan !== 'all'
    ? await env.DB.prepare('SELECT DISTINCT u.email, u.display FROM plan_members m JOIN users u ON u.id = m.user_id WHERE m.plan_id = ? AND u.email IS NOT NULL').bind(Number(plan)).all()
    : await env.DB.prepare('SELECT email, display FROM users WHERE email IS NOT NULL').all();
  await audit(env, req, { userId: adminId, action: 'admin_notify_list', target: plan || 'all', detail: `${results.length} addresses` });
  return json({ emails: results });
}

// ---------- AI add-on gate (the AI endpoints themselves come with the quote importer) ----------
async function aiStatus(ctx) { return json({ allowed: ctx.view.ai, access: ctx.view.access }); }

// ---------- router ----------
async function api(req, env, url) {
  const p = url.pathname, m = req.method;
  if (m !== 'GET' && m !== 'HEAD') {
    const origin = req.headers.get('origin');
    if (origin && origin !== url.origin) return err(403, 'bad_origin');
  }
  if (p === '/api/env' && m === 'GET') return json({
    env: env.APP_ENV || 'production', turnstileSiteKey: env.TURNSTILE_SITEKEY || null,
    contact: env.CONTACT_EMAIL || null, trialDays: Number(env.TRIAL_DAYS ?? 14),
    signupOpen: String(env.SIGNUP_OPEN ?? 'true') !== 'false',
    privacy: { officer: env.PRIVACY_OFFICER || null, email: env.PRIVACY_EMAIL || env.CONTACT_EMAIL || null, retentionDays: RETENTION_DAYS }
  });
  if (p === '/api/login' && m === 'POST') return login(req, env);
  if (p === '/api/signup' && m === 'POST') return signup(req, env);
  if (p === '/api/logout' && m === 'POST') return logout(req, env);
  if (p === '/api/forgot' && m === 'POST') return forgot(req, env, url);
  if (p === '/api/reset' && m === 'POST') return reset(req, env);

  const user = await currentUser(req, env);
  if (!user) return err(401, 'not_signed_in');
  const isAdmin = !!user.is_admin;

  if (p === '/api/me' && m === 'GET') return json({
    user: { id: user.id, display: user.display, email: user.email, username: user.username, is_admin: isAdmin, two_step: !!user.totp_enabled, mfa: !!user.mfa },
    plans: await myPlans(env, user), env: env.APP_ENV || 'production'
  });
  if (p === '/api/account' && m === 'PATCH') return updateAccount(req, env, user);
  if (p === '/api/account' && m === 'DELETE') return deleteAccount(req, env, user);
  const tm = p.match(/^\/api\/account\/2fa\/(setup|enable|disable)$/);
  if (tm && m === 'POST') return twoStep(req, env, user, tm[1]);
  if (p === '/api/plans' && m === 'POST') return createPlan(req, env, user);
  if (p === '/api/plans/join' && m === 'POST') return joinPlan(req, env, user);

  if (p.startsWith('/api/admin/')) {
    if (!isAdmin) return err(404, 'not_found');
    // Admin pages need a two-step sign-in (안전성 확보조치 기준 제6조②). Admins can set it up in Settings.
    if (!(user.totp_enabled && user.mfa)) return err(403, 'admin_2fa_required', { enrolled: !!user.totp_enabled });
    if (p === '/api/admin/plans' && m === 'GET') return adminPlans(env);
    const mm = p.match(/^\/api\/admin\/plans\/(\d+)$/);
    if (mm && m === 'PATCH') return adminUpdatePlan(req, env, Number(mm[1]), user.id);
    if (p === '/api/admin/reset-link' && m === 'POST') return adminResetLink(req, env, url, user.id);
    if (p === '/api/admin/backup' && m === 'POST') return adminBackup(req, env, user.id);
    if (p === '/api/admin/audit' && m === 'GET') return adminAudit(env, url);
    if (p === '/api/admin/audit/verify' && m === 'GET') return json(await verifyAudit(env));
    if (p === '/api/admin/security' && m === 'GET') return adminSecurity(env);
    if (p === '/api/admin/reencrypt' && m === 'POST') return adminReencrypt(req, env, user.id);
    if (p === '/api/admin/notify-list' && m === 'GET') return adminNotifyList(req, env, url, user.id);
    return err(404, 'not_found');
  }

  // Everything below works on one plan the caller belongs to.
  const c = await planCtx(req, env, user, url);
  if (c.error) return c.error;
  const ctx = { ...c, userId: user.id };
  const fm = p.match(/^\/api\/plan\/files\/([^/]+)$/);
  if (m === 'GET') {
    const kind = fm ? 'file' : ['/api/state', '/api/changes', '/api/history', '/api/export'].includes(p) || p.startsWith('/api/history/') ? 'read' : null;
    if (kind) { const limited = await readGate(req, env, user, kind); if (limited) return limited; }
  }
  if (p === '/api/plan' && m === 'PATCH') return updatePlan(req, env, ctx);
  if (p === '/api/plan/members' && m === 'GET') return listMembers(env, ctx);
  if (p === '/api/plan/members' && m === 'POST') return updateMember(req, env, ctx);
  if (p === '/api/plan/invites' && m === 'POST') return createInvite(req, env, ctx, url);
  if (p === '/api/plan/invites/revoke' && m === 'POST') return revokeInvite(req, env, ctx);
  if (p === '/api/ai/status' && m === 'GET') return aiStatus(ctx);
  if (p === '/api/state' && m === 'GET') return json(await getState(env, ctx));
  if (p === '/api/changes' && m === 'GET') return changes(env, ctx, url);
  if (p === '/api/history' && m === 'GET') return history(env, ctx, url);
  if (p.startsWith('/api/history/') && m === 'GET') return historyItem(env, ctx, Number(p.split('/').pop()));
  if (p === '/api/restore' && m === 'POST') return restore(req, env, ctx);
  if (p === '/api/export' && m === 'GET') return exportAll(req, env, ctx);
  // CSV files are built in the browser from data it already has; it reports them so the access log is complete.
  if (p === '/api/export/log' && m === 'POST') {
    const b = await readBody(req) || {};
    await audit(env, req, { userId: ctx.userId, planId: ctx.plan.id, action: 'export_csv', detail: clip(b.what, 40) });
    return json({ ok: true });
  }
  if (fm) {
    const name = decodeURIComponent(fm[1]);
    if (m === 'GET') return getFile(env, ctx, name);
    if (m === 'PUT') return putFile(req, env, ctx, name, url);
    if (m === 'DELETE') return deleteFile(env, ctx, name);
  }
  if (p.startsWith('/api/doc/') && m === 'PUT') return putDoc(req, env, ctx, decodeURIComponent(p.slice('/api/doc/'.length)));
  return err(404, 'not_found');
}

// ---------- daily housekeeping (cron) ----------
// Expired plans: warning email 30 days before deletion, deleted 1 year after their end date (개인정보보호법 제21조).
// A plan is only deleted after its warning went out; if email isn't configured, it waits (Admin → Security shows it).
// Also trims the audit log (1 year, permission changes 3 years) and short-lived security tables.
export async function housekeeping(env, now = Date.now()) {
  const out = { warned: 0, deleted: 0, auditPurged: 0 };
  const { results: plans } = await env.DB.prepare('SELECT * FROM plans').all();
  for (const p of plans) {
    const r = retentionInfo(p, now); if (!r) continue;
    if (r.deleteAt <= now && p.warned_at && now - p.warned_at >= (RETENTION_WARN_DAYS - 1) * DAY) {
      await deletePlan(env, p.id);
      await audit(env, null, { planId: p.id, action: 'retention_delete', target: p.name });
      out.deleted++;
    } else if (r.warnAt <= now && !p.warned_at) {
      const { results: mem } = await env.DB.prepare('SELECT u.email, u.display FROM plan_members m JOIN users u ON u.id = m.user_id WHERE m.plan_id = ? AND u.email IS NOT NULL').bind(p.id).all();
      let sent = mem.length > 0;
      for (const u of mem) sent = (await sendEmail(env, u.email, 'Nadu Wedding Planner: 플랜 삭제 예정 안내 · Your plan will be deleted',
        `${u.display}님,\n\n이용 기간이 끝난 지 1년이 되어 '${p.name}' 플랜과 모든 데이터가 ${new Date(Math.max(r.deleteAt, now + RETENTION_WARN_DAYS * DAY)).toISOString().slice(0, 10)}에 삭제됩니다.\n계속 쓰시려면 이용을 연장하거나, 그 전에 로그인해 내 데이터를 내려받으세요.\n\n'${p.name}' has been expired for a year, so the plan and all of its data will be deleted on that date. Renew to keep it, or sign in and download your data before then.`)) && sent;
      if (sent) {
        await env.DB.prepare('UPDATE plans SET warned_at = ? WHERE id = ?').bind(now, p.id).run();
        await audit(env, null, { planId: p.id, action: 'retention_warn', detail: `${mem.length} members` });
        out.warned++;
      }
    }
  }
  const maxGone = await env.DB.prepare('SELECT MAX(id) AS m, COUNT(*) AS n FROM audit_log WHERE keep_until < ?').bind(now).first();
  if (maxGone && maxGone.n) {
    await env.DB.prepare('DELETE FROM audit_log WHERE keep_until < ?').bind(now).run();
    await audit(env, null, { action: 'retention_purge', target: String(maxGone.m), detail: `${maxGone.n} log rows past retention` });
    out.auditPurged = maxGone.n;
  }
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM password_resets WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM login_attempts WHERE at < ?').bind(now - DAY),
    env.DB.prepare('DELETE FROM rate_events WHERE at < ?').bind(now - 8 * DAY)
  ]);
  return out;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const isApi = url.pathname.startsWith('/api/');
    if (url.pathname === '/robots.txt') return withSecurityHeaders(new Response(ROBOTS_TXT, { headers: { 'content-type': 'text/plain; charset=utf-8' } }));
    // AI crawlers, scrapers and scripts without a browser are turned away (they still get robots.txt above).
    const bot = botVerdict(req, isApi);
    if (bot) return withSecurityHeaders(new Response('Automated access is not allowed. 자동화된 접근은 허용되지 않습니다.', { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8' } }));
    if (isApi) {
      try { return withSecurityHeaders(await api(req, env, url)); }
      catch (e) { console.error(e); return withSecurityHeaders(err(500, 'server_error')); }
    }
    return withSecurityHeaders(await env.ASSETS.fetch(req));
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(housekeeping(env).then((r) => console.log('housekeeping', JSON.stringify(r))));
  }
};
