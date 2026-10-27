// Quote & offer parser (AI add-on). A couple pastes a vendor's quote or promo — text, a screenshot, or both —
// and a Cloudflare Workers AI model (the `AI` binding, no outside provider or API key) turns it into items for
// the plan's own sections. Nothing is saved here: the browser shows the items for review and adds the ones the
// couple keeps. The text and image are processed for this one request and not stored by Nadu.

export const DESTS = ['sdm', 'venue', 'vendor', 'loan', 'honsu'];
export const SDM_CATS = ['studios', 'dresses', 'tux', 'makeup', 'hair'];
export const TUX_KINDS = ['rtw', 'rent', 'custom'];
export const VENDOR_CATS = ['hall', 'sdm', 'snap', 'jewel', 'yedan', 'hanbok', 'attire', 'invite', 'honey', 'house', 'home', 'car', 'etc'];
export const DRESS_TAGS = ['si', 'bz', 'la', 'im', 'dm', 'mk'];
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

const NAME_AMOUNT = { type: 'object', properties: { nameKo: { type: 'string' }, nameEn: { type: 'string' }, amount: { type: 'number' } }, required: ['nameKo', 'amount'] };
const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    howRead: { type: 'string', description: 'FIRST, in one or two short English sentences: which price column you used, which handwritten changes, crossed-out rows or FREE items you applied, and how your numbers add up to the total. The couple sees this.' },
    dest: { type: 'string', enum: DESTS, description: 'Which part of the planner this belongs in (see the system prompt).' },
    nameKo: { type: 'string', description: 'Short Korean name: vendor + hall/product/package, e.g. "호텔 OO 루프탑" or "아벨로 클래식라인". Never a person\'s name.' },
    nameEn: { type: 'string', description: 'Short English name, romanising the vendor, e.g. "Hotel OO Rooftop".' },
    priceLow: { type: 'number', description: 'What the couple would actually pay, in whole won (convert 만원 ×10,000), using the offer/proposal price and handwritten corrections. For a venue: the quote\'s grand total. 0 if unknown.' },
    priceHigh: { type: 'number', description: 'Upper end in won if the price is a range or has paid upgrades; otherwise equal to priceLow.' },
    listPrice: { type: 'number', description: 'Regular price before the offer, in won, only if the document gives one for the same thing; else 0.' },
    sdmCat: { type: 'string', enum: SDM_CATS, description: 'dest=sdm only: studios, dresses, tux (groom suits/tuxedos), makeup, hair (hair changes).' },
    tuxKind: { type: 'string', enum: TUX_KINDS, description: 'sdmCat=tux only: rtw ready-to-wear purchase, rent rental (+tailoring), custom bespoke/made-to-measure.' },
    vendorCat: { type: 'string', enum: VENDOR_CATS, description: 'dest=vendor only: hall, sdm, snap (ceremony photo/video), jewel, yedan, hanbok, attire, invite, honey (honeymoon), house, home (appliances/furniture), car, etc.' },
    pkg: { type: 'boolean', description: 'dest=sdm, sdmCat=studios only: true when ONE price covers studio + dress + makeup (스드메 패키지/토탈).' },
    bonLow: { type: 'number', description: 'sdmCat=dresses only: ceremony-only price (본식만) in won when quoted separately from shoot+ceremony; else 0.' },
    bonHigh: { type: 'number', description: 'sdmCat=dresses only: upper end of the ceremony-only price; else equal to bonLow.' },
    dressTags: { type: 'array', items: { type: 'string', enum: DRESS_TAGS }, description: 'sdmCat=dresses only, if stated: si silk, bz beading, la lace, im imported (수입), dm Korean-made (국내), mk made to order (제작).' },
    priceLabel: { type: 'string', description: 'sdm only: the price exactly as written, short, e.g. "원장 55만" or "1회 15만".' },
    extras: { type: 'array', items: { type: 'object', properties: { nameKo: { type: 'string' }, nameEn: { type: 'string' }, amount: { type: 'number' }, likely: { type: 'boolean' } }, required: ['nameKo', 'amount', 'likely'] },
      description: 'sdm/vendor: 추가금 not in the base price, each with its amount in won (use the low end of a range). likely=true for fees almost every couple ends up paying (see the system prompt); false for upgrades.' },
    foodPerPerson: { type: 'number', description: 'dest=venue only: meal price PER GUEST in won (식대 단가), not the meal total.' },
    minGuests: { type: 'number', description: 'dest=venue only: guaranteed / minimum paid guests (보증인원, 지불보증인원, 최소보증).' },
    capMin: { type: 'number', description: 'dest=venue only: smallest seated capacity (착석, 세팅인원, 수용인원); 0 if not shown.' },
    capMax: { type: 'number', description: 'dest=venue only: largest seated capacity; 0 if not shown.' },
    lines: { type: 'array', items: NAME_AMOUNT, description: 'dest=venue only: fixed costs the couple pays OTHER THAN meals, at the offer price (꽃장식, 연출, 대관료 if charged …). Never the meal total, never FREE/서비스 items, never pay-per-use drinks, never options left blank in the offer.' },
    quoteTotal: { type: 'number', description: 'The grand total as written on the quote for the offer (handwriting wins), in won; 0 if none.' },
    included: { type: 'array', items: { type: 'string' }, description: 'Things included at no charge (FREE, 무료, 서비스, 포함, 제공), short Korean names, e.g. "대관료", "신부대기실", "혼구용품(방명록·펜·장갑)".' },
    perks: { type: 'array', items: { type: 'string' }, description: 'Benefits listed as 특전/혜택/서비스 (e.g. "예식 당일 프리미엄룸(조식 2인)", "웨딩 메뉴 시식 6인"). Short Korean.' },
    options: { type: 'array', items: NAME_AMOUNT, description: 'Paid extras NOT in the offer (offer cell blank, 선택, 옵션, 별도, 추가 시), each with its price in won (unit price if per guest/per item).' },
    perUse: { type: 'array', items: NAME_AMOUNT, description: 'Charged by actual use (사용량, 실비, 사용한 만큼, 소진 시): drinks and similar, with the unit price in won and the unit in nameKo, e.g. "생맥주 20L 1통".' },
    deposit: { type: 'string', description: 'Booking fee / deposit terms, e.g. "예약금 500만원, 계약금 총액의 30%". No account numbers.' },
    eventDate: { type: 'string', description: 'Wedding date or period the quote is for, as written, e.g. "2027년 9~10월".' },
    ratePct: { type: 'number', description: 'dest=loan only: annual interest rate in percent, e.g. 3.2.' },
    limit: { type: 'number', description: 'dest=loan only: maximum loan amount in won.' },
    summaryKo: { type: 'string', description: 'One Korean line (≤120 chars): the key facts a couple compares, e.g. "뷔페 15만원×보증 150명, 조화 꽃장식 350만원, 대관료·신부대기실 무료".' },
    summaryEn: { type: 'string', description: 'The same line in natural English (≤120 chars).' },
    conditions: { type: 'string', description: 'Conditions and deadlines (offer valid until, needs a blog review, weekday only …), short, in Korean. Empty if none.' },
    link: { type: 'string', description: 'An http(s) URL that appears in the input for this item, else empty.' }
  },
  required: ['howRead', 'dest', 'nameKo', 'nameEn', 'priceLow', 'summaryKo', 'summaryEn']
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

export const SYSTEM = `You read Korean wedding-industry quotes, contracts, promotions and offers — photos of printed
견적서/계약서 with handwriting, screenshots of Naver cafe posts, KakaoTalk messages, price sheets — and turn them into
items for a couple's wedding & home budget planner. Read carefully: these documents are dense and often marked up by hand.

## Where each item goes (dest)
- venue: a wedding hall / hotel quote (예식장, 웨딩홀, 호텔, 컨벤션, 하우스웨딩). ONE item per hall or per package option.
- sdm: a 스드메 vendor's product the couple picks one of — photo studio (studios), wedding dress (dresses), groom's
  suit/tuxedo (tux, set tuxKind), hair & makeup (makeup), hair change add-on (hair). Set sdmCat.
- vendor: any other quote to compare — ceremony snap/video, rings, hanbok, invitations, honeymoon, cars, or a 스드메
  package bundle — with vendorCat.
- loan: a loan offer (전세대출 …) with ratePct and limit.
- honsu: one appliance or furniture product for the new home, one item per product.

## How to read a Korean quote
1. Find the column that is the offer. Quotes often show 정가/기본사항/기본가 (list) next to 제안사항/할인가/특가/혜택가/
   최종/네고 (offer), often boxed or in red. Every number you return comes from the OFFER column. List prices only
   go in listPrice or explain an option's price.
2. Handwriting overrides print. A handwritten number written over or next to a printed one replaces it (e.g. a printed
   2,500,000 overwritten with a 3 means 3,500,000; a total 25,000,000 overwritten with a 6 means 26,000,000). A
   handwritten word replacing a crossed-out one changes the item (e.g. "양식코스" struck through with "뷔페" written
   beside it means the meal is a buffet).
3. Crossed-out rows or sections (strikethrough, an X over the label) are removed from the deal. Ignore their prices.
4. "FREE", 무료, 서비스, 포함, 제공, 0원 in the offer column = included at no charge → put in included, not lines.
5. A row with a list price but an EMPTY offer cell is not part of the deal → options (with the list price), not lines.
   Rows marked 선택/옵션/별도/추가 시 are options too.
6. 사용량, 실비, 사용한 만큼, 소진 시, 병당/통당/잔당 = pay as you use (drinks, etc.) → perUse with the unit price. These
   are not fixed costs and are not in the total.
7. Meals: 식대/식사 단가 × 인원 = meal total. Return the per-guest price as foodPerPerson and the guaranteed count as
   minGuests. NEVER also put the meal total in lines — the planner multiplies it itself.
8. Guest counts: 보증인원/지불보증인원/최소보증 → minGuests. 세팅인원/착석/수용 → capacity (capMin/capMax; a single number
   goes in both).
9. Check your arithmetic: foodPerPerson × minGuests + sum(lines) should equal the written grand total (quoteTotal).
   If it doesn't, re-read the offer column and the handwriting before answering, and say what differs in howRead.
10. 특전/혜택 lists → perks. 예약금/계약금/보증금 → deposit (terms only). Dates (예식일시, 27년 = 2027년) → eventDate.
    Handwritten deadlines ("~다음주까지", "이번 달 계약 시") and conditions ("블로그 후기 시 와인 20병 무료") → conditions.
11. A post with several tiers or packages becomes one item per tier/package.
12. Money is whole won. "60만 원" = 600000, "350만" = 3500000, "1억 2천" = 120000000, "15만/인" = 150000 per guest.

## 스드메 (studio, dress, makeup) quotes
Planner or 박람회 quotes, shop price sheets and cafe posts. The base price is rarely what couples pay, so 추가금 matter most.
1. Use the offer price (특가, 박람회가, 플래너가, 혜택가, 할인가); the 정가 goes in listPrice.
2. One price for studio + dress + makeup together (스드메 패키지, 토탈) → ONE item: sdmCat=studios, pkg=true, nameKo
   naming all three shops (e.g. "A스튜디오+B드레스+C메이크업"). Separate prices per shop → one item per shop and option
   (each studio, each dress shop, each makeup artist level), with its own sdmCat.
3. Studios: put what you get in the summary — 촬영 시간/컷 수, 앨범 페이지·권수, 액자, 수정본 개수, 원본 포함 여부.
4. Dresses: price for 촬영+본식 → priceLow/priceHigh; 본식만 price → bonLow/bonHigh. Mention 벌 수 (촬영 n벌, 본식 n벌)
   and 수입/국내 라인 in the summary; dressTags if stated.
5. Makeup: different prices per artist level (원장, 부원장, 실장, 팀장) → one item per level, named "<shop> 원장" etc.
   Never include an artist's personal name. 혼주 메이크업 is an extra, not the main price.
6. Hair changes (헤어변형): sdmCat=hair, the price per change; mention 1회/2회.
7. 추가금 → extras with amounts. likely=true for the ones nearly every couple pays: 원본 데이터/원본 구매, 수정본 추가
   when few are included, 드레스 피팅비, 헬퍼(이모님)비, 얼리스타트 (if the ceremony time triggers it), 지정비 when the base
   price assumes no chosen artist, 출장비 when the venue is outside the shop's area. likely=false for upgrades: 앨범·액자
   추가, 수입 드레스 업그레이드, 야외 촬영, 혼주 메이크업, 턱시도 대여, 부케.
8. Groom suits (tux): see sdmCat tux and tuxKind; shirts, shoes and alterations not included → extras.

## Snap and video (본식 스냅, 본식 DVD, 영상) quotes
dest=vendor, vendorCat=snap, one item per package. Summary: 작가 수와 등급 (대표/실장), 촬영 시간, 원본·보정본 개수, 앨범.
추가금 (원본 전체, 2인 작가, 앨범 추가, 출장비, 혼주 원판) → extras with likely as above.

## Never copy
Names of the couple or staff, phone numbers, emails, bank names with account numbers (계좌), ID numbers, home addresses.
The venue's own name and branch are fine.

## Style
Summaries plain and compact, no emoji, no marketing words. Copy facts only: never invent prices, names or links;
leave unknown numbers at 0. If nothing usable is in the input, return no items and unreadable=true.

## Example
Input (a hall quote, offer column on the right, handwriting in [brackets]):
  식대  한식코스 [crossed out, "뷔페" written]   200명   정가 70,000   제안 [handwritten 62,000]   12,400,000
  대관료                                   정가 2,000,000   제안 FREE
  꽃장식 생화                               정가 3,000,000   제안 2,500,000
  사회자                                   정가 400,000     제안 (blank)
  주류 (사용량)  맥주                       정가 6,000       제안 5,000
  보증인원 200명 · 합계(제안) 14,900,000 · 예약금 300만원 · [이번 주 계약 시]
Output item:
  { "howRead": "Used the 제안 column; buffet replaces the crossed-out course; meal 62,000 handwritten. 62,000×200 + 2,500,000 = 14,900,000 matches the total.",
    "dest": "venue", "nameKo": "OO웨딩홀", "nameEn": "OO Wedding Hall", "priceLow": 14900000, "priceHigh": 14900000,
    "foodPerPerson": 62000, "minGuests": 200, "lines": [{ "nameKo": "생화 꽃장식", "nameEn": "Fresh flowers", "amount": 2500000 }],
    "quoteTotal": 14900000, "included": ["대관료"], "options": [{ "nameKo": "사회자", "nameEn": "MC", "amount": 400000 }],
    "perUse": [{ "nameKo": "맥주 1병", "nameEn": "Beer per bottle", "amount": 5000 }], "deposit": "예약금 300만원",
    "conditions": "이번 주 계약 시", "summaryKo": "뷔페 6.2만원×보증 200명, 생화 꽃장식 250만원, 대관료 무료",
    "summaryEn": "Buffet ₩62k × 200 guaranteed, fresh flowers ₩2.5M, hall fee free" }

## Example 2
Input (a planner's 스드메 quote): "스튜디오 OO 리허설 촬영 (앨범 20p, 액자 1) 정가 180 → 박람회 특가 120만 / 드레스 XX 촬영+본식 160만,
본식만 110만 / 메이크업 △△ 원장 55만, 실장 45만 / 추가금: 원본 33만, 수정본 추가 장당 2만, 드레스 피팅비 5만, 헬퍼비 30만,
얼리스타트 7시 이전 5만"
Output items (abbreviated):
  { "dest": "sdm", "sdmCat": "studios", "nameKo": "OO 스튜디오", "priceLow": 1200000, "listPrice": 1800000,
    "extras": [{ "nameKo": "원본 데이터", "amount": 330000, "likely": true }, { "nameKo": "수정본 추가(장당)", "amount": 20000, "likely": false }] }
  { "dest": "sdm", "sdmCat": "dresses", "nameKo": "XX 드레스", "priceLow": 1600000, "bonLow": 1100000,
    "extras": [{ "nameKo": "피팅비", "amount": 50000, "likely": true }, { "nameKo": "헬퍼비", "amount": 300000, "likely": true }] }
  { "dest": "sdm", "sdmCat": "makeup", "nameKo": "△△ 원장", "priceLow": 550000, "priceLabel": "원장 55만",
    "extras": [{ "nameKo": "얼리스타트(7시 이전)", "amount": 50000, "likely": false }] }
  { "dest": "sdm", "sdmCat": "makeup", "nameKo": "△△ 실장", "priceLow": 450000, "priceLabel": "실장 45만" }`;

const namedAmounts = (list, n = 15) => (Array.isArray(list) ? list : []).slice(0, n)
  .map((l) => ({ nameKo: str(l && l.nameKo, 40), nameEn: str(l && l.nameEn, 40), amount: won(l && l.amount) }))
  .filter((l) => l.nameKo || l.nameEn);
const strings = (list, n = 15) => (Array.isArray(list) ? list : []).slice(0, n).map((x) => str(x, 60)).filter(Boolean);
// Venue fields, plus two repairs for the commonest misreads: the meal total listed as a fixed cost, and free items
// listed at 0 as fixed costs. Then a total check the couple sees: meals × guaranteed guests + fixed costs vs the quote.
function venueFields(it, r) {
  Object.assign(it, { foodPerPerson: won(r.foodPerPerson), minGuests: count(r.minGuests), capMin: count(r.capMin), capMax: count(r.capMax) });
  if (it.capMax && !it.capMin) it.capMin = it.capMax;
  if (it.capMin && !it.capMax) it.capMax = it.capMin;
  if (!it.minGuests && it.capMin) it.minGuests = it.capMin;
  const meals = it.foodPerPerson * it.minGuests;
  it.included = strings(r.included); it.perks = strings(r.perks, 12);
  it.options = namedAmounts(r.options); it.perUse = namedAmounts(r.perUse, 12);
  it.lines = namedAmounts(r.lines, 12).filter((l) => {
    if (meals && Math.abs(l.amount - meals) <= 1000) return false; // meal total repeated as a line
    // A FREE item listed at 0 belongs in included.
    if (!l.amount) { if (!it.included.includes(l.nameKo || l.nameEn)) it.included.push(l.nameKo || l.nameEn); return false; }
    return true;
  });
  it.deposit = str(r.deposit, 120); it.eventDate = str(r.eventDate, 40);
  it.quoteTotal = won(r.quoteTotal);
  const computed = meals + it.lines.reduce((a, l) => a + l.amount, 0);
  if (!it.priceLow) it.priceLow = it.quoteTotal || computed;
  if (it.priceHigh < it.priceLow) it.priceHigh = it.priceLow;
  // Matches within 1% (rounding on printed quotes); otherwise the couple is told to check the numbers.
  it.check = it.quoteTotal && computed ? { total: it.quoteTotal, computed, ok: Math.abs(computed - it.quoteTotal) <= it.quoteTotal * 0.01 } : null;
}

// 추가금: kept with their amounts; the likely ones give a realistic price (withExtras) the couple sees and the
// 스드메 card's upper price uses, since base prices alone understate what couples pay.
function extrasFields(it, r) {
  it.extras = (Array.isArray(r.extras) ? r.extras : []).slice(0, 15)
    .map((x) => ({ nameKo: str(x && x.nameKo, 40), nameEn: str(x && x.nameEn, 40), amount: won(x && x.amount), likely: !!(x && x.likely) }))
    .filter((x) => (x.nameKo || x.nameEn) && x.amount);
  const likely = it.extras.filter((x) => x.likely).reduce((a, x) => a + x.amount, 0);
  it.withExtras = it.priceLow && likely ? it.priceLow + likely : 0;
}

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
    const it = { dest, nameKo, nameEn, priceLow: lo, priceHigh: hi, listPrice: won(r.listPrice), howRead: str(r.howRead, 300),
      summaryKo: str(r.summaryKo, 140), summaryEn: str(r.summaryEn, 140), conditions: str(r.conditions, 200), link };
    if (dest === 'sdm') {
      it.sdmCat = oneOf(r.sdmCat, SDM_CATS, 'studios');
      if (it.sdmCat === 'tux') it.tuxKind = oneOf(r.tuxKind, TUX_KINDS, 'custom');
      if (it.sdmCat === 'studios') it.pkg = r.pkg === true;
      if (it.sdmCat === 'dresses') {
        it.bonLow = won(r.bonLow); it.bonHigh = Math.max(it.bonLow, won(r.bonHigh));
        it.dressTags = (Array.isArray(r.dressTags) ? r.dressTags : []).filter((t) => DRESS_TAGS.includes(t)).slice(0, 6);
      }
      it.priceLabel = str(r.priceLabel, 40);
    }
    if (dest === 'vendor') it.vendorCat = oneOf(r.vendorCat, VENDOR_CATS, 'etc');
    if (dest === 'sdm' || dest === 'vendor') extrasFields(it, r);
    if (dest === 'venue') venueFields(it, r);
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

// The model request, shared by the Worker and scripts/ai-eval.mjs. Thinking (step-by-step reading before the
// tool call) is on by default because quote tables are dense; set AI_THINKING=off to save Neurons.
export function buildRequest({ text, image }, { thinking = true } = {}) {
  const content = [{ type: 'text', text: text ? `Pasted text:\n${text}` : 'Read the quote or offer in this image.' }];
  if (image) content.unshift({ type: 'image_url', image_url: { url: `data:${image.mime};base64,${image.data}` } });
  return {
    messages: [{ role: 'system', content: SYSTEM + `\n\nAlways answer by calling ${TOOL.name}.` }, { role: 'user', content }],
    tools: [{ type: 'function', function: { name: TOOL.name, description: TOOL.description, parameters: TOOL.input_schema } }],
    tool_choice: 'required', max_tokens: thinking ? 12000 : 5000, temperature: 0.1,
    chat_template_kwargs: { enable_thinking: !!thinking }
  };
}
const aiError = (e) => {
  const m = String(e && e.message || e);
  console.error('workers-ai', m.slice(0, 300));
  // 3036/4006: daily free allocation used up; 3040/429: out of capacity
  if (/3036|4006|neuron|allocation/i.test(m)) return 'ai_quota';
  if (/3040|429|capacity|busy/i.test(m)) return 'ai_busy';
  return 'ai_unavailable';
};

// Runs the model through the Workers AI binding. Returns { items, unreadable } or { error }.
// If a thinking run returns no usable tool call, it tries once more without thinking.
export async function parseQuote(env, input) {
  if (!env.AI || typeof env.AI.run !== 'function') return { error: 'ai_not_configured' };
  const model = env.AI_MODEL || DEFAULT_MODEL, thinking = String(env.AI_THINKING || 'on') !== 'off';
  let args = null;
  for (const t of thinking ? [true, false] : [false]) {
    try { args = toolArgs(await env.AI.run(model, buildRequest(input, { thinking: t }))); } catch (e) { return { error: aiError(e) }; }
    if (args) break;
  }
  if (!args) return { error: 'ai_unavailable' };
  const items = cleanItems(args);
  return { items, unreadable: !items.length };
}
