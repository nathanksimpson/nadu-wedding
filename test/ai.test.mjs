// Quote parser: cleaning and repairs on model output, without calling a model. Run: npm test.
// The fixture mirrors a real hotel rooftop quote (list vs offer columns, handwriting, FREE items, blank offers,
// pay-per-use drinks) with names and contact details removed.
import { cleanItems, buildRequest, toolArgs, SYSTEM } from '../src/ai.js';
let failed = 0;
const ok = (c, msg) => { if (!c) { console.error('FAIL', msg); failed++; } else console.log('ok', msg); };

// What a careful read of that quote should give.
const good = { items: [{
  howRead: 'Used the 제안사항 column; buffet replaces 양식코스; flowers 3,500,000 and total 26,000,000 are handwritten. 150,000×150 + 3,500,000 = 26,000,000.',
  dest: 'venue', nameKo: '호텔 OO 25층 루프탑', nameEn: 'Hotel OO Rooftop', priceLow: 26000000, priceHigh: 26000000,
  foodPerPerson: 150000, minGuests: 150, capMin: 150, capMax: 150,
  lines: [{ nameKo: '조화 꽃장식(디렉팅 포함)', nameEn: 'Artificial flowers', amount: 3500000 }],
  quoteTotal: 26000000, included: ['대관료', '신부대기실', '본식 영상중계', '동영상', '혼구용품(성혼선언문·방명록·펜·장갑·봉투)'],
  perks: ['예식 당일 프리미엄룸(조식 2인)', '웰컴드링크', '케이크 1단+샴페인', '차량서비스(헤어샵→호텔)', '웨딩 메뉴 시식 6인', '1주년 뷔페 2인+와인'],
  options: [{ nameKo: '잔치국수(1인)', amount: 5000 }, { nameKo: '카나페(트레이)', amount: 250000 }, { nameKo: '플라워샤워(4개)', amount: 66000 },
    { nameKo: '아티스트(애프터 파티)', amount: 3000000 }, { nameKo: '현악 3중주', amount: 1000000 }, { nameKo: '사회자', amount: 500000 }, { nameKo: '답례품(와인세트)', amount: 65000 }],
  perUse: [{ nameKo: '생맥주 20L 1통', amount: 350000 }, { nameKo: '와인 1병', amount: 35000 }, { nameKo: '음료수', amount: 5000 }, { nameKo: '소주', amount: 9000 }, { nameKo: '맥주', amount: 9000 }],
  deposit: '예약금 500만원, 보증금 총액의 30%', eventDate: '2027년 9~10월',
  conditions: '다음 주까지 · 블로그 후기 시 와인 20병 무료',
  summaryKo: '뷔페 15만원×보증 150명, 조화 꽃장식 350만원, 대관료·신부대기실·영상 무료', summaryEn: 'Buffet ₩150k × 150 guaranteed, flowers ₩3.5M; hall fee, bridal room, video free'
}] };
let [v] = cleanItems(good);
ok(v.dest === 'venue' && v.foodPerPerson === 150000 && v.minGuests === 150 && v.lines.length === 1, 'venue core fields kept');
ok(v.check && v.check.ok && v.check.computed === 26000000, 'meals × guests + fixed costs matches the quote total');
ok(v.included.length === 5 && v.options.length === 7 && v.perUse.length === 5 && v.perks.length === 6, 'included, options, pay-per-use and perks kept');
ok(v.howRead.startsWith('Used the 제안사항'), 'how-it-was-read note kept');

// The usual misreads: meal total as a line, FREE items at 0 as lines, list-price total, no guarantee count.
const bad = { items: [{ dest: 'venue', nameKo: '호텔 OO', nameEn: 'Hotel OO', priceLow: 0, foodPerPerson: 150000, minGuests: 0, capMax: 150,
  lines: [{ nameKo: '식사', amount: 22500000 }, { nameKo: '대관료', amount: 0 }, { nameKo: '조화 꽃장식', amount: 2500000 }],
  quoteTotal: 26000000, summaryKo: '', summaryEn: '' }] };
[v] = cleanItems(bad);
ok(v.minGuests === 150 && v.capMin === 150, 'missing guarantee count falls back to the seated capacity');
ok(v.lines.length === 1 && v.lines[0].nameKo === '조화 꽃장식', 'meal total dropped from fixed costs');
ok(v.included.includes('대관료'), 'a 0-won line becomes an included item');
ok(v.check && !v.check.ok && v.check.computed === 25000000, 'a misread (printed 2.5M instead of handwritten 3.5M) is flagged');
ok(v.priceLow === 26000000, 'price falls back to the written total');

// Personal data never survives cleaning into names; links must be http(s).
const req = buildRequest({ text: 'x', image: { mime: 'image/jpeg', data: 'AAAA' } });
ok(req.chat_template_kwargs.enable_thinking === true && req.messages[1].content[0].type === 'image_url', 'thinking on, image first');
ok(buildRequest({ text: 'x' }, { thinking: false }).chat_template_kwargs.enable_thinking === false, 'thinking can be switched off');
ok(/Handwriting overrides print/.test(SYSTEM) && /EMPTY offer cell/.test(SYSTEM) && /NEVER also put the meal total/.test(SYSTEM), 'prompt covers handwriting, blank offers and meal totals');
ok(toolArgs({ choices: [{ message: { content: 'thinking...\n{"items":[]}' } }] }).items.length === 0, 'JSON after thinking text is read');

// 스드메: a planner quote with a studio, a dress (shoot+ceremony vs ceremony only), two makeup levels and 추가금.
const sdmRaw = { items: [
  { dest: 'sdm', sdmCat: 'studios', nameKo: 'OO 스튜디오', nameEn: 'OO Studio', priceLow: 1200000, listPrice: 1800000, summaryKo: '리허설 촬영, 앨범 20p, 액자 1', summaryEn: 'Rehearsal shoot, 20p album, 1 frame',
    extras: [{ nameKo: '원본 데이터', nameEn: 'Original files', amount: 330000, likely: true }, { nameKo: '수정본 추가(장당)', amount: 20000, likely: false }, { nameKo: '무료', amount: 0, likely: true }] },
  { dest: 'sdm', sdmCat: 'dresses', nameKo: 'XX 드레스', nameEn: 'XX Dress', priceLow: 1600000, bonLow: 1100000, dressTags: ['im', 'zz'], summaryKo: '촬영 3벌, 본식 1벌', summaryEn: '3 for shoot, 1 for ceremony',
    extras: [{ nameKo: '피팅비', nameEn: 'Fitting fee', amount: 50000, likely: true }, { nameKo: '헬퍼비', nameEn: 'Helper', amount: 300000, likely: true }] },
  { dest: 'sdm', sdmCat: 'makeup', nameKo: '△△ 원장', nameEn: 'ㅁ Director', priceLow: 550000, priceLabel: '원장 55만', summaryKo: '', summaryEn: '' },
  { dest: 'sdm', sdmCat: 'studios', pkg: true, nameKo: 'A+B+C 패키지', nameEn: 'A+B+C package', priceLow: 2900000, summaryKo: '스드메 패키지', summaryEn: 'Package' },
  { dest: 'vendor', vendorCat: 'snap', nameKo: '모먼트 스냅', nameEn: 'Moment Snap', priceLow: 990000, summaryKo: '대표 1인', summaryEn: '1 lead photographer', extras: [{ nameKo: '원본 전체', amount: 220000, likely: true }] }
] };
const sdmItems = cleanItems(sdmRaw);
ok(sdmItems[0].withExtras === 1530000 && sdmItems[0].extras.length === 2, 'studio: likely 추가금 give a realistic price, 0-won extras dropped');
ok(sdmItems[1].bonLow === 1100000 && sdmItems[1].withExtras === 1950000 && sdmItems[1].dressTags.join() === 'im', 'dress: ceremony-only price, extras, tags kept');
ok(sdmItems[2].priceLabel === '원장 55만' && sdmItems[2].withExtras === 0, 'makeup: price label kept');
ok(sdmItems[3].pkg === true && sdmItems[4].withExtras === 1210000, 'package flag; snap extras counted');

// Cards built in the browser from those items.
import vm from 'node:vm';
import fs from 'node:fs';
globalThis.window = globalThis.window || {};
vm.runInThisContext(fs.readFileSync(new URL('../public/sdm.js', import.meta.url), 'utf8'));
vm.runInThisContext(fs.readFileSync(new URL('../public/parse.js', import.meta.url), 'utf8'));
const applied = window.NaduParse.applyItems({ sdmCatalog: {}, venues: [], vendors: [], loans: [], honsu: [] }, sdmItems, 'ko');
const cat = applied.state.sdmCatalog;
ok(cat.studios[0].lo === 120 && cat.studios[0].hi === 153 && /추가금 원본 데이터 33만/.test(cat.studios[0].lineKo), 'studio card: 120~153만 with 추가금 in its line');
ok(cat.dresses[0].blo === 110 && cat.dresses[0].hi === 195 && cat.dresses[0].tags[0] === 'im', 'dress card: 본식만 and extras');
ok(cat.makeup[0].label === '원장 55만' && cat.studios[1].total === true, 'makeup label; package studio marked as total');
ok(/추가금: 원본 전체 ₩220,000/.test(applied.state.vendors[0].memo), 'snap vendor memo lists the extras');
const hall = window.NaduParse.applyItems({ sdmCatalog: {}, venues: [], vendors: [], loans: [], honsu: [] }, cleanItems(good), 'ko').state.venues[0];
ok(hall.food === 150000 && hall.minGuests === 150 && hall.lines.length === 1 && /포함: 대관료/.test(hall.notes) && /사용량 결제: 생맥주/.test(hall.notes) && /선택 옵션: 잔치국수/.test(hall.notes), 'venue: notes keep included, pay-per-use and options');

if (failed) { console.error(`${failed} test(s) failed`); process.exit(1); }
console.log('all ai tests pass');
