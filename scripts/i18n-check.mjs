// Reports what each language file in public/i18n/ is missing compared with English.
//   node scripts/i18n-check.mjs        (exit code 1 if anything user-facing is missing)
// Admin-only screens stay Korean/English on purpose (keys starting with sec/bk/au/nt/ad, plus retired keys).
import fs from 'node:fs';
const root = new URL('../public/', import.meta.url);
const app = fs.readFileSync(new URL('app.js', root), 'utf8'), sdm = fs.readFileSync(new URL('sdm.js', root), 'utf8');
const grab = (src, from) => { let d = 0, a = src.indexOf('{', from), b = a; for (; b < src.length; b++) { if (src[b] === '{') d++; else if (src[b] === '}') { d--; if (!d) break; } } return src.slice(a, b + 1); };
const L = eval('(' + grab(app, app.indexOf('const L = {')) + ')');
for (const m of app.matchAll(/Object\.assign\(L\.en, \{/g)) Object.assign(L.en, eval('(' + grab(app, m.index + m[0].length - 1) + ')'));
const STRen = eval('(' + grab(sdm, sdm.indexOf('en: {', sdm.indexOf('const STR'))) + ')');
const data = new Set();
for (const src of [app, sdm]) {
  for (const m of src.matchAll(/'([^'\n]*[가-힣][^'\n]*)',\s*'([^'\n가-힣]*[A-Za-z][^'\n]*)'/g)) data.add(m[2]);
  for (const m of src.matchAll(/ko: '([^'\n]+)',\s*en: '([^'\n]+)'/g)) data.add(m[2]);
  for (const m of src.matchAll(/labelEn: '([^'\n]+)'/g)) data.add(m[1]);
}
const uiStrings = new Set(); const walk = (v) => { if (typeof v === 'string') uiStrings.add(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
walk(L.en); walk(STRen);
const dataList = [...data].filter((s) => !uiStrings.has(s) && s.length > 1 && !/^[a-z]{2}-[A-Z]{2}$/.test(s));
const SKIP = /^(sec|bk|au|nt|ad)[A-Z0-9]|^(gUser|gDisplay|gInvite|gAgree|gPrivacy|privacyText|appName|appNameKo|exBackup)$/;
const deepMissing = (en, tr, path = '') => {
  const out = [];
  for (const [k, v] of Object.entries(en)) {
    if (!path && SKIP.test(k)) continue;
    if (!(k in (tr || {}))) { out.push(path + k); continue; }
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof v !== 'function') out.push(...deepMissing(v, tr[k], path + k + '.'));
  }
  return out;
};
globalThis.window = {};
let bad = 0;
for (const f of fs.readdirSync(new URL('i18n/', root)).filter((x) => x.endsWith('.js'))) {
  eval(fs.readFileSync(new URL('i18n/' + f, root), 'utf8'));
  const code = f.replace('.js', ''), pack = window.NaduI18n[code];
  const ui = deepMissing(L.en, pack.ui).filter((k) => !/^gErr\.(admin_2fa_required|reason_required|weak_passphrase|no_setup|no_key|must_agree)$/.test(k));
  const sd = deepMissing(STRen, pack.sdm).filter((k) => k !== 'man');
  const dt = dataList.filter((s) => !(s in (pack.data || {})));
  const fnOk = Object.entries(pack.ui).every(([k, v]) => typeof L.en[k] !== 'function' || typeof v === 'function');
  console.log(`${code}: ui missing ${ui.length}, sdm missing ${sd.length}, content missing ${dt.length}${fnOk ? '' : ', a function key is not a function'}`);
  if (ui.length) console.log('  ui:', ui.join(', '));
  if (sd.length) console.log('  sdm:', sd.join(', '));
  if (dt.length) console.log('  content:', dt.join(' | '));
  bad += ui.length + sd.length + dt.length + (fnOk ? 0 : 1);
}
process.exit(bad ? 1 : 0);
