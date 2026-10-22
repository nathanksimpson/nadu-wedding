// Security helpers for Nadu Wedding Planner: encryption at rest, two-step login codes (TOTP),
// the tamper-evident audit log, bot detection, ID-number checks, security headers.
// See docs/privacy-security-plan.md for what each piece is for.

const enc = new TextEncoder(), dec = new TextDecoder();
const DAY = 864e5;
export function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); }
export function unb64(str) { const bin = atob(str), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
const hexOf = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

// ---------- encryption at rest (AES-256-GCM) ----------
// Secrets: DATA_KEY = "<id>:<base64 32 bytes>" (current key), DATA_KEY_PREV = same format (old key, readable only).
// Stored values look like "enc1:<id>:<iv b64>:<ciphertext b64>". Anything else is treated as plaintext,
// so existing rows keep working until they are re-encrypted (Admin → Security → encrypt now).
const keyCache = new Map();
function parseKey(spec) {
  if (!spec) return null;
  const i = String(spec).indexOf(':');
  if (i < 1) return null;
  const id = spec.slice(0, i), raw = unb64(spec.slice(i + 1).trim());
  if (raw.length !== 32 || !/^[A-Za-z0-9_-]{1,16}$/.test(id)) return null;
  return { id, raw };
}
async function cryptoKey(spec) {
  if (keyCache.has(spec)) return keyCache.get(spec);
  const k = parseKey(spec); if (!k) return null;
  const key = { id: k.id, aes: await crypto.subtle.importKey('raw', k.raw, 'AES-GCM', false, ['encrypt', 'decrypt']),
    mac: await crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new Uint8Array([...enc.encode('nadu-audit-mac:'), ...k.raw])), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']) };
  keyCache.set(spec, key);
  return key;
}
export const currentKey = (env) => cryptoKey(env.DATA_KEY);
export async function keyStatus(env) {
  const k = await currentKey(env), p = await cryptoKey(env.DATA_KEY_PREV);
  return { on: !!k, id: k ? k.id : null, prev: p ? p.id : null, badSecret: !!env.DATA_KEY && !k };
}
export const isEncrypted = (s) => typeof s === 'string' && s.startsWith('enc1:');
export const keyIdOf = (s) => isEncrypted(s) ? s.split(':')[1] : null;
export async function sealText(env, text) {
  const k = await currentKey(env);
  if (!k) return text;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k.aes, enc.encode(text)));
  return `enc1:${k.id}:${b64(iv)}:${b64(ct)}`;
}
export async function openText(env, stored) {
  if (!isEncrypted(stored)) return stored;
  const [, id, ivB, ctB] = stored.split(':');
  for (const spec of [env.DATA_KEY, env.DATA_KEY_PREV]) {
    const k = await cryptoKey(spec);
    if (k && k.id === id) return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivB) }, k.aes, unb64(ctB)));
  }
  throw new Error('no_key_for_' + id);
}
// Photos are stored as base64 text; sealing works on that text, so the same helpers apply.

// ---------- encrypted backup files (passphrase) ----------
export async function sealBackup(text, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 100_000;
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text)));
  return JSON.stringify({ format: 'nadu-backup', v: 1, kdf: 'PBKDF2-SHA256', iter, salt: b64(salt), iv: b64(iv), cipher: 'AES-256-GCM', data: b64(ct) });
}

// ---------- two-step login (TOTP, RFC 6238: 30 s, 6 digits, SHA-1) ----------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes) { let bits = 0, val = 0, out = ''; for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } } if (bits) out += B32[(val << (5 - bits)) & 31]; return out; }
export function unbase32(s) { const clean = String(s).toUpperCase().replace(/[^A-Z2-7]/g, ''); let bits = 0, val = 0; const out = []; for (const c of clean) { val = (val << 5) | B32.indexOf(c); bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return new Uint8Array(out); }
export const newTotpSecret = () => base32(crypto.getRandomValues(new Uint8Array(20)));
export async function totpAt(secret, step) {
  const key = await crypto.subtle.importKey('raw', unbase32(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new Uint8Array(8); let x = step; for (let i = 7; i >= 0; i--) { msg[i] = x & 255; x = Math.floor(x / 256); }
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg)), o = h[19] & 15;
  const code = ((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1e6;
  return String(code).padStart(6, '0');
}
// Accepts the current 30-second code and one step either side (clock drift).
export async function totpOk(secret, code, now = Date.now()) {
  code = String(code || '').replace(/\D/g, '');
  if (code.length !== 6 || !secret) return false;
  const step = Math.floor(now / 30000);
  for (const d of [0, -1, 1]) if (await totpAt(secret, step + d) === code) return true;
  return false;
}
export const otpauthUri = (secret, account, issuer = 'Nadu Wedding Planner') =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

// ---------- passwords ----------
const COMMON = new Set(('password password1 password12 password123 passw0rd 12345678 123456789 1234567890 11111111 00000000 88888888 qwertyui qwerty123 ' +
  'qwer1234 asdf1234 asdfghjk zxcvbnm1 iloveyou iloveyou1 sunshine princess football baseball welcome1 welcome123 admin123 administrator ' +
  'letmein1 abc12345 abcd1234 a1234567 q1w2e3r4 1q2w3e4r 1q2w3e4r5t 1qaz2wsx zaq12wsx 12341234 11223344 87654321 99999999 12121212 ' +
  'dragon12 monkey12 superman batman12 trustno1 starwars whatever loveyou1 love1234 sarang12 saranghae wedding1 wedding123 marriage ' +
  'nadu1234 nadu wedding planner1').split(/\s+/));
export function weakPassword(pw, email = '') {
  const p = String(pw || '');
  if (p.length < 8) return 'weak_password';
  const low = p.toLowerCase(), local = String(email).toLowerCase().split('@')[0];
  if (COMMON.has(low) || /^(.)\1+$/.test(p) || /^\d+$/.test(p) && new Set(p).size <= 2) return 'common_password';
  if (local && local.length >= 4 && low.includes(local)) return 'password_has_email';
  if ('0123456789012345678901234567890'.includes(p) || 'abcdefghijklmnopqrstuvwxyz'.includes(low) || 'qwertyuiopasdfghjklzxcvbnm'.includes(low)) return 'common_password';
  return null;
}

// ---------- ID numbers that must never be stored (개인정보보호법 제24조의2) ----------
// Resident / foreigner registration numbers: YYMMDD-Gxxxxxx with a real date and gender digit 1-8.
const RRN = /(?<!\d)(\d{2})(\d{2})(\d{2})\s?[-–]?\s?([1-8])\d{6}(?!\d)/g;
export function findRrn(text) {
  for (const m of String(text).matchAll(RRN)) {
    const mm = +m[2], dd = +m[3];
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return true;
  }
  return false;
}
// Card numbers (13-19 digits, Luhn) are warned about, not refused.
export function findCard(text) {
  for (const m of String(text).matchAll(/(?<!\d)(?:\d[ -]?){13,19}(?!\d)/g)) {
    const d = m[0].replace(/\D/g, ''); if (d.length < 13 || d.length > 19) continue;
    let sum = 0; for (let i = 0; i < d.length; i++) { let x = +d[d.length - 1 - i]; if (i % 2) { x *= 2; if (x > 9) x -= 9; } sum += x; }
    if (sum % 10 === 0 && !/^(\d)\1+$/.test(d)) return true;
  }
  return false;
}

// ---------- audit log (접속기록) ----------
// Each row carries an HMAC over its own fields, keyed from DATA_KEY: a row edited in the database
// without the key no longer verifies. Ids never repeat; gaps not explained by a recorded
// retention purge show deleted rows.
export const AUDIT_KEEP = { default: 365 * DAY, permission: 3 * 365 * DAY };
const PERMISSION_ACTIONS = new Set(['member_role', 'member_remove', 'join', 'invite_create', 'admin_plan_update', 'admin_flag', '2fa_on', '2fa_off', 'signup', 'account_delete']);
function auditFields(r) { return JSON.stringify([r.at, r.user_id ?? null, r.ip ?? '', r.plan_id ?? null, r.action, r.target ?? '', r.detail ?? '']); }
async function macOf(env, r) {
  const k = await currentKey(env);
  const key = k ? k.mac : await crypto.subtle.importKey('raw', enc.encode('nadu-audit-unkeyed'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return (k ? k.id + ':' : 'none:') + hexOf(await crypto.subtle.sign('HMAC', key, enc.encode(auditFields(r))));
}
export async function audit(env, req, { userId = null, planId = null, action, target = '', detail = '' }) {
  try {
    const at = Date.now();
    const r = { at, user_id: userId, ip: req ? (req.headers.get('cf-connecting-ip') || 'unknown') : 'system', plan_id: planId, action, target: String(target).slice(0, 200), detail: String(detail).slice(0, 500) };
    const keep = PERMISSION_ACTIONS.has(action) ? AUDIT_KEEP.permission : AUDIT_KEEP.default;
    await env.DB.prepare('INSERT INTO audit_log (at, user_id, ip, plan_id, action, target, detail, keep_until, mac) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(r.at, r.user_id, r.ip, r.plan_id, r.action, r.target, r.detail, at + keep, await macOf(env, r)).run();
  } catch (e) { console.error('audit failed', e); }
}
export async function verifyAudit(env) {
  const { results } = await env.DB.prepare('SELECT * FROM audit_log ORDER BY id').all();
  const purged = results.filter((r) => r.action === 'retention_purge').reduce((m, r) => Math.max(m, Number(r.target) || 0), 0);
  const seqRow = await env.DB.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'audit_log'").first().catch(() => null);
  const bad = [], gaps = [];
  let prev = 0;
  for (const r of results) {
    const keyId = String(r.mac).split(':')[0];
    if (keyId === (await currentKey(env))?.id || keyId === 'none') {
      if (await macOf(env, r) !== r.mac) bad.push(r.id);
    }
    const from = Math.max(prev + 1, purged + 1);
    if (from <= r.id - 1) gaps.push([from, r.id - 1]);
    prev = r.id;
  }
  const lastId = results.length ? results[results.length - 1].id : 0;
  if (seqRow && seqRow.seq > lastId && seqRow.seq > purged) gaps.push([lastId + 1, seqRow.seq]);
  return { rows: results.length, tampered: bad, missing: gaps, ok: !bad.length && !gaps.length, purgedThrough: purged };
}

// ---------- bots and scrapers ----------
export const AI_BOTS = /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|Claude-User|Claude-SearchBot|anthropic-ai|CCBot|Google-Extended|GoogleOther|PerplexityBot|Perplexity-User|Bytespider|Applebot-Extended|Meta-ExternalAgent|Meta-ExternalFetcher|FacebookBot|Amazonbot|cohere-ai|cohere-training|Diffbot|ImagesiftBot|Omgili|omgilibot|Timpibot|YouBot|AI2Bot|Ai2Bot-Dolma|DuckAssistBot|Kangaroo Bot|PanguBot|Scrapy|python-requests|python-httpx|aiohttp|Go-http-client|node-fetch|axios|curl|Wget|HeadlessChrome|PhantomJS|Puppeteer|Playwright|Selenium|crawler|spider|scraper/i;
export function botVerdict(req, isApi) {
  const ua = req.headers.get('user-agent') || '';
  if (AI_BOTS.test(ua)) return 'ai_bot';
  if (isApi && !/Mozilla\//.test(ua)) return 'no_browser';
  return null;
}
export const ROBOTS_TXT = `# Nadu Wedding Planner: private planning app. No crawling, indexing or AI training.
User-agent: *
Disallow: /

${'GPTBot ChatGPT-User OAI-SearchBot ClaudeBot Claude-Web Claude-User Claude-SearchBot anthropic-ai CCBot Google-Extended GoogleOther PerplexityBot Perplexity-User Bytespider Applebot-Extended Meta-ExternalAgent Meta-ExternalFetcher FacebookBot Amazonbot cohere-ai cohere-training-data-crawler Diffbot ImagesiftBot Omgilibot Timpibot YouBot AI2Bot DuckAssistBot PanguBot'
  .split(' ').map((b) => `User-agent: ${b}\nDisallow: /`).join('\n\n')}
`;

// ---------- security headers ----------
export const CSP = [
  "default-src 'self'",
  "script-src 'self' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://challenges.cloudflare.com",
  'frame-src https://challenges.cloudflare.com',
  "frame-ancestors 'none'", "base-uri 'none'", "form-action 'self'", "object-src 'none'"
].join('; ');
export function withSecurityHeaders(res, { html = false } = {}) {
  const h = new Headers(res.headers);
  h.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
  h.set('x-content-type-options', 'nosniff');
  h.set('x-frame-options', 'DENY');
  h.set('referrer-policy', 'strict-origin-when-cross-origin');
  h.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  h.set('cross-origin-opener-policy', 'same-origin');
  h.set('x-robots-tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai');
  if (html || (h.get('content-type') || '').includes('text/html')) h.set('content-security-policy', CSP);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
