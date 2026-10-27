// Runs the quote parser's exact prompt against real quotes with Cloudflare Workers AI, so prompt changes can be
// checked before deploying. Uses the Workers AI REST API (same model and request as the Worker).
//
//   CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… node scripts/ai-eval.mjs evals/hall.jpg evals/promo.txt
//   node scripts/ai-eval.mjs evals/hall.jpg --expect evals/hall.expect.json   # compare key numbers
//   options: --no-thinking  --model @cf/…  --json (print the cleaned items as JSON)
//
// Keep real quotes in evals/ (git-ignored): they contain names, phone numbers and account numbers.
// An expect file is a partial item, e.g. { "dest": "venue", "foodPerPerson": 150000, "minGuests": 150, "quoteTotal": 26000000 }
// (or an array of them, one per item); every field given must match.
import fs from 'node:fs';
import path from 'node:path';
import { buildRequest, toolArgs, cleanItems, DEFAULT_MODEL } from '../src/ai.js';

const args = process.argv.slice(2);
const flag = (f) => { const i = args.indexOf(f); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const has = (f) => { const i = args.indexOf(f); if (i < 0) return false; args.splice(i, 1); return true; };
const expectFile = flag('--expect'), model = flag('--model') || process.env.AI_MODEL || DEFAULT_MODEL;
const thinking = !has('--no-thinking'), asJson = has('--json');
const { CLOUDFLARE_ACCOUNT_ID: acct, CLOUDFLARE_API_TOKEN: token } = process.env;
if (!acct || !token || !args.length) {
  console.error('Usage: CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… node scripts/ai-eval.mjs <image|text file>… [--expect file.json] [--no-thinking] [--model id] [--json]');
  process.exit(2);
}
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const won = (n) => '₩' + Math.round(n || 0).toLocaleString('en-US');
let bad = 0;
for (const file of args) {
  const ext = path.extname(file).toLowerCase(), input = {};
  if (MIME[ext]) {
    const buf = fs.readFileSync(file);
    if (buf.length > 4.5e6) console.warn(`! ${file} is ${(buf.length / 1e6).toFixed(1)} MB; the app shrinks images to 1800px first, so results may differ`);
    input.image = { mime: MIME[ext], data: buf.toString('base64') };
  } else input.text = fs.readFileSync(file, 'utf8');
  const t0 = Date.now();
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/${model}`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(buildRequest(input, { thinking }))
  });
  const body = await r.json().catch(() => ({}));
  console.log(`\n=== ${file}  (${model}, thinking ${thinking ? 'on' : 'off'}, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  if (!r.ok || !body.success) { console.log('  request failed:', r.status, JSON.stringify(body.errors || body).slice(0, 400)); bad++; continue; }
  const raw = toolArgs(body.result);
  if (!raw) { console.log('  no tool call in the reply:', JSON.stringify(body.result).slice(0, 600)); bad++; continue; }
  const items = cleanItems(raw);
  const usage = body.result.usage; if (usage) console.log(`  tokens: ${usage.prompt_tokens} in / ${usage.completion_tokens} out`);
  if (asJson) console.log(JSON.stringify(items, null, 1));
  else for (const it of items) {
    console.log(`  [${it.dest}${it.sdmCat ? '/' + it.sdmCat : ''}${it.vendorCat ? '/' + it.vendorCat : ''}] ${it.nameKo} · ${won(it.priceLow)}${it.priceHigh > it.priceLow ? '–' + won(it.priceHigh) : ''}`);
    if (it.howRead) console.log(`    how: ${it.howRead}`);
    if (it.dest === 'venue') {
      console.log(`    meals ${won(it.foodPerPerson)} × ${it.minGuests} + fixed [${it.lines.map((l) => `${l.nameKo} ${won(l.amount)}`).join(', ')}]`);
      if (it.check) console.log(`    total check: computed ${won(it.check.computed)} vs quote ${won(it.check.total)} ${it.check.ok ? 'OK' : 'MISMATCH'}`);
      for (const k of ['included', 'perks']) if (it[k].length) console.log(`    ${k}: ${it[k].join(', ')}`);
      for (const k of ['options', 'perUse']) if (it[k].length) console.log(`    ${k}: ${it[k].map((l) => `${l.nameKo} ${won(l.amount)}`).join(', ')}`);
      for (const k of ['deposit', 'eventDate']) if (it[k]) console.log(`    ${k}: ${it[k]}`);
    }
    console.log(`    ${it.summaryKo}${it.conditions ? '  | 조건: ' + it.conditions : ''}`);
  }
  const exp = expectFile || (fs.existsSync(file.replace(/\.[^.]+$/, '.expect.json')) ? file.replace(/\.[^.]+$/, '.expect.json') : null);
  if (exp) {
    const want = [].concat(JSON.parse(fs.readFileSync(exp, 'utf8')));
    want.forEach((w, i) => {
      const got = items[i] || {};
      const miss = Object.entries(w).filter(([k, v]) => JSON.stringify(got[k]) !== JSON.stringify(v));
      if (miss.length) { bad++; console.log(`  ✗ item ${i + 1}: ` + miss.map(([k, v]) => `${k} expected ${JSON.stringify(v)} got ${JSON.stringify(got[k])}`).join('; ')); }
      else console.log(`  ✓ item ${i + 1} matches ${path.basename(exp)}`);
    });
  }
}
process.exit(bad ? 1 : 0);
