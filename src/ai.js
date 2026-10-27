// Quote & offer parser (AI add-on). A couple pastes a vendor's quote or promo — text, a screenshot, or both —
// and a Cloudflare Workers AI model (the `AI` binding, no outside provider or API key) turns it into items for
// the plan's own sections. Nothing is saved here: the browser shows the items for review and adds the ones the
// couple keeps. The text and image are processed for this one request and not stored by Nadu.

export const DESTS = ['sdm', 'venue', 'vendor', 'loan', 'honsu'];
export const SDM_CATS = ['studios', 'dresses', 'tux', 'makeup', 'hair'];
export const TUX_KINDS = ['rtw', 'rent', 'custom'];
export const VENDOR_CATS = ['hall', 'sdm', 'snap', 'jewel', 'yedan', 'hanbok', 'attire', 'invite', 'honey', 'house', 'home', 'car', 'etc'];
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_TEXT = 12_000;
export const MAX_IMAGE_B64 = 6_500_000; // ≈ 4.8 MB image; the browser shrinks screenshots well below this
const MAX_ITEMS = 30;
// Free-plan model with vision, Korean and tool calling. Override with the AI_MODEL var.
export const DEFAULT_MODEL = '@cf/google/gemma-4-26b-a4b-it';

const str = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const won = (v) => { const x = Math.round(Number(v)); return Number.isFinite(x) && x > 0 ? Math.min(x, 5e10) : 0; };
const count = (v) => { const x = Math.round(Number(v)); return Number.isFinite(x) && x > 0 ? Math.min(x, 100_000) : 0; };
const oneOf = (v, list, d) => (list.includes(v) ? v : d);

const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    dest: { type: 'string', enum: DESTS, description: 'Which part of the planner this belongs in (see the system prompt).' },
    nameKo: { type: 'string', description: 'Short Korean name: vendor + product/package, e.g. "아벨로 클래식라인".' },
    nameEn: { type: 'string', description: 'Short English name, romanising the vendor, e.g. "Abello Classic Line".' },
    priceLow: { type: 'number', description: 'Price the couple would actually pay, in whole won (convert 만원 ×10,000). The offer/discounted price, not the list price. 0 if unknown.' },
    priceHigh: { type: 'number', description: 'Upper end in won if the price is a range or has paid upgrades; otherwise equal to priceLow.' },
    listPrice: { type: 'number', description: 'Regular price before the offer, in won, if shown; else 0.' },
    sdmCat: { type: 'string', enum: SDM_CATS, description: 'dest=sdm only: studios, dresses, tux (groom suits/tuxedos), makeup, hair (hair changes).' },
    tuxKind: { type: 'string', enum: TUX_KINDS, description: 'sdmCat=tux only: rtw ready-to-wear purchase, rent rental (+tailoring), custom bespoke/made-to-measure.' },
    vendorCat: { type: 'string', enum: VENDOR_CATS, description: 'dest=vendor only: hall, sdm, snap (ceremony photo/video), jewel, yedan, hanbok, attire, invite, honey (honeymoon), house, home (appliances/furniture), car, etc.' },
    foodPerPerson: { type: 'number', description: 'dest=venue only: meal price per guest in won.' },
    minGuests: { type: 'number', description: 'dest=venue only: minimum guaranteed guests (보증인원).' },
    capMin: { type: 'number', description: 'dest=venue only: smallest seated capacity.' },
    capMax: { type: 'number', description: 'dest=venue only: largest seated capacity.' },
    lines: {
      type: 'array', description: 'dest=venue only: fixed costs other than meals (대관료, 꽃장식, 연출 …).',
      items: { type: 'object', properties: { nameKo: { type: 'string' }, nameEn: { type: 'string' }, amount: { type: 'number' } }, required: ['nameKo', 'amount'] }
    },
    ratePct: { type: 'number', description: 'dest=loan only: annual interest rate in percent, e.g. 3.2.' },
    limit: { type: 'number', description: 'dest=loan only: maximum loan amount in won.' },
    summaryKo: { type: 'string', description: 'One Korean line (≤120 chars): what is included and the key price facts.' },
    summaryEn: { type: 'string', description: 'The same line in natural English (≤120 chars).' },
    conditions: { type: 'string', description: 'Conditions, deadlines or how to get the offer, in the post\'s language (≤200 chars). Empty if none.' },
    link: { type: 'string', description: 'An http(s) URL that appears in the input for this item, else empty.' }
  },
  required: ['dest', 'nameKo', 'nameEn', 'priceLow', 'summaryKo', 'summaryEn']
};
export const TOOL = {
  name: 'add_to_plan',
  description: 'Return every quote, package or offer found in the input as planner items.',
  input_schema: {
    type: 'object',
    properties: {
      items: { type: 'array', items: ITEM_SCHEMA },
      unreadable: { type: 'boolean', description: 'true if the input has no wedding quote or offer you can read.' }
    },
    required: ['items']
  }
};

export const SYSTEM = `You read Korean wedding-industry quotes, promotions and offers (often screenshots of Naver cafe posts,
KakaoTalk messages or vendor price sheets) and turn them into items for a couple's wedding & home budget planner.

Where each item goes (dest):
- sdm: a 스드메 vendor's product the couple picks one of — a photo studio (studios), wedding dress shop (dresses),
  groom's suit/tuxedo (tux), hair & makeup (makeup), or hair change add-on (hair). Set sdmCat; for tux set tuxKind.
- venue: a wedding hall quote with meal price per guest, guaranteed guests and hall fees.
- loan: a loan offer (전세대출 etc.) with rate and limit.
- honsu: one appliance or furniture product for the new home (냉장고, 세탁기, 소파 …), one item per product.
- vendor: any other quote to compare — ceremony snap/video, rings, hanbok, invitations, honeymoon packages, cars,
  or a 스드메 package bundle — with vendorCat set.

Rules:
- A post with several tiers or packages becomes one item per tier/package.
- All money in whole won. "60만 원" = 600000, "1억 2천" = 120000000. Use the price the couple would pay with the
  offer as priceLow; mention the regular price in the summary.
- Paid upgrades or options ("영국원단 시 추가 10만원") raise priceHigh; say so in the summary.
- Copy facts only. Never invent prices, names or links. Leave unknown numbers at 0.
- Leave out personal information about people (phone numbers, account numbers, ID numbers, addresses of private people).
- Summaries: plain, compact, no emoji, no marketing words.
- If nothing usable is in the input, return no items and unreadable=true.`;

// Turns the model's tool input into safe, bounded items. Unknown fields are dropped.
export function cleanItems(raw) {
  const list = Array.isArray(raw && raw.items) ? raw.items : [];
  const out = [];
  for (const r of list.slice(0, MAX_ITEMS)) {
    if (!r || typeof r !== 'object') continue;
    const dest = oneOf(r.dest, DESTS, 'vendor');
    const nameKo = str(r.nameKo, 60), nameEn = str(r.nameEn, 60);
    if (!nameKo && !nameEn) continue;
    const lo = won(r.priceLow), hi = Math.max(lo, won(r.priceHigh));
    const link = /^https?:\/\/[^\s"'<>]+$/i.test(str(r.link, 300)) ? str(r.link, 300) : '';
    const it = { dest, nameKo, nameEn, priceLow: lo, priceHigh: hi, listPrice: won(r.listPrice),
      summaryKo: str(r.summaryKo, 140), summaryEn: str(r.summaryEn, 140), conditions: str(r.conditions, 200), link };
    if (dest === 'sdm') {
      it.sdmCat = oneOf(r.sdmCat, SDM_CATS, 'studios');
      if (it.sdmCat === 'tux') it.tuxKind = oneOf(r.tuxKind, TUX_KINDS, 'custom');
    }
    if (dest === 'vendor') it.vendorCat = oneOf(r.vendorCat, VENDOR_CATS, 'etc');
    if (dest === 'venue') {
      Object.assign(it, { foodPerPerson: won(r.foodPerPerson), minGuests: count(r.minGuests), capMin: count(r.capMin), capMax: count(r.capMax) });
      it.lines = (Array.isArray(r.lines) ? r.lines : []).slice(0, 12)
        .map((l) => ({ nameKo: str(l && l.nameKo, 40), nameEn: str(l && l.nameEn, 40), amount: won(l && l.amount) }))
        .filter((l) => l.nameKo || l.nameEn);
    }
    if (dest === 'loan') { const p = Number(r.ratePct); it.ratePct = Number.isFinite(p) && p > 0 ? Math.min(Math.round(p * 100) / 100, 30) : 0; it.limit = won(r.limit); }
    out.push(it);
  }
  return out;
}

// Pulls the tool arguments out of either Workers AI response shape (OpenAI-style choices, or the older
// top-level tool_calls / response), falling back to JSON written in the reply text.
export function toolArgs(res) {
  const asObj = (a) => { if (a && typeof a === 'object') return a; try { return JSON.parse(a); } catch { return null; } };
  const msg = res && Array.isArray(res.choices) && res.choices[0] && res.choices[0].message;
  const calls = (msg && msg.tool_calls) || (res && res.tool_calls) || [];
  for (const c of calls) {
    const name = c.function ? c.function.name : c.name, args = c.function ? c.function.arguments : c.arguments;
    if (!name || name === TOOL.name) { const o = asObj(args); if (o) return o; }
  }
  let text = (msg && msg.content) || (res && res.response) || '';
  if (text && typeof text === 'object') return text.items ? text : null;
  text = String(text).replace(/^[\s\S]*?```(?:json)?/i, (m) => (m.includes('```') ? '' : m)).replace(/```[\s\S]*$/, '');
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  return a >= 0 && b > a ? asObj(text.slice(a, b + 1)) : null;
}

// Runs the model through the Workers AI binding. Returns { items, unreadable } or { error }.
export async function parseQuote(env, { text, image }) {
  if (!env.AI || typeof env.AI.run !== 'function') return { error: 'ai_not_configured' };
  const content = [{ type: 'text', text: text ? `Pasted text:\n${text}` : 'Read the quote or offer in this image.' }];
  if (image) content.unshift({ type: 'image_url', image_url: { url: `data:${image.mime};base64,${image.data}` } });
  let res;
  try {
    res = await env.AI.run(env.AI_MODEL || DEFAULT_MODEL, {
      messages: [{ role: 'system', content: SYSTEM + `\n\nAlways answer by calling ${TOOL.name}.` }, { role: 'user', content }],
      tools: [{ type: 'function', function: { name: TOOL.name, description: TOOL.description, parameters: TOOL.input_schema } }],
      tool_choice: 'required', max_tokens: 4000, temperature: 0.1,
      chat_template_kwargs: { enable_thinking: false }
    });
  } catch (e) {
    const m = String(e && e.message || e);
    console.error('workers-ai', m.slice(0, 300));
    // 3036/4006: daily free allocation used up; 3040/429: out of capacity
    if (/3036|4006|neuron|allocation/i.test(m)) return { error: 'ai_quota' };
    if (/3040|429|capacity|busy/i.test(m)) return { error: 'ai_busy' };
    return { error: 'ai_unavailable' };
  }
  const args = toolArgs(res);
  if (!args) return { error: 'ai_unavailable' };
  const items = cleanItems(args);
  return { items, unreadable: !items.length };
}
