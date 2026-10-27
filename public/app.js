// Nadu Wedding Planner — page script (kept out of index.html so a strict Content-Security-Policy can forbid inline scripts).
(function () {
  const KEY = 'wedding-planner-v2';
  const uid = () => Math.random().toString(36).slice(2, 9);
  const $ = (id) => document.getElementById(id);

  // ---------- strings ----------
  const L = {
    ko: {
      title: '결혼·신혼집 예산 플래너', lede: '숫자를 고치면 모든 옵션이 보유 현금 기준으로 다시 계산됩니다. 변경 내용은 이 브라우저에만 저장됩니다. 초기값은 현재 견적과 추정치입니다.',
      report: '인쇄용 보고서', skinStd: '기본', skinBright: '밝게', repOptVenues: '포함할 옵션', repOptSections: '포함할 항목', io: '가져오기·내보내기', reset: '초기화', resetConfirm: '정말 초기화?',
      ioTitle: '데이터 가져오기·내보내기', ioHelp: '이 JSON을 복사해 백업하거나 다른 브라우저로 옮기세요. 저장해 둔 계획을 붙여넣고 불러오기를 누르면 현재 계획을 대체합니다. 스드메 업체 목록 파일은 대체하지 않고 업체만 더해요.', listingsLoaded: (a, u) => `업체 ${a}곳 추가` + (u ? `, ${u}곳 업데이트` : ''), listingsNone: '목록 파일에 업체가 없어요.',
      copy: '복사', load: '붙여넣은 계획 불러오기', openFile: '또는 .json 파일 열기:', dzJson: '.json 파일을 여기로 끌어다 놓거나 눌러서 고르세요', dzJsonHint: '내보낸 계획 파일(대체) 또는 업체 목록 파일(추가)',
      secInputs: '예산 기준', krw: '모든 금액 단위: 원', tierLabel: '비교에 쓸 축의금 시나리오',
      cash: '보유 현금 (총예산)', deposit: '전세 보증금', loan: '대출 희망액', down: '자기자금', guests: '예상 하객 수',
      g0: '축의금/인 · 보수', g1: '축의금/인 · 현실', g2: '축의금/인 · 높음', brokerRate: '중개보수율 (%)', vat: '중개보수에 부가세 10% 포함',
      tiers: ['보수', '현실', '높음'],
      secOverview: '한눈에 비교', chartTitle: '옵션별 예산 구성',
      chartHelp: '막대는 각 옵션의 지출 구성입니다. 점선은 보유 현금, 점 표시는 축의금을 더한 금액입니다. 빗금은 부족분입니다.',
      segDown: '전세 자기자금', segFixed: '예식장 고정비', segFood: '식대', segNv: '기타 결혼비용', segMove: '입주비·비상금', segLeft: '최종 잔액', segShort: '부족분',
      mkCash: '보유 현금', mkGift: '현금 + 축의금',
      availStat: '자기자금 후 결혼 가용 현금', bestStat: '최적 옵션', honsuStat: '혼수 후 잔액 (최적)', loanStat: '월 대출 이자', noFit: '맞는 옵션 없음', notElig: '자격 없음',
      colPick: '선택', colVenue: '예식장', colStatus: '상태', colVenueCost: '예식장 비용', colTotal: '결혼 총액', colGifts: '축의금', colNet: '순비용', colSurplus: '결혼 후 잔액', colHonsu: '혼수 가용',
      excluded: '제외', best: '최적', fits: '가능', cap: '수용 인원', noQuote: '견적 없음', over: '예산 초과', shortMove: '입주비 부족', unused: '미사용 식대',
      secWalk: '현금 흐름', wCash: '보유 현금', wDown: '전세 자기자금', wDownGap: '전세 자기자금 (한도 초과분 포함)', wWedding: '결혼 총비용', wGifts: '축의금', wAfter: '결혼 후 잔액', wBroker: '중개보수', wHonsu: '혼수 가용액', noVenue: '예식장 옵션을 추가하면 현금 흐름이 보입니다.',
      secVenues: '예식장 옵션', addOption: '+ 옵션 추가', mealPer: '식대/인', minG: '최소 보증 인원', capMin: '수용 최소', capMax: '수용 최대', noLimit: '제한 없음', fixedFees: '고정 비용', notes: '메모',
      addFee: '+ 비용 항목', duplicate: '복제', showFlow: '현금 흐름 보기', include: '비교 포함', del: '삭제?', copySuffix: ' (사본)',
      fFixed: '고정', fMeals: '식대', fVenue: '예식장 합계', fSurplus: '잔액', people: '명',
      secShared: '모든 옵션 공통 비용', nvTitle: '예식장 외 결혼 비용', acTitle: '입주 비용·비상금', acHelp: '중개보수는 예산 기준의 보증금과 요율로 자동 계산됩니다. 이 항목들을 뺀 나머지가 혼수 예산입니다.',
      ebTitle: '추가 예산 항목', ebHelp: '부모님 지원, 결혼 전까지 모을 저축처럼 현금을 늘리거나, 따로 떼어둘 돈을 빼세요.', addBudget: '+ 예산 항목 추가', ebAdd: '현금에 더하기', ebSub: '현금에서 빼기', cashTotal: '총 가용 현금', ebPh: '예: 부모님 지원',
      addCategory: '+ 카테고리 추가', newCategory: '새 카테고리', catType: '계산 위치', typeWedding: '결혼 비용 (축의금 전)', typeMove: '입주 비용 (혼수 전)', delCategory: '카테고리 삭제',
      foldLabel: '접기/펼치기', nOptions: (k) => `옵션 ${k}개`, monthlyShort: '월',
      hsTitle: '혼수 (가전·가구)', hsHelp: "집에 옵션으로 있는 품목은 '옵션 제공'에 체크하면 합계에서 빠집니다. 초기 금액은 대략적인 추정치이니 실제 견적으로 바꾸세요.", provided: '옵션 제공', hsBuy: '구매 합계', hsSaved: '옵션으로 절약', segHonsu: '혼수 구매', colFinal: '혼수 후 잔액', wHonsuBuy: '혼수 구매', wFinal: '최종 잔액', shortHonsu: '혼수 부족',
      broker: '중개보수 (자동)', addItem: '+ 항목 추가', total: '합계', itemPh: '항목명',
      secLoans: '전세대출 옵션', addLoan: '+ 대출 추가', colUse: '사용', colProduct: '상품', colElig: '자격', colRate: '금리 %', colLimit: '한도', colMonthly: '월 이자', col2y: '2년 이자', colNotes: '비고',
      yes: '가능', no: '불가', loanHelp: '예산 기준의 대출액에 대한 이자만 계산합니다(상품 한도 적용). 한도가 대출액보다 작으면 차액은 자기자금에 더해집니다.',
      newVenue: '새 예식장', newLoan: '새 대출', newFee: '대관',
      printHelp: '인쇄 버튼이나 Ctrl/⌘+P로 이 보고서만 인쇄하거나 PDF로 저장할 수 있어요.', copyReport: '보고서 복사', closeReport: '편집으로 돌아가기',
      repTitle: '결혼·신혼집 예산 보고서', repAsOf: '작성일', repInputs: '예산 기준', repChart: '옵션별 예산 구성', repCompare: '옵션 비교', repDetail: '옵션별 상세', repLoans: '전세대출', repWalk: '현금 흐름', repShared: '공통 비용',
      dGuests: '청구 인원', dNetBy: '축의금 시나리오별 잔액', dSum: '예식장 합계', dWedding: '결혼 총액',
      copied: '복사됨', selected: '선택됨. Ctrl/⌘+C로 복사하세요', badJson: '저장된 계획 형식이 아닙니다.', readFail: 'JSON을 읽을 수 없습니다. 전체가 복사됐는지 확인하세요.', loaded: '계획을 불러왔습니다', resetDone: '초기값으로 되돌렸습니다', fileFail: '파일을 읽을 수 없습니다.'
    },
    en: {
      title: 'Wedding & home budget planner', lede: 'Edit any figure and every option re-scores against your cash. Changes save in this browser only. Starting figures are your current quotes and estimates.',
      report: 'Printable report', skinStd: 'Standard', skinBright: 'Bright', repOptVenues: 'Options to include', repOptSections: 'Sections to include', io: 'Import / export', reset: 'Reset', resetConfirm: 'Confirm reset',
      ioTitle: 'Import / export', ioHelp: 'Copy this JSON to back up your plan or move it to another browser. Paste a saved plan and press Load to replace the current one. A 스드메 listings file is different: it only adds listings.', listingsLoaded: (a, u) => `Added ${a} listing${a === 1 ? '' : 's'}` + (u ? `, updated ${u}` : ''), listingsNone: 'That listings file has no listings in it.',
      copy: 'Copy', load: 'Load pasted plan', openFile: 'or open a .json file:', dzJson: 'Drop a .json file here, or click to choose one', dzJsonHint: 'An exported plan (replaces) or a listings file (adds)',
      secInputs: 'Budget inputs', krw: 'All amounts in KRW (원)', tierLabel: 'Gift scenario used for comparison',
      cash: 'Total cash budget', deposit: 'Jeonse deposit', loan: 'Loan amount', down: 'Cash down payment', guests: 'Expected guests',
      g0: 'Gift per guest · low', g1: 'Gift per guest · realistic', g2: 'Gift per guest · high', brokerRate: 'Brokerage rate (%)', vat: 'Add 10% VAT to brokerage',
      tiers: ['Low', 'Realistic', 'High'],
      secOverview: 'Overview', chartTitle: 'Budget breakdown by option',
      chartHelp: 'Each bar shows where an option sends the money. The dashed line is your cash; the dotted line adds gift money. Hatching is a shortfall.',
      segDown: 'Jeonse down payment', segFixed: 'Venue fixed fees', segFood: 'Meals', segNv: 'Other wedding costs', segMove: 'Move-in & buffer', segLeft: 'Left over', segShort: 'Shortfall',
      mkCash: 'Cash', mkGift: 'Cash + gifts',
      availStat: 'Cash for the wedding after down payment', bestStat: 'Best option', honsuStat: 'Left after 혼수, best option', loanStat: 'Monthly loan interest', noFit: 'No option fits', notElig: 'not eligible',
      colPick: 'Pick', colVenue: 'Venue', colStatus: 'Status', colVenueCost: 'Venue cost', colTotal: 'Wedding total', colGifts: 'Gifts', colNet: 'Net cost', colSurplus: 'Left after wedding', colHonsu: 'For 혼수',
      excluded: 'Excluded', best: 'Best', fits: 'Fits', cap: 'Capacity', noQuote: 'No quote yet', over: 'Over budget', shortMove: 'Short for move-in', unused: 'Unused meals',
      secWalk: 'Where the cash goes', wCash: 'Total cash', wDown: 'Jeonse down payment', wDownGap: 'Jeonse down payment (incl. loan-limit gap)', wWedding: 'Wedding total', wGifts: 'Gift money', wAfter: 'Left after wedding', wBroker: 'Brokerage', wHonsu: 'Left for 혼수', noVenue: 'Add a venue option to see the cash flow.',
      secVenues: 'Venue options', addOption: '+ Add option', mealPer: 'Meal per guest', minG: 'Min. guarantee', capMin: 'Capacity min', capMax: 'Capacity max', noLimit: 'no limit', fixedFees: 'Fixed fees', notes: 'Notes',
      addFee: '+ Add fee', duplicate: 'Duplicate', showFlow: 'Show cash flow', include: 'Include', del: 'Delete?', copySuffix: ' (copy)',
      fFixed: 'Fixed', fMeals: 'Meals', fVenue: 'Venue total', fSurplus: 'Left', people: ' guests',
      secShared: 'Costs shared by every option', nvTitle: 'Non-venue wedding costs', acTitle: 'Move-in costs and buffer', acHelp: 'Brokerage is calculated from the deposit and rate in Budget inputs. Whatever is left after these lines is your 혼수 budget.',
      ebTitle: 'More budget items', ebHelp: 'Add money coming in, like parental support or savings before the wedding, or subtract money you are setting aside.', addBudget: '+ Add budget item', ebAdd: 'Adds to cash', ebSub: 'Subtracts from cash', cashTotal: 'Total cash available', ebPh: 'e.g. Parental support',
      addCategory: '+ Add category', newCategory: 'New category', catType: 'Counts as', typeWedding: 'Wedding cost (before gifts)', typeMove: 'Move-in cost (before 혼수)', delCategory: 'Delete category',
      foldLabel: 'Collapse or expand', nOptions: (k) => `${k} option${k === 1 ? '' : 's'}`, monthlyShort: '/mo',
      hsTitle: '혼수: appliances & furniture', hsHelp: "Tick 'Provided' for anything the home already includes (옵션) and it drops out of the total. Starting amounts are rough estimates; replace them with real quotes.", provided: 'Provided', hsBuy: 'To buy', hsSaved: 'Saved by 옵션', segHonsu: '혼수 purchases', colFinal: 'Left after 혼수', wHonsuBuy: '혼수 purchases', wFinal: 'Left over', shortHonsu: 'Short for 혼수',
      broker: 'Brokerage (auto)', addItem: '+ Add item', total: 'Total', itemPh: 'Item',
      secLoans: 'Jeonse loan options', addLoan: '+ Add loan', colUse: 'Use', colProduct: 'Product', colElig: 'Eligible', colRate: 'Rate %', colLimit: 'Limit', colMonthly: 'Monthly', col2y: '2-yr interest', colNotes: 'Notes',
      yes: 'Yes', no: 'No', loanHelp: 'Interest only, on the loan amount in Budget inputs, capped at each product\'s limit. If the limit is below your loan, the gap is added to your cash down payment.',
      newVenue: 'New venue', newLoan: 'New loan', newFee: 'Hall',
      printHelp: 'Press Print or Ctrl/⌘+P to print just this report or save it as a PDF.', copyReport: 'Copy report', closeReport: 'Back to editing',
      repTitle: 'Wedding & home budget report', repAsOf: 'Prepared', repInputs: 'Budget inputs', repChart: 'Budget breakdown by option', repCompare: 'Option comparison', repDetail: 'Option details', repLoans: 'Jeonse loans', repWalk: 'Cash flow', repShared: 'Shared costs',
      dGuests: 'Billed guests', dNetBy: 'Left after wedding by gift scenario', dSum: 'Venue total', dWedding: 'Wedding total',
      copied: 'Copied', selected: 'Selected. Press Ctrl/⌘+C to copy', badJson: 'This JSON is not a saved plan.', readFail: 'Could not read the JSON. Check it was copied whole.', loaded: 'Plan loaded', resetDone: 'Reset to starting figures', fileFail: 'Could not read that file.'
    }
  };
  // Languages: Korean and English are built in; the others load from /i18n/<code>.js when chosen
  // (the most common partner nationalities in Korean international marriages). Missing text falls back to English.
  const LANGS = [['ko', '한국어'], ['en', 'English'], ['vi', 'Tiếng Việt'], ['zh', '中文 (简体)'], ['th', 'ไทย'], ['ja', '日本語']];
  const LOCALE = { ko: 'ko-KR', en: 'en-CA', vi: 'vi-VN', zh: 'zh-CN', th: 'th-TH', ja: 'ja-JP' };
  const HTML_LANG = { zh: 'zh-Hans' };
  const isKo = () => S.lang === 'ko';
  const locale = () => LOCALE[S.lang] || 'en-CA';
  // Built-in content (checklist tasks, categories, tips) is stored as Korean/English pairs; other languages
  // translate the English side through the language file's dictionary.
  const tx = (en) => { const p = window.NaduI18n && window.NaduI18n[S.lang]; return (p && p.data && p.data[en]) || en; };
  const T = (k) => (L[S.lang] || L.en)[k] ?? L.en[k] ?? k;
  const nm = (o, ko = 'ko', en = 'en') => isKo() ? (o[ko] || o[en] || '') : tx(o[en] || o[ko] || '');
  const deepMerge = (base, over) => { const out = { ...base }; for (const [k, v] of Object.entries(over || {})) out[k] = v && typeof v === 'object' && !Array.isArray(v) && typeof base[k] === 'object' && !Array.isArray(base[k]) ? deepMerge(base[k], v) : v; return out; };
  const langLoads = {};
  function ensureLang(lg) {
    if (lg === 'ko' || lg === 'en' || L[lg]) return Promise.resolve(true);
    if (!LOCALE[lg]) return Promise.resolve(false);
    return langLoads[lg] || (langLoads[lg] = new Promise((res) => {
      const sc = document.createElement('script'); sc.src = '/i18n/' + lg + '.js';
      sc.onload = () => { const p = window.NaduI18n && window.NaduI18n[lg]; if (p) L[lg] = deepMerge(L.en, p.ui || {}); res(!!p); };
      sc.onerror = () => { delete langLoads[lg]; res(false); };
      document.head.append(sc);
    }));
  }
  async function setLang(lg) {
    if (!(await ensureLang(lg))) lg = 'en';
    S.lang = lg; savePrefs(); save(); renderAll();
    if (!$('gate').hidden) showGate(gateMode);
  }

  // ---------- data ----------
  const line = (ko, en, amount) => ({ id: uid(), ko, en, amount });
  // Options added after the first release; each is inserted once into saved plans, then never re-added if deleted.
  // Empty in the public code: your real venues live in the shared database.
  const SEED_VENUES = () => [];
  const hs = (ko, en, amount) => ({ ...line(ko, en, amount), provided: false });
  // Starting values for a brand-new plan only. They never overwrite anything already saved on the server.
  const DEFAULT_HONSU = () => [hs('냉장고', 'Refrigerator', 0), hs('세탁기', 'Washer', 0), hs('에어컨', 'Air conditioner', 0), hs('TV', 'TV', 0),
    hs('침대·매트리스', 'Bed & mattress', 0), hs('소파', 'Sofa', 0), hs('식탁·의자', 'Dining table & chairs', 0)];
  const DEFAULTS = () => ({
    lang: 'ko', seeded: [],
    budget: { cash: 0, deposit: 0, loan: 0, guests: 0, gifts: [0, 0, 0], tier: 1, brokerRate: 0.4, brokerVat: true },
    selectedVenue: 'v1', selectedLoan: 'l1',
    venues: [
      { id: 'v1', ko: '예식장 1', en: 'Venue 1', food: 0, minGuests: 0, capMin: 0, capMax: 0, include: true, notes: '',
        lines: [line('대관', 'Hall', 0), line('꽃장식', 'Flowers', 0)] }
    ],
    nonVenue: [line('스드메', 'Studio, dress, makeup', 0), line('본식 스냅·영상', 'Day-of photo & video', 0), line('예복·반지', 'Attire & rings', 0), line('혼주 한복·도우미·부케', 'Family hanbok, helpers, bouquet', 0), line('신혼여행', 'Honeymoon', 0)],
    honsu: DEFAULT_HONSU(),
    afterCosts: [line('이사비', 'Moving', 0), line('대출 부대비용', 'Loan & guarantee fees', 0), line('비상금', 'Emergency buffer', 0)],
    loans: [
      { id: 'l1', ko: '전세대출', en: 'Jeonse loan', rate: 0, limit: 0, eligible: true, note: '' }
    ]
  });
  const valid = (o) => o && o.budget && Array.isArray(o.venues) && Array.isArray(o.nonVenue) && Array.isArray(o.afterCosts) && Array.isArray(o.loans);

  // Shared data lives on the server (see the sync section); only per-device preferences stay in this browser.
  let S = DEFAULTS();
  const save = () => scheduleSync();

  // ---------- format & dom ----------
  const n = (v) => Number(v) || 0;
  const comma = (v) => Math.round(v).toLocaleString('en-US');
  const won = (v) => (v < 0 ? '−₩' : '₩') + comma(Math.abs(v));
  function kr(v) {
    const a = Math.abs(v), s = v < 0 ? '−' : '';
    if (!isKo()) {
      if (a >= 1e9) return s + '₩' + (a / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
      if (a >= 1e6) return s + '₩' + (a / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
      return s + '₩' + comma(a);
    }
    if (a >= 1e8) { const e = Math.floor(a / 1e8), m = Math.round((a % 1e8) / 1e4); return s + e + '억' + (m ? ' ' + comma(m) + '만' : '') + '원'; }
    return s + comma(Math.round(a / 1e4)) + '만원';
  }
  const parse = (str) => { const d = String(str).replace(/[^\d.-]/g, ''); return d === '' ? 0 : Number(d); };
  const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v); } kids.flat().forEach((c) => c != null && e.append(c)); return e; };
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2000); }

  function moneyInput(id, get, set, extra = {}) {
    const i = el('input', { id, class: 'money', inputmode: 'numeric', autocomplete: 'off', ...extra });
    i.value = comma(get());
    i.addEventListener('input', () => { set(parse(i.value)); save(); compute(); });
    i.addEventListener('blur', () => { i.value = comma(get()); });
    return i;
  }
  function numInput(id, get, set, extra = {}) {
    const i = el('input', { id, type: 'number', inputmode: 'decimal', ...extra });
    i.value = get() || (extra.placeholder ? '' : 0);
    i.addEventListener('input', () => { set(n(i.value)); save(); compute(); });
    return i;
  }
  // edits the current-language field of a bilingual object
  function langInput(id, obj, extra = {}, koKey = 'ko', enKey = 'en') {
    const k = isKo() ? koKey : enKey, other = isKo() ? enKey : koKey;
    const i = el('input', { id: id + '-' + S.lang, type: 'text', placeholder: obj[other] || T('itemPh'), ...extra });
    i.value = obj[k] || '';
    i.addEventListener('input', () => { obj[k] = i.value; save(); compute(); });
    return i;
  }
  function textInput(id, get, set, extra = {}) {
    const i = el('input', { id, type: 'text', ...extra }); i.value = get() || '';
    i.addEventListener('input', () => { set(i.value); save(); compute(); });
    return i;
  }
  // ---------- note fields: a one-line box that pops out into a large editor ----------
  // The small box is a one-row textarea (keeps line breaks). Enter submits its form (or leaves the field);
  // Shift+Enter adds a line. The ⤢ button opens a large editor; Done writes back and fires the usual input/change.
  let noteDlg = null;
  function noteDialog() {
    if (noteDlg) return noteDlg;
    const ta = el('textarea', { id: 'note-big', rows: 14, maxlength: 4000 });
    const title = el('h3', { id: 'note-title' }), count = el('span', { class: 'small note-count' });
    const done = el('button', { type: 'button', class: 'primary', id: 'note-done' }), cancel = el('button', { type: 'button', id: 'note-cancel' });
    const d = el('dialog', { class: 'note-dialog', 'aria-labelledby': 'note-title' }, title, ta, el('div', { class: 'note-acts' }, count, el('div', { class: 'row-btns' }, cancel, done)));
    document.body.append(d);
    const upd = () => { count.textContent = T('noteChars')(ta.value.length); };
    ta.addEventListener('input', upd);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); done.click(); } });
    cancel.addEventListener('click', () => d.close());
    done.addEventListener('click', () => {
      const t = d._target; if (t && !t.disabled) { t.value = ta.value; t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true })); }
      d.close(); t && t.focus();
    });
    noteDlg = { d, ta, title, count, done, cancel, upd };
    return noteDlg;
  }
  function openNote(target, label) {
    const N = noteDialog();
    N.d._target = target; N.title.textContent = label || T('fMemo');
    N.done.textContent = T('noteDone'); N.cancel.textContent = T('cancel');
    N.ta.value = target.value; N.ta.readOnly = !!target.disabled; N.done.hidden = !!target.disabled; N.upd();
    N.d.showModal(); N.ta.focus(); N.ta.setSelectionRange(N.ta.value.length, N.ta.value.length);
  }
  // Wraps a textarea in the small-line + pop-out control. Returns the wrapper; the textarea keeps its id/name.
  function noteWrap(ta, label) {
    ta.classList.add('note-line'); ta.rows = 1; ta.maxLength = 4000;
    const btn = el('button', { type: 'button', class: 'note-pop', 'aria-label': T('noteOpen') + (label ? ': ' + label : ''), title: T('noteOpen') });
    const mark = () => { const lines = ta.value ? ta.value.split('\n').length : 0; btn.textContent = lines > 1 ? '⤢ ' + lines : '⤢'; btn.classList.toggle('has-more', lines > 1); };
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const who = ta.form && ta.form.elements.name && ta.form.elements.name.value.trim();   // e.g. the guest or item being entered
      openNote(ta, who ? `${label} · ${who}` : label);
    });
    ta.addEventListener('input', mark);
    ta.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;   // Shift+Enter = new line; IME composition untouched
      e.preventDefault();
      if (ta.form && ta.form.requestSubmit) ta.form.requestSubmit(); else ta.blur();
    });
    const w = el('div', { class: 'note-wrap' }, ta, btn);
    w._mark = mark; mark();
    return w;
  }
  function noteInput(id, get, set, extra = {}, label = '') {
    const ta = el('textarea', { id, ...extra }); ta.value = get() || '';
    ta.addEventListener('input', () => { set(ta.value); save(); compute(); });
    return noteWrap(ta, label || extra['aria-label']);
  }
  // Table cell for a note: line breaks kept, long notes clamped on screen (full text on hover and in print).
  const noteCell = (text, cls = 'l wrap-cell') => el('td', { class: cls + ' note-cell', title: text || '' }, el('div', { class: 'note-clamp', text: text || '' }));

  function delBtn(label, onConfirm) {
    const b = el('button', { type: 'button', class: 'ghost', 'aria-label': label, text: '✕' });
    b.addEventListener('click', () => {
      if (b.dataset.arm) { onConfirm(); return; }
      b.dataset.arm = '1'; b.textContent = T('del'); b.classList.add('danger');
      setTimeout(() => { if (b.isConnected) { delete b.dataset.arm; b.textContent = '✕'; b.classList.remove('danger'); } }, 3000);
    });
    return b;
  }
  const tip = $('tip');
  function attachTip(node, html) {
    node.addEventListener('mousemove', (e) => { tip.innerHTML = ''; html().forEach((x) => tip.append(x)); tip.style.display = 'block'; const w = tip.offsetWidth; let x = e.clientX + 14; if (x + w > window.innerWidth - 8) x = e.clientX - w - 14; tip.style.left = x + 'px'; tip.style.top = (e.clientY + 14) + 'px'; });
    node.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  }

  // ---------- model ----------
  function model() {
    const B = S.budget;
    const cats = (S.categories || []).map((c) => ({ c, total: c.lines.reduce((a, x) => a + n(x.amount), 0) }));
    const catWed = cats.filter((x) => x.c.type !== 'movein').reduce((a, x) => a + x.total, 0);
    const catMove = cats.filter((x) => x.c.type === 'movein').reduce((a, x) => a + x.total, 0);
    const nvBase = S.nonVenue.reduce((a, x) => a + n(x.amount), 0);
    const nvTotal = nvBase + catWed;
    const broker = n(B.deposit) * n(B.brokerRate) / 100 * (B.brokerVat ? 1.1 : 1);
    const acBase = S.afterCosts.reduce((a, x) => a + n(x.amount), 0) + broker;
    const acTotal = acBase + catMove;
    const hsTotal = (S.honsu || []).filter((x) => !x.provided).reduce((a, x) => a + n(x.amount), 0);
    const hsSaved = (S.honsu || []).filter((x) => x.provided).reduce((a, x) => a + n(x.amount), 0);
    const loan = S.loans.find((l) => l.id === S.selectedLoan);
    const loanAmt = loan ? Math.min(n(B.loan), n(loan.limit) || n(B.loan)) : n(B.loan);
    const loanGap = n(B.loan) - loanAmt;
    const down = n(B.deposit) - n(B.loan) + loanGap;
    const extras = (B.extras || []).map((e) => ({ e, signed: (e.kind === 'sub' ? -1 : 1) * n(e.amount) }));
    const cashTotal = n(B.cash) + extras.reduce((a, x) => a + x.signed, 0);
    const avail = cashTotal - down;
    const t = B.tier, g = n(B.guests);
    const venues = S.venues.map((v) => {
      const fixed = v.lines.reduce((a, x) => a + n(x.amount), 0);
      const billed = Math.max(g, n(v.minGuests));
      const food = billed * n(v.food);
      const venueTotal = fixed + food, total = venueTotal + nvTotal;
      const gifts = B.gifts.map((p) => g * n(p));
      const nets = gifts.map((x) => total - x), surpl = nets.map((x) => avail - x);
      let status = 'ok', why = T('fits');
      if ((n(v.capMin) && g < n(v.capMin)) || (n(v.capMax) && g > n(v.capMax))) { status = 'bad'; why = `${T('cap')} ${n(v.capMin) || 0}–${n(v.capMax) || '∞'}`; }
      else if (!v.lines.length) { status = 'warn'; why = T('noQuote'); }
      else if (surpl[t] < 0) { status = 'bad'; why = T('over'); }
      else if (surpl[t] - acTotal < 0) { status = 'warn'; why = T('shortMove'); }
      else if (surpl[t] - acTotal - hsTotal < 0) { status = 'warn'; why = T('shortHonsu'); }
      return { v, fixed, billed, food, unused: (billed - g) * n(v.food), venueTotal, total, gifts, nets, surpl, gift: gifts[t], net: nets[t], surplus: surpl[t], honsu: surpl[t] - acTotal, honsus: surpl.map((x) => x - acTotal), final: surpl[t] - acTotal - hsTotal, finals: surpl.map((x) => x - acTotal - hsTotal), status, why };
    });
    const inc = venues.filter((x) => x.v.include !== false);
    const best = inc.filter((x) => x.status !== 'bad' && x.v.lines.length).sort((a, b) => b.surplus - a.surplus)[0];
    const sel = venues.find((x) => x.v.id === S.selectedVenue) || best || venues[0];
    return { extras, cashTotal, cats, nvBase, acBase, nvTotal, broker, acTotal, hsTotal, hsSaved, down, avail, loan, loanAmt, loanGap, venues, inc, best, sel };
  }

  // ---------- collapsible sections ----------
  const isFolded = (k) => !!(S.collapsed && S.collapsed[k]);
  function foldBtn(key, host) {
    const b = el('button', { type: 'button', class: 'fold', 'aria-label': T('foldLabel'), 'aria-expanded': String(!isFolded(key)) });
    b.addEventListener('click', () => {
      S.collapsed = S.collapsed || {}; S.collapsed[key] = !isFolded(key);
      host.classList.toggle('collapsed', isFolded(key)); b.setAttribute('aria-expanded', String(!isFolded(key))); save();
    });
    host.classList.toggle('collapsed', isFolded(key));
    return b;
  }
  function setupFolds() {
    document.querySelectorAll('section.app').forEach((sec) => {
      const head = sec.querySelector(':scope > .sec-head'); if (!head) return;
      // Tabs already separate these pages; only the budget plan's sections fold
      const panel = sec.closest('.tabpanel');
      if (panel && panel.dataset.panel !== 'plan') { sec.classList.remove('collapsed'); return; }
      const h2 = head.querySelector('h2');
      let ttl = head.querySelector('.ttl');
      if (!ttl) { ttl = el('div', { class: 'ttl' }); h2.replaceWith(ttl); ttl.append(h2); }
      ttl.querySelector('.fold')?.remove(); ttl.querySelector('.fold-sum')?.remove();
      ttl.prepend(foldBtn('sec:' + sec.id, sec));
      ttl.append(el('span', { class: 'fold-sum', 'data-sum': 'sec:' + sec.id }));
    });
    document.querySelectorAll('.card[data-fold]').forEach((card) => {
      const head = card.querySelector('.card-head');
      head.querySelector('.fold')?.remove(); head.querySelector('.fold-sum')?.remove();
      head.prepend(foldBtn('card:' + card.dataset.fold, card));
      head.append(el('span', { class: 'fold-sum', 'data-sum': 'card:' + card.dataset.fold }));
    });
  }
  function updateSums(M) {
    const set = (k, v) => document.querySelectorAll(`[data-sum="${k}"]`).forEach((e) => { e.textContent = v; });
    const B = S.budget;
    set('sec:inputs', `${T('cashTotal')} ${kr(M.cashTotal)}`);
    set('sec:overview', M.best ? `${T('best')}: ${nm(M.best.v)} · ${kr(M.best.final)}` : T('noFit'));
    set('sec:walk-sec', M.sel ? `${T('wFinal')} ${kr(M.sel.final)}` : '');
    set('sec:venues', T('nOptions')(S.venues.length));
    set('sec:shared', `${T('total')} ${kr(M.nvTotal + M.acTotal + M.hsTotal)}`);
    set('sec:loans', M.loan ? `${nm(M.loan)} · ${kr(M.loanAmt * n(M.loan.rate) / 1200)} ${T('monthlyShort')}` : '');
    set('card:nv', kr(M.nvBase)); set('card:ac', kr(M.acBase)); M.cats.forEach((x) => { set('cat:' + x.c.id, kr(x.total)); const f = $('cat-' + x.c.id + '-total'); if (f) f.textContent = kr(x.total); }); set('card:hs', kr(M.hsTotal));
    M.venues.forEach((x) => set('v:' + x.v.id, kr(x.venueTotal)));
  }

  // ---------- language ----------
  function applyLang() {
    document.documentElement.lang = HTML_LANG[S.lang] || S.lang;
    document.querySelectorAll('[data-t]').forEach((e) => { e.textContent = T(e.dataset.t); });
    if (S.skin === 'bright') document.documentElement.setAttribute('data-skin', 'bright'); else document.documentElement.removeAttribute('data-skin');
    $('skin-std').setAttribute('aria-pressed', String(S.skin !== 'bright'));
    $('skin-bright').setAttribute('aria-pressed', String(S.skin === 'bright'));
    ['lang-select', 'gate-lang'].forEach((id) => { const sel = $(id); if (sel && sel.value !== S.lang) sel.value = S.lang; });
    const head = (id, cols) => { const tr = $(id).querySelector('thead tr'); tr.innerHTML = ''; cols.forEach(([k, l]) => tr.append(el('th', { class: l ? 'l' : '', text: k ? T(k) : '' }))); };
    head('cmp', [['colPick', 1], ['colVenue', 1], ['colStatus', 1], ['colVenueCost'], ['colTotal'], ['colGifts'], ['colNet'], ['colSurplus'], ['colHonsu'], ['colFinal']]);
    head('loan-cmp', [['colUse', 1], ['colProduct', 1], ['colElig', 1], ['colRate'], ['colLimit'], ['colMonthly'], ['col2y'], ['colNotes', 1], ['']]);
  }
  ['std', 'bright'].forEach((k) => $('skin-' + k).addEventListener('click', () => { S.skin = k; save(); applyLang(); compute(); }));
  ['lang-select', 'gate-lang'].forEach((id) => {
    const sel = $(id); if (!sel) return;
    LANGS.forEach(([code, label]) => sel.append(el('option', { value: code, text: label })));
    sel.value = S.lang;
    sel.addEventListener('change', () => setLang(sel.value));
  });

  // ---------- static renders ----------
  function renderBudget() {
    const B = S.budget, f = $('budget-fields'); f.innerHTML = '';
    const field = (k, input, hint) => el('label', { class: 'f', for: input.id }, T(k), input, el('span', { class: 'hint', 'data-hint': hint || '' }));
    f.append(
      field('cash', moneyInput('b-cash', () => B.cash, (x) => B.cash = x), 'cash'),
      field('deposit', moneyInput('b-dep', () => B.deposit, (x) => B.deposit = x), 'deposit'),
      field('loan', moneyInput('b-loan', () => B.loan, (x) => B.loan = x), 'loan'),
      el('label', { class: 'f' }, T('down'), el('div', { class: 'derived', id: 'b-down' }), el('span', { class: 'hint', id: 'b-down-h' })),
      field('guests', numInput('b-guests', () => B.guests, (x) => B.guests = x, { min: 0, step: 1 })),
      field('g0', moneyInput('b-g0', () => B.gifts[0], (x) => B.gifts[0] = x), 'g0'),
      field('g1', moneyInput('b-g1', () => B.gifts[1], (x) => B.gifts[1] = x), 'g1'),
      field('g2', moneyInput('b-g2', () => B.gifts[2], (x) => B.gifts[2] = x), 'g2'),
      field('brokerRate', numInput('b-broker', () => B.brokerRate, (x) => B.brokerRate = x, { min: 0, step: 0.05 }))
    );
    const vat = el('input', { id: 'b-vat', type: 'checkbox' }); vat.checked = !!B.brokerVat;
    vat.addEventListener('change', () => { B.brokerVat = vat.checked; save(); compute(); });
    f.append(el('label', { class: 'check', for: 'b-vat', style: 'align-self:center' }, vat, T('vat')));
    const seg = $('tier-seg'); seg.innerHTML = '';
    T('tiers').forEach((t, i) => {
      const b = el('button', { type: 'button', 'aria-pressed': String(B.tier === i), text: t });
      b.addEventListener('click', () => { B.tier = i; save(); renderBudget(); compute(); });
      seg.append(b);
    });
  }

  function renderExtras() {
    const B = S.budget; B.extras = B.extras || [];
    const box = $('eb-lines'); box.innerHTML = '';
    B.extras.forEach((e) => {
      const sel = el('select', { id: `eb-${e.id}-kind`, 'aria-label': T('ebTitle') }, el('option', { value: 'add', text: T('ebAdd') }), el('option', { value: 'sub', text: T('ebSub') }));
      sel.value = e.kind === 'sub' ? 'sub' : 'add';
      sel.addEventListener('change', () => { e.kind = sel.value; save(); compute(); });
      box.append(el('div', { class: 'line eb' },
        langInput(`eb-${e.id}-t`, e, { 'aria-label': T('itemPh'), placeholder: T('ebPh') }),
        sel,
        moneyInput(`eb-${e.id}-a`, () => e.amount, (x) => e.amount = x, { 'aria-label': 'Amount' }),
        delBtn('Remove', () => { B.extras.splice(B.extras.indexOf(e), 1); save(); renderExtras(); compute(); })));
    });
  }
  function renderVenues() {
    const wrap = $('venue-cards'); wrap.innerHTML = '';
    S.venues.forEach((v, idx) => {
      const lines = el('div', { class: 'lines' });
      v.lines.forEach((ln) => lines.append(el('div', { class: 'line' },
        langInput(`v-${v.id}-l-${ln.id}-t`, ln, { 'aria-label': T('itemPh') }),
        moneyInput(`v-${v.id}-l-${ln.id}-a`, () => ln.amount, (x) => ln.amount = x, { 'aria-label': 'Amount' }),
        delBtn('Remove', () => { v.lines = v.lines.filter((y) => y !== ln); save(); renderVenues(); compute(); }))));
      const addLine = el('button', { type: 'button', text: T('addFee') });
      addLine.addEventListener('click', () => { v.lines.push(line('', '', 0)); save(); renderVenues(); compute(); const ins = wrap.querySelectorAll(`.card[data-vid="${v.id}"] .line input[type=text]`); ins[ins.length - 1]?.focus(); });
      const dup = el('button', { type: 'button', text: T('duplicate') });
      dup.addEventListener('click', () => { const c = JSON.parse(JSON.stringify(v)); c.id = uid(); c.ko = (v.ko || v.en) + T('copySuffix'); c.en = (v.en || v.ko) + T('copySuffix'); c.lines.forEach((l) => l.id = uid()); S.venues.splice(idx + 1, 0, c); save(); renderVenues(); compute(); });
      const pick = el('button', { type: 'button', text: T('showFlow') });
      pick.addEventListener('click', () => { S.selectedVenue = v.id; save(); compute(); $('walk-sec').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      const inc = el('input', { id: `v-${v.id}-inc`, type: 'checkbox' }); inc.checked = v.include !== false;
      inc.addEventListener('change', () => { v.include = inc.checked; save(); compute(); });
      const card = el('article', { class: 'card', 'data-vid': v.id });
      wrap.append(card);
      card.append(
        el('div', { class: 'card-head' }, foldBtn('v:' + v.id, card), langInput(`v-${v.id}-name`, v, { class: 'title', 'aria-label': T('colVenue') }), el('span', { class: 'fold-sum', 'data-sum': 'v:' + v.id }),
          delBtn('Delete option', () => { S.venues = S.venues.filter((y) => y !== v); save(); renderVenues(); compute(); })),
        el('div', { class: 'grid3' },
          el('label', { class: 'f', for: `v-${v.id}-food` }, T('mealPer'), moneyInput(`v-${v.id}-food`, () => v.food, (x) => v.food = x)),
          el('label', { class: 'f', for: `v-${v.id}-min` }, T('minG'), numInput(`v-${v.id}-min`, () => v.minGuests, (x) => v.minGuests = x, { min: 0 })),
          el('label', { class: 'f', for: `v-${v.id}-cmin` }, T('capMin'), numInput(`v-${v.id}-cmin`, () => v.capMin, (x) => v.capMin = x, { min: 0, placeholder: '0' })),
          el('label', { class: 'f', for: `v-${v.id}-cmax` }, T('capMax'), numInput(`v-${v.id}-cmax`, () => v.capMax, (x) => v.capMax = x, { min: 0, placeholder: T('noLimit') }))),
        el('div', { class: 'small' }, T('fixedFees')), lines,
        el('label', { class: 'f', for: `v-${v.id}-notes` }, T('notes'), noteInput(`v-${v.id}-notes`, () => v.notes, (x) => v.notes = x, {}, `${T('notes')} · ${nm(v)}`)),
        el('div', { class: 'row-btns' }, addLine, dup, pick, el('label', { class: 'check', for: inc.id }, inc, T('include'))),
        el('div', { class: 'card-foot', id: `v-${v.id}-foot` }));
    });
  }

  function renderLineList(boxId, arr, prefix) {
    const box = $(boxId); box.innerHTML = '';
    if (prefix === 'ac') box.append(el('div', { class: 'line' }, el('div', { class: 'derived', style: 'text-align:left', text: T('broker') }), el('div', { class: 'derived', id: 'ac-broker' }), el('span')));
    arr.forEach((it) => box.append(el('div', { class: 'line' },
      langInput(`${prefix}-${it.id}-t`, it, { 'aria-label': T('itemPh') }),
      moneyInput(`${prefix}-${it.id}-a`, () => it.amount, (x) => it.amount = x, { 'aria-label': 'Amount' }),
      delBtn('Remove', () => { arr.splice(arr.indexOf(it), 1); save(); renderShared(); compute(); }))));
  }
  function renderHonsu() {
    const box = $('hs-lines'); box.innerHTML = '';
    S.honsu.forEach((it) => {
      const cb = el('input', { type: 'checkbox', id: `hs-${it.id}-p` }); cb.checked = !!it.provided;
      const row = el('div', { class: 'line hs' + (it.provided ? ' prov' : '') },
        langInput(`hs-${it.id}-t`, it, { 'aria-label': T('itemPh') }),
        moneyInput(`hs-${it.id}-a`, () => it.amount, (x) => it.amount = x, { 'aria-label': 'Amount' }),
        el('label', { class: 'check', for: cb.id }, cb, T('provided')),
        delBtn('Remove', () => { S.honsu.splice(S.honsu.indexOf(it), 1); save(); renderHonsu(); compute(); }));
      cb.addEventListener('change', () => { it.provided = cb.checked; row.classList.toggle('prov', cb.checked); save(); compute(); });
      box.append(row);
    });
  }
  function renderCategories() {
    const wrap = $('shared-cards');
    wrap.querySelectorAll('.card[data-cat]').forEach((c) => c.remove());
    (S.categories || []).forEach((c) => {
      const card = el('div', { class: 'card', 'data-cat': c.id });
      const lines = el('div', { class: 'lines' });
      c.lines.forEach((ln) => lines.append(el('div', { class: 'line' },
        langInput(`cat-${c.id}-l-${ln.id}-t`, ln, { 'aria-label': T('itemPh') }),
        moneyInput(`cat-${c.id}-l-${ln.id}-a`, () => ln.amount, (x) => ln.amount = x, { 'aria-label': 'Amount' }),
        delBtn('Remove', () => { c.lines.splice(c.lines.indexOf(ln), 1); save(); renderCategories(); compute(); }))));
      const sel = el('select', { id: `cat-${c.id}-type` },
        el('option', { value: 'wedding', text: T('typeWedding') }), el('option', { value: 'movein', text: T('typeMove') }));
      sel.value = c.type === 'movein' ? 'movein' : 'wedding';
      sel.addEventListener('change', () => { c.type = sel.value; save(); compute(); });
      const add = el('button', { type: 'button', text: T('addItem') });
      add.addEventListener('click', () => { c.lines.push(line('', '', 0)); save(); renderCategories(); compute(); const ins = card.isConnected ? document.querySelectorAll(`.card[data-cat="${c.id}"] .line input[type=text]`) : []; ins[ins.length - 1]?.focus(); });
      card.append(
        el('div', { class: 'card-head' }, foldBtn('cat:' + c.id, card), langInput(`cat-${c.id}-name`, c, { class: 'title', 'aria-label': T('newCategory') }), el('span', { class: 'fold-sum', 'data-sum': 'cat:' + c.id }),
          delBtn(T('delCategory'), () => { S.categories = S.categories.filter((y) => y !== c); save(); renderCategories(); compute(); })),
        el('label', { class: 'cat-type', for: sel.id }, T('catType'), sel),
        lines,
        el('div', { class: 'card-foot' }, add, el('span', {}, T('total') + ' ', el('b', { id: `cat-${c.id}-total` }))));
      wrap.append(card);
    });
  }
  function renderShared() { renderLineList('nv-lines', S.nonVenue, 'nv'); renderLineList('ac-lines', S.afterCosts, 'ac'); renderHonsu(); renderCategories(); }

  function renderLoans() {
    const tb = $('loan-cmp').querySelector('tbody'); tb.innerHTML = '';
    S.loans.forEach((l) => {
      const r = el('input', { type: 'radio', name: 'loan-pick', id: `l-${l.id}-use`, 'aria-label': T('colUse') }); r.checked = S.selectedLoan === l.id;
      r.addEventListener('change', () => { S.selectedLoan = l.id; save(); compute(); });
      const elig = el('input', { type: 'checkbox', id: `l-${l.id}-el` }); elig.checked = !!l.eligible;
      elig.addEventListener('change', () => { l.eligible = elig.checked; save(); compute(); });
      tb.append(el('tr', { 'data-lid': l.id },
        el('td', { class: 'l' }, r),
        el('td', { class: 'l', style: 'min-width:12rem' }, langInput(`l-${l.id}-name`, l, { 'aria-label': T('colProduct') })),
        el('td', { class: 'l' }, el('label', { class: 'check', for: elig.id }, elig, el('span', { 'data-el': l.id }))),
        el('td', { style: 'min-width:5.5rem' }, numInput(`l-${l.id}-rate`, () => l.rate, (x) => l.rate = x, { step: 0.05, min: 0, 'aria-label': T('colRate') })),
        el('td', { style: 'min-width:9rem' }, moneyInput(`l-${l.id}-lim`, () => l.limit, (x) => l.limit = x, { 'aria-label': T('colLimit') })),
        el('td', { class: 'n', 'data-m': l.id }), el('td', { class: 'n', 'data-y': l.id }),
        el('td', { class: 'l', style: 'min-width:14rem' }, noteInput(`l-${l.id}-note`, () => l.note, (x) => l.note = x, { 'aria-label': T('colNotes') }, `${T('colNotes')} · ${nm(l)}`)),
        el('td', {}, delBtn('Delete loan', () => { S.loans = S.loans.filter((y) => y !== l); if (S.selectedLoan === l.id) S.selectedLoan = S.loans[0]?.id; save(); renderLoans(); compute(); }))));
    });
  }

  // ---------- shared visual builders (app + report) ----------
  const SEGS = [['down', 'segDown', '--c-down'], ['fixed', 'segFixed', '--c-fixed'], ['food', 'segFood', '--c-food'], ['nv', 'segNv', '--c-nv'], ['move', 'segMove', '--c-move'], ['honsu', 'segHonsu', '--c-hs'], ['left', 'segLeft', '--c-left']];
  function legend() {
    const lg = el('div', { class: 'legend' });
    SEGS.forEach(([, k, c]) => lg.append(el('span', {}, el('i', { style: `background:var(${c})` }), T(k))));
    lg.append(el('span', {}, el('i', { style: 'background:repeating-linear-gradient(45deg,var(--bad) 0 3px,transparent 3px 6px);border:1px solid var(--bad)' }), T('segShort')));
    lg.append(el('span', {}, el('span', { class: 'mk' }), T('mkCash')), el('span', {}, el('span', { class: 'mk g' }), T('mkGift')));
    return lg;
  }
  function breakdown(M, rows, interactive) {
    const box = el('div', { class: 'bk' });
    const cash = M.cashTotal;
    const data = rows.map((x) => {
      const parts = { down: M.down, fixed: x.fixed, food: x.food, nv: M.nvTotal, move: M.acTotal, honsu: M.hsTotal };
      const uses = Object.values(parts).reduce((a, b) => a + b, 0);
      const avail = cash + x.gift; const left = avail - uses;
      return { x, parts, uses, avail, left };
    });
    const max = Math.max(cash, ...data.map((d) => Math.max(d.uses, d.avail))) || 1;
    const P = (v) => (v / max) * 100;
    data.forEach((d) => {
      const track = el('div', { class: 'bk-track' });
      let at = 0;
      SEGS.slice(0, 6).forEach(([k, lab, c]) => {
        const v = d.parts[k]; if (v <= 0) return;
        const s = el('div', { class: 'bk-seg', style: `left:${P(at)}%;width:${P(v)}%;background:var(${c})` });
        if (interactive) attachTip(s, () => [el('div', { class: 'small', text: nm(d.x.v) }), el('div', {}, T(lab) + ' ', el('b', { text: kr(v) })), el('div', { class: 'small', text: won(v) })]);
        track.append(s); at += v;
      });
      if (d.left >= 0) {
        const s = el('div', { class: 'bk-seg', style: `left:${P(at)}%;width:${P(d.left)}%;background:var(--c-left);border-radius:0 4px 4px 0` });
        if (interactive) attachTip(s, () => [el('div', { class: 'small', text: nm(d.x.v) }), el('div', {}, T('segLeft') + ' ', el('b', { text: kr(d.left) }))]);
        track.append(s);
      } else {
        const s = el('div', { class: 'bk-seg short', style: `left:${P(d.avail)}%;width:${P(-d.left)}%` });
        if (interactive) attachTip(s, () => [el('div', { class: 'small', text: nm(d.x.v) }), el('div', {}, T('segShort') + ' ', el('b', { text: kr(-d.left) }))]);
        track.append(s);
      }
      track.append(el('div', { class: 'bk-mark', style: `left:${P(cash)}%` }), el('div', { class: 'bk-mark g', style: `left:${P(d.avail)}%` }));
      box.append(el('div', { class: 'bk-row' + (d.x.v.include === false ? ' off-row' : '') },
        el('div', { class: 'nm' }, nm(d.x.v), el('small', { text: d.x.why })),
        track,
        el('div', { class: 'res', style: d.left < 0 ? 'color:var(--bad)' : '' }, kr(d.left), el('small', { text: d.left < 0 ? T('segShort') : T('segLeft') }))));
    });
    return box;
  }
  function walkSteps(M, x) {
    const B = S.budget;
    const steps = [
      { k: T('wCash'), amt: n(B.cash), kind: 'total' },
      ...M.extras.map((x) => ({ k: nm(x.e) || T('ebTitle'), amt: x.signed, kind: x.signed >= 0 ? 'plus' : undefined })),
      { k: M.loanGap > 0 ? T('wDownGap') : T('wDown'), amt: -M.down },
      { k: T('wWedding'), amt: -x.total },
      { k: T('wGifts'), amt: x.gift, kind: 'plus' },
      { k: T('wAfter'), amt: x.surplus, kind: 'total' },
      { k: T('wBroker'), amt: -M.broker },
      ...S.afterCosts.map((a) => ({ k: nm(a), amt: -n(a.amount) })),
      ...M.cats.filter((x) => x.c.type === 'movein').map((x) => ({ k: nm(x.c), amt: -x.total })),
      { k: T('wHonsu'), amt: x.honsu, kind: 'total' },
      { k: T('wHonsuBuy'), amt: -M.hsTotal },
      { k: T('wFinal'), amt: x.final, kind: 'total' }
    ];
    let run = 0; const pts = [0];
    steps.forEach((s) => { if (s.kind === 'total') { s.a = 0; s.b = s.amt; run = s.amt; } else { s.a = run; s.b = run + s.amt; run = s.b; } pts.push(s.a, s.b); });
    const mn = Math.min(...pts), mx = Math.max(...pts), sp = mx - mn || 1, P = (v) => (v - mn) / sp * 100;
    const w = el('div', { class: 'walk' });
    steps.forEach((s) => {
      const neg = s.kind === 'total' && s.amt < 0;
      w.append(el('div', { class: 'step ' + (s.kind || '') + (neg ? ' bad' : '') },
        el('div', { class: 'lab', text: s.k }),
        el('div', { class: 'track' }, el('div', { class: 'sb', style: `left:${P(Math.min(s.a, s.b))}%;width:${Math.max(0.4, Math.abs(P(s.b) - P(s.a)))}%` })),
        el('div', { class: 'amt', style: neg ? 'color:var(--bad)' : '', text: kr(s.amt), title: won(s.amt) })));
    });
    return w;
  }

  // ---------- computed renders ----------
  function compute() {
    const M = model(), B = S.budget, t = B.tier;
    $('b-down').textContent = comma(M.down);
    $('eb-total').textContent = kr(M.cashTotal);
    $('b-down-h').textContent = kr(M.down);
    document.querySelectorAll('[data-hint]').forEach((h) => {
      const k = h.dataset.hint; if (!k) return;
      if (k[0] === 'g') h.textContent = `× ${n(B.guests)} = ${kr(B.gifts[Number(k[1])] * n(B.guests))}`;
      else h.textContent = kr(B[k] ?? 0);
    });

    const sum = $('summary'); sum.innerHTML = '';
    const stat = (k, v, s, cls) => el('div', { class: 'stat' }, el('div', { class: 'k', text: T(k) }), el('div', { class: 'v ' + (cls || ''), text: v }), el('div', { class: 's', text: s }));
    const monthly = M.loan ? M.loanAmt * n(M.loan.rate) / 100 / 12 : 0;
    sum.append(
      stat('availStat', kr(M.avail), won(M.avail), M.avail < 0 ? 'bad' : ''),
      stat('bestStat', M.best ? nm(M.best.v) : '—', M.best ? `${T('colSurplus')} ${kr(M.best.surplus)}` : T('noFit'), M.best ? 'good' : 'bad'),
      stat('honsuStat', M.best ? kr(M.best.final) : '—', M.best ? `${T('hsBuy')} ${kr(M.hsTotal)}` : '', M.best && M.best.final < 0 ? 'bad' : ''),
      stat('loanStat', M.loan ? kr(monthly) : '—', M.loan ? `${nm(M.loan)} · ${n(M.loan.rate)}%${M.loan.eligible ? '' : ' · ' + T('notElig')}` : '', M.loan && !M.loan.eligible ? 'bad' : ''));
    $('compare-note').textContent = `${T('tiers')[t]} · ${comma(B.gifts[t])} × ${n(B.guests)}`;

    const lgBox = $('bk-legend'); lgBox.replaceWith(Object.assign(legend(), { id: 'bk-legend' }));
    const sorted = [...M.venues].sort((a, b) => (b.v.include !== false) - (a.v.include !== false) || b.surplus - a.surplus);
    $('bk').replaceWith(Object.assign(breakdown(M, sorted, true), { id: 'bk' }));

    const tb = $('cmp').querySelector('tbody'); tb.innerHTML = '';
    sorted.forEach((x) => {
      const off = x.v.include === false;
      const r = el('input', { type: 'radio', name: 'venue-pick', id: `pick-${x.v.id}`, 'aria-label': T('showFlow') }); r.checked = M.sel && M.sel.v.id === x.v.id;
      r.addEventListener('change', () => { S.selectedVenue = x.v.id; save(); compute(); });
      const chips = el('span', { style: 'display:inline-flex;gap:4px;flex-wrap:wrap' });
      if (off) chips.append(el('span', { class: 'chip', text: T('excluded') }));
      else { if (M.best && x === M.best) chips.append(el('span', { class: 'chip best', text: T('best') })); chips.append(el('span', { class: 'chip ' + (x.status === 'ok' ? 'good' : x.status), text: x.why })); }
      if (x.unused > 0) chips.append(el('span', { class: 'chip warn', text: `${T('unused')} ${kr(x.unused)}` }));
      const td = (v) => el('td', { class: 'n' + (v < 0 ? ' neg' : ''), text: kr(v), title: won(v) });
      tb.append(el('tr', { class: (r.checked ? 'sel ' : '') + (off ? 'off-row' : '') },
        el('td', { class: 'l' }, r), el('td', { class: 'l' }, el('span', { class: 'vname', text: nm(x.v) })), el('td', { class: 'l' }, chips),
        td(x.venueTotal), td(x.total), td(x.gift), td(x.net), td(x.surplus), td(x.honsu), td(x.final)));
    });

    M.venues.forEach((x) => {
      const f = $(`v-${x.v.id}-foot`); if (!f) return; f.innerHTML = '';
      f.append(el('span', {}, T('fFixed') + ' ', el('b', { text: kr(x.fixed) })), el('span', {}, `${T('fMeals')} (${x.billed}${T('people')}) `, el('b', { text: kr(x.food) })),
        el('span', {}, T('fVenue') + ' ', el('b', { text: kr(x.venueTotal) })), el('span', {}, T('fSurplus') + ' ', el('b', { text: kr(x.surplus), style: x.surplus < 0 ? 'color:var(--bad)' : '' })));
      document.querySelector(`.card[data-vid="${x.v.id}"]`)?.classList.toggle('sel', M.sel && M.sel.v.id === x.v.id);
    });
    $('nv-total').textContent = kr(M.nvBase); $('hs-total').textContent = kr(M.hsTotal); $('hs-saved').textContent = kr(M.hsSaved); $('ac-total').textContent = kr(M.acBase);
    const bk = $('ac-broker'); if (bk) bk.textContent = comma(M.broker);

    S.loans.forEach((l) => {
      const amt = Math.min(n(B.loan), n(l.limit) || n(B.loan)), m = amt * n(l.rate) / 100 / 12;
      const mc = document.querySelector(`[data-m="${l.id}"]`), yc = document.querySelector(`[data-y="${l.id}"]`), ec = document.querySelector(`[data-el="${l.id}"]`);
      if (mc) mc.textContent = kr(m); if (yc) yc.textContent = kr(m * 24);
      if (ec) { ec.textContent = l.eligible ? T('yes') : T('no'); ec.style.color = l.eligible ? 'var(--good)' : 'var(--bad)'; }
      document.querySelector(`tr[data-lid="${l.id}"]`)?.classList.toggle('sel', S.selectedLoan === l.id);
    });

    const w = $('walk');
    if (!M.sel) { $('walk-title').textContent = ''; w.innerHTML = ''; w.append(el('p', { class: 'small', text: T('noVenue') })); }
    else { $('walk-title').textContent = `${nm(M.sel.v)} · ${T('tiers')[t]}`; const nw = walkSteps(M, M.sel); nw.id = 'walk'; nw.className = 'panel walk'; w.replaceWith(nw); }
    updateSums(M);
    if (typeof S.tab === 'string' && !['plan', 'list', 'history', 'settings', 'admin'].includes(S.tab)) renderPanel();
    if (!$('report-sec').hidden) buildReport();
  }

  // ---------- report ----------
  const REP_SECTIONS = [['inputs', 'repInputs'], ['chart', 'repChart'], ['compare', 'repCompare'], ['detail', 'repDetail'], ['shared', 'repShared'], ['loans', 'repLoans'], ['walk', 'repWalk'], ['prep', 'repPrep'], ['spend', 'repSpend'], ['people', 'repPeople'], ['notes', 'repNotes']];
  function repState() {
    S.report = S.report || {};
    S.report.sections = S.report.sections || {};
    S.report.venues = S.report.venues || {};
    return S.report;
  }
  const repHas = (k) => repState().sections[k] !== false;
  const repVenue = (v) => { const r = repState().venues[v.id]; return r === undefined ? v.include !== false : r; };
  function renderReportOpts() {
    const box = $('rep-opts'); box.innerHTML = '';
    const grp = (label, items) => el('div', { class: 'grp' }, el('span', { text: label }), items);
    const cb = (id, label, on, fn) => { const i = el('input', { type: 'checkbox', id }); i.checked = on; i.addEventListener('change', () => { fn(i.checked); save(); buildReport(); }); return el('label', { class: 'check', for: id }, i, label); };
    box.append(grp(T('repOptVenues'), S.venues.map((v) => cb('rv-' + v.id, nm(v), repVenue(v), (on) => { repState().venues[v.id] = on; }))));
    box.append(grp(T('repOptSections'), REP_SECTIONS.map(([k, lab]) => cb('rs-' + k, T(lab), repHas(k), (on) => { repState().sections[k] = on; }))));
  }
  function buildReport() {
    const M = model(), B = S.budget, t = B.tier, R = $('report'); R.innerHTML = '';
    M.inc = M.venues.filter((x) => repVenue(x.v));
    const date = new Date().toLocaleDateString(locale(), { year: 'numeric', month: 'long', day: 'numeric' });
    R.append(el('div', {}, el('h2', { text: T('repTitle') }), el('div', { class: 'meta', text: `${T('repAsOf')} ${date} · ${T('tierLabel')}: ${T('tiers')[t]} (${comma(B.gifts[t])} × ${n(B.guests)})` })));
    const kv = (pairs) => el('div', { class: 'kv' }, pairs.map(([k, v]) => el('div', {}, el('span', { text: k }), el('span', { text: v }))));
    if (repHas('inputs')) R.append(el('section', {}, el('h3', { text: T('repInputs') }), kv([
      [T('cash'), won(B.cash)], ...M.extras.map((x) => [nm(x.e) || T('ebTitle'), won(x.signed)]), [T('cashTotal'), won(M.cashTotal)], [T('deposit'), won(B.deposit)], [T('loan'), won(B.loan)], [T('down'), won(M.down)], [T('guests'), String(n(B.guests))],
      [T('g0'), won(B.gifts[0])], [T('g1'), won(B.gifts[1])], [T('g2'), won(B.gifts[2])], [T('wBroker'), won(M.broker)],
      [T('loanStat'), M.loan ? `${nm(M.loan)} · ${n(M.loan.rate)}% · ${won(M.loanAmt * n(M.loan.rate) / 1200)}` : '—']])));
    if (repHas('chart')) R.append(el('section', {}, el('h3', { text: T('repChart') }), legend(), breakdown(M, M.inc.slice().sort((a, b) => b.surplus - a.surplus), false)));
    const tbl = el('table', {}, el('thead', {}, el('tr', {}, ['colVenue', 'colStatus', 'colVenueCost', 'colTotal', 'colGifts', 'colNet', 'colSurplus', 'colHonsu', 'colFinal'].map((k, i) => el('th', { class: i < 2 ? 'l' : '', text: T(k) })))),
      el('tbody', {}, M.inc.slice().sort((a, b) => b.surplus - a.surplus).map((x) => el('tr', {}, el('td', { class: 'l', text: nm(x.v) + (M.best === x ? ` (${T('best')})` : '') }), el('td', { class: 'l', text: x.why }),
        ...[x.venueTotal, x.total, x.gift, x.net, x.surplus, x.honsu, x.final].map((v) => el('td', { class: 'n' + (v < 0 ? ' neg' : ''), text: kr(v) }))))));
    if (repHas('compare')) R.append(el('section', {}, el('h3', { text: T('repCompare') }), el('div', { class: 'scroll' }, tbl)));
    const opts = el('div', { class: 'opt-grid' });
    M.inc.forEach((x) => {
      const rows = [...x.v.lines.map((l) => [nm(l), n(l.amount)]), [`${T('fMeals')} (${x.billed} × ${comma(x.v.food)})`, x.food]];
      opts.append(el('div', { class: 'opt' }, el('h4', { text: nm(x.v) }), x.v.notes ? el('div', { class: 'small note-text', text: x.v.notes }) : null,
        el('table', {}, el('tbody', {}, rows.map(([k, v]) => el('tr', {}, el('td', { class: 'l', text: k }), el('td', { class: 'n', text: won(v) }))),
          el('tr', { class: 'tot' }, el('td', { class: 'l', text: T('dSum') }), el('td', { class: 'n', text: won(x.venueTotal) })),
          el('tr', {}, el('td', { class: 'l', text: T('nvTitle') }), el('td', { class: 'n', text: won(M.nvTotal) })),
          el('tr', { class: 'tot' }, el('td', { class: 'l', text: T('dWedding') }), el('td', { class: 'n', text: won(x.total) })))),
        el('div', { class: 'small', style: 'margin-top:8px', text: T('dNetBy') }),
        el('table', {}, el('tbody', {}, T('tiers').map((tn, i) => el('tr', {}, el('td', { class: 'l', text: `${tn} (${comma(B.gifts[i])})` }), el('td', { class: 'n' + (x.surpl[i] < 0 ? ' neg' : ''), text: won(x.surpl[i]) })))))));
    });
    if (repHas('detail')) R.append(el('section', {}, el('h3', { text: T('repDetail') }), opts));
    const shared = (title, arr, extra) => el('div', { class: 'opt' }, el('h4', { text: title }), el('table', {}, el('tbody', {}, (extra || []).concat(arr.map((a) => [nm(a), n(a.amount)])).map(([k, v]) => el('tr', {}, el('td', { class: 'l', text: k }), el('td', { class: 'n', text: won(v) }))))));
    if (repHas('shared')) R.append(el('section', {}, el('h3', { text: T('repShared') }), el('div', { class: 'opt-grid' }, shared(T('nvTitle'), S.nonVenue), shared(T('acTitle'), S.afterCosts, [[T('broker'), M.broker]]), shared(T('hsTitle'), S.honsu.filter((h) => !h.provided)), ...M.cats.map((x) => shared(`${nm(x.c)} · ${x.c.type === 'movein' ? T('typeMove') : T('typeWedding')}`, x.c.lines)))));
    const lt = el('table', {}, el('thead', {}, el('tr', {}, ['colProduct', 'colElig', 'colRate', 'colMonthly', 'col2y', 'colNotes'].map((k, i) => el('th', { class: (i < 2 || i === 5) ? 'l' : '', text: T(k) })))),
      el('tbody', {}, S.loans.map((l) => { const amt = Math.min(n(B.loan), n(l.limit) || n(B.loan)), m = amt * n(l.rate) / 1200; return el('tr', {}, el('td', { class: 'l', text: nm(l) + (S.selectedLoan === l.id ? ' ✓' : '') }), el('td', { class: 'l', text: l.eligible ? T('yes') : T('no') }), el('td', { class: 'n', text: n(l.rate) + '%' }), el('td', { class: 'n', text: kr(m) }), el('td', { class: 'n', text: kr(m * 24) }), el('td', { class: 'l', text: l.note || '' })); })));
    if (repHas('loans')) R.append(el('section', {}, el('h3', { text: T('repLoans') }), el('div', { class: 'scroll' }, lt)));
    if (M.sel && repHas('walk')) R.append(el('section', {}, el('h3', { text: `${T('repWalk')} · ${nm(M.sel.v)}` }), walkSteps(M, M.sel)));
    if (repHas('prep')) reportPrep(R);
    if (repHas('spend')) reportSpend(R);
    if (repHas('people')) reportPeople(R);
    if (repHas('notes')) reportNotes(R, M);
  }
  function openReport(show) {
    $('report-sec').hidden = !show;
    document.querySelectorAll('.app').forEach((e) => { if (e.id !== 'io') e.hidden = show; else if (show) e.hidden = true; });
    if (show) { renderReportOpts(); buildReport(); window.scrollTo(0, 0); }
  }
  $('btn-report').addEventListener('click', () => openReport(true));
  $('rep-print').addEventListener('click', () => window.print());
  $('rep-close').addEventListener('click', () => openReport(false));
  $('rep-copy').addEventListener('click', () => {
    const html = $('report').innerHTML, text = $('report').innerText;
    const fallback = () => { const r = document.createRange(); r.selectNodeContents($('report')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast(T('selected')); };
    try {
      if (window.ClipboardItem && navigator.clipboard?.write) navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]).then(() => toast(T('copied')), fallback);
      else if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast(T('copied')), fallback);
      else fallback();
    } catch (e) { fallback(); }
  });

  // ---------- actions ----------
  $('add-venue').addEventListener('click', () => {
    const id = uid();
    S.venues.push({ id, ko: T('newVenue'), en: L.en.newVenue, food: 0, minGuests: 0, capMin: 0, capMax: 0, include: true, notes: '', lines: [line('대관', 'Hall', 0)] });
    S.venues[S.venues.length - 1][isKo() ? 'ko' : 'en'] = T('newVenue');
    save(); renderVenues(); compute();
    const i = document.getElementById(`v-${id}-name-${S.lang}`); i?.scrollIntoView({ behavior: 'smooth', block: 'center' }); i?.select();
  });
  $('add-nv').addEventListener('click', () => { S.nonVenue.push(line('', '', 0)); save(); renderShared(); compute(); });
  $('add-eb').addEventListener('click', () => { S.budget.extras = S.budget.extras || []; const e = { ...line('', '', 0), kind: 'add' }; S.budget.extras.push(e); save(); renderExtras(); compute(); document.getElementById(`eb-${e.id}-t-${S.lang}`)?.focus(); });
  $('add-cat').addEventListener('click', () => {
    S.categories = S.categories || [];
    const c = { id: uid(), ko: L.ko.newCategory, en: L.en.newCategory, type: 'wedding', lines: [line('', '', 0)] };
    S.categories.push(c); save(); renderCategories(); compute();
    const i = document.getElementById(`cat-${c.id}-name-${S.lang}`); i?.scrollIntoView({ behavior: 'smooth', block: 'center' }); i?.select();
  });
  $('add-hs').addEventListener('click', () => { S.honsu.push(hs('', '', 0)); save(); renderHonsu(); compute(); const ins = document.querySelectorAll('#hs-lines input[type=text]'); ins[ins.length - 1]?.focus(); });
  $('add-ac').addEventListener('click', () => { S.afterCosts.push(line('', '', 0)); save(); renderShared(); compute(); });
  $('add-loan').addEventListener('click', () => { S.loans.push({ id: uid(), ko: L.ko.newLoan, en: L.en.newLoan, rate: 0, limit: 0, eligible: true, note: '' }); save(); renderLoans(); compute(); });

  $('btn-io').addEventListener('click', () => { const io = $('io'); io.hidden = !io.hidden; if (!io.hidden) $('io-text').value = JSON.stringify(S, null, 1); });
  $('io-copy').addEventListener('click', () => {
    const ta = $('io-text'); ta.value = JSON.stringify(S, null, 1);
    const fb = () => { ta.select(); toast(T('selected')); };
    try { navigator.clipboard ? navigator.clipboard.writeText(ta.value).then(() => toast(T('copied')), fb) : fb(); } catch (e) { fb(); }
  });
  // Photos can travel in an import file as { files: { name: { mime, data(base64) } } }; they upload to the plan.
  async function loadFiles(files) {
    const names = Object.keys(files || {}).filter((k) => /^[a-z0-9][a-z0-9._-]{0,63}$/.test(k));
    let ok = 0;
    for (const name of names) {
      const f = files[name]; if (!f || !f.data) continue;
      const bin = atob(f.data), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      if (await putPlanFile(name, new Blob([bytes], { type: f.mime || 'image/jpeg' }), true)) ok++;
    }
    if (names.length) { toast(T('filesLoaded')(ok, names.length)); if (S.tab === 'sdm') renderSdm(); }
  }
  function ioAllowed() { return !!(Sync.plan && Sync.plan.io); }
  function renderIoLock() {
    const locked = !!Sync.planId && !ioAllowed();
    const note = $('io-lock'); if (note) { note.hidden = !locked; note.textContent = T('ioLocked'); }
    if ($('io-import-area')) $('io-import-area').hidden = locked;
    if ($('io-load')) $('io-load').hidden = locked;
  }
  function loadListings(cat, files) {
    const r = window.NaduSdm.mergeCatalog(S.sdmCatalog, cat);
    if (files && Sync.plan && Sync.plan.writable) loadFiles(files);
    if (!r.added && !r.updated) { toast(T('listingsNone')); return; }
    S.sdmCatalog = r.catalog; Sync.importing = true; save(); renderAll(); toast(T('listingsLoaded')(r.added, r.updated));
  }
  function load(obj) { if (Sync.planId && !ioAllowed()) { toast(T('ioLocked')); return; } const cat = window.NaduSdm.listingsOf(obj); if (cat) { loadListings(cat, obj.files || (obj.data && obj.data.files)); return; } const files = obj && obj.files; if (obj && obj.app === 'nadu-wedding' && obj.data) obj = Object.assign({}, S, obj.data); if (files && Sync.plan && Sync.plan.writable) loadFiles(files); if (!valid(obj)) { toast(T('badJson')); return; } const keepPrefs = {}; PREFS.forEach((k) => { keepPrefs[k] = S[k]; }); S = Object.assign(obj, keepPrefs); Sync.importing = true; ensureShape(); save(); renderAll(); toast(T('loaded')); }
  $('io-load').addEventListener('click', () => { try { load(JSON.parse($('io-text').value)); } catch (e) { toast(T('readFail')); } });
  window.NaduDrop($('io-file'), { textKey: 'dzJson', hintKey: 'dzJsonHint', icon: '⇪' });
  $('io-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { load(JSON.parse(r.result)); } catch (er) { toast(T('fileFail')); } }; r.readAsText(f); e.target.value = ''; });
  const rb = $('btn-reset');
  rb.addEventListener('click', () => {
    if (rb.dataset.arm) { const keep = {}; PREP_KEYS.concat(['lang']).forEach((k) => { keep[k] = S[k]; }); S = DEFAULTS(); Object.assign(S, keep); save(); renderAll(); toast(T('resetDone')); delete rb.dataset.arm; return; }
    rb.dataset.arm = '1'; rb.textContent = T('resetConfirm');
    setTimeout(() => { delete rb.dataset.arm; rb.textContent = T('reset'); }, 3000);
  });

  // ================= wedding prep: dashboard, checklist, spending & split, guests, gifts, vendors =================
  const STAGES = [
    { id: 'd365', off: -365, label: 'D-365', ko: '약 12개월 전', en: '~12 months out', items: [
      ['a', '결혼 날짜 대략 정하기', 'Pick a rough wedding date', 1],
      ['a', '예식 스타일 정하기 (호텔·컨벤션·하우스·스몰)', 'Decide the venue style (hotel, convention hall, house, small)'],
      ['b', '웨딩홀 투어 시작', 'Start touring wedding halls'],
      ['c', '예산 큰 틀 잡기', 'Set the overall budget']],
      tip: ['날짜가 정해져야 웨딩홀·스드메 일정이 전부 움직여요', 'Every venue and studio/dress/makeup booking hangs on the date'] },
    { id: 'd300', off: -300, label: 'D-300', ko: '약 10개월 전', en: '~10 months out', items: [
      ['a', '신혼집 방향 논의 (매매·전세·월세)', 'Talk about the new home: buy, jeonse lease or monthly rent'],
      ['b', '웨딩홀 계약', 'Book the wedding hall', 1],
      ['b', '스드메 상담 및 계약', 'Consult and book studio, dress and makeup (“seudeume”)', 1],
      ['b', '본식촬영 진행 여부 결정', 'Decide on ceremony-day photography'],
      ['c', '결혼 예산 세부화', 'Break the budget down in detail']],
      tip: ['스드메 계약 시 원본 제공 여부와 추가 비용을 꼭 확인하세요', 'When booking the studio package, check whether original photo files are included and what extras cost'] },
    { id: 'd240', off: -240, label: 'D-240', ko: '약 8개월 전', en: '~8 months out', items: [
      ['a', '예단·혼수 등 상의', 'Discuss yedan (gifts between families) and household items'],
      ['b', '드레스투어 후 샵 결정', 'Tour dress shops and pick one', 1],
      ['b', '예복 준비 시작', "Start on the groom's suit"],
      ['c', '신혼집 계약 또는 인테리어 계획', 'Sign for the home or plan the interior']] },
    { id: 'd150', off: -150, label: 'D-150', ko: '약 5개월 전', en: '~5 months out', items: [
      ['a', '예물·예단·반지 준비', 'Prepare wedding gifts, yedan and rings'],
      ['b', '혼주예복 준비', 'Arrange outfits for both sets of parents'],
      ['b', '한복 맞춤·대여 결정', 'Decide on custom or rental hanbok', 1],
      ['b', '본식 헤어·메이크업 상담', 'Hair and makeup consultation for the day'],
      ['c', '스킨·바디케어', 'Skin and body care']],
      tip: ['한복 제작은 평균 4~5주 걸려요. 촬영·본식 일정에서 역산해 두세요', 'Custom hanbok takes 4 to 5 weeks, so count back from the shoot and ceremony dates'] },
    { id: 'd100', off: -100, label: 'D-100', ko: '약 3개월 전', en: '~3 months out', items: [
      ['a', '하객 수 점검', 'Estimate the guest count'],
      ['a', '웨딩 연주·축가 확인', 'Line up live music and the wedding song'],
      ['b', '웨딩촬영', 'Pre-wedding photo shoot', 1],
      ['b', '한복·예복·예물 픽업', 'Pick up hanbok, suit and gifts'],
      ['c', '혼수가전 준비', 'Buy home appliances']] },
    { id: 'd60', off: -60, label: 'D-60', ko: '약 2개월 전', en: '~2 months out', items: [
      ['a', '주례·사회·축가 섭외', 'Ask the officiant, MC and singer'],
      ['a', '하객 리스트 1차 정리', 'First pass at the guest list'],
      ['b', '사진 셀렉 및 액자 주문', 'Select photos and order frames'],
      ['b', '양가 어머님 한복 맞춤', 'Hanbok fittings for both mothers'],
      ['b', '양가 아버님 예복 맞춤', 'Suit fittings for both fathers'],
      ['c', '청첩장 디자인 선택', 'Choose the invitation design'],
      ['c', '신혼집 인테리어', 'Interior work on the home']] },
    { id: 'd45', off: -45, label: 'D-45', ko: '약 1.5개월 전', en: '~6 weeks out', items: [
      ['a', '식순 구성 논의', 'Plan the order of the ceremony'],
      ['b', '한복 피팅 및 최종 확정', 'Final hanbok fitting', 1],
      ['b', '본식 영상 제작 여부 결정', 'Decide on a ceremony video'],
      ['c', '청첩장 발송', 'Send invitations', 1]] },
    { id: 'd30', off: -30, label: 'D-30', ko: '약 1개월 전', en: '~1 month out', items: [
      ['a', '양가 접수대·가방친구 섭외', "Ask friends to run each family's reception desk and be the bride's helper (“bag friend”)"],
      ['a', '웨딩홀 시식', 'Menu tasting at the hall'],
      ['a', '성혼선언문·혼인서약서 준비', 'Write the marriage declaration and vows', 1],
      ['b', '본식 드레스 셀렉', 'Pick the ceremony dress', 1],
      ['b', '혼주 메이크업 최종 체크', 'Confirm makeup for the parents'],
      ['b', '식전영상 완성', 'Finish the pre-ceremony video'],
      ['b', '본식 BGM 확정', 'Lock the ceremony music'],
      ['c', '모바일 청첩장', 'Send the mobile invitation'],
      ['c', '답례품 수량 체크 및 구매', 'Count and buy guest favors']],
      tip: ['성혼선언문·혼인서약서는 미리 초안을 잡아두면 훨씬 수월해요', 'Drafting the declaration and vows early makes this much easier'] },
    { id: 'd14', off: -14, label: 'D-14', ko: '1~2주 전', en: '1 to 2 weeks out', items: [
      ['a', '예식 리허설 일정 확인', 'Confirm the rehearsal time'],
      ['a', '혼주·신랑신부 동선 공유', "Walk both families through the day's movements"],
      ['a', '웨딩카·주차 안내 체크', 'Check the wedding car and parking info'],
      ['b', '부케 선택', 'Choose the bouquet'],
      ['c', '하객 최종 인원 전달', 'Send the final guest count to the hall'],
      ['c', '가벼운 수분 관리', 'Light hydration care']] },
    { id: 'd7', off: -7, label: 'D-7', ko: '1주 전', en: '1 week out', items: [
      ['a', '허니문 짐 꾸리기·환전', 'Pack for the honeymoon and exchange currency'],
      ['a', '식순 최종 점검', 'Final check of the ceremony order'],
      ['a', 'BGM 최종 점검', 'Final check of the music']] },
    { id: 'd1', off: -1, label: 'D-1', ko: '전날', en: 'The day before', items: [
      ['a', '주례·사회·접수대 점검', 'Reconfirm officiant, MC and reception desk'],
      ['a', '축가 점검', 'Reconfirm the wedding song'],
      ['b', '예복·한복 픽업', 'Pick up suit and hanbok'],
      ['b', 'DP 액자·포토테이블 준비', 'Prepare display frames and the photo table'],
      ['b', '사례비 준비', 'Prepare thank-you fee envelopes']] },
    { id: 'd0', off: 0, label: 'D-DAY', ko: '당일', en: 'Wedding day', items: [
      ['a', '식 1시간 반 전 도착', 'Arrive 1.5 hours early', 1],
      ['a', '혼인서약서 출력본·반지 챙기기', 'Bring the printed vows and rings'],
      ['b', '예복·한복·액자 챙기기', 'Bring suit, hanbok and frames'],
      ['b', '부모님 전달 물품 확인', 'Check the items to hand to parents'],
      ['c', '축의금 담당자 확인', 'Confirm who handles the gift money']] },
    { id: 'after', off: 14, label: '예식 후', labelEn: 'After', ko: '예식 후', en: 'After the wedding', items: [
      ['a', '주례·사회 감사 인사', 'Thank the officiant and MC'],
      ['c', '답례장 발송', 'Send thank-you notes']] }
  ];
  STAGES.forEach((s) => { s.items = s.items.map((it, i) => ({ id: s.id + '-' + (i + 1), cat: it[0], ko: it[1], en: it[2], key: !!it[3] })); });
  const LCATS = { a: { ko: '예식·신혼여행', en: 'Ceremony & honeymoon' }, b: { ko: '웨딩패키지·한복·예복', en: 'Package, hanbok & suits' }, c: { ko: '혼수·신혼집·기타', en: 'Home & everything else' } };
  const BCATS = [['hall', '웨딩홀 (대관·식대)', 'Venue & catering'], ['sdm', '스드메', 'Studio, dress & makeup'], ['snap', '본식 스냅·영상', 'Ceremony photo & video'],
    ['jewel', '예물·반지', 'Rings & jewelry'], ['yedan', '예단·폐백', 'Yedan & pyebaek'], ['hanbok', '혼주 한복', "Parents' hanbok"], ['attire', '신랑 예복 (턱시도)', "Groom's tuxedo"],
    ['invite', '청첩장·답례품', 'Invitations & favors'], ['honey', '신혼여행', 'Honeymoon'], ['house', '신혼집 (자기자본)', 'New home (down payment)'], ['home', '혼수·가전', 'Appliances & household'], ['car', '중고차', 'Used car'], ['etc', '기타', 'Other']];
  const PARTIES = [['g', '신랑', 'Groom'], ['b', '신부', 'Bride'], ['gp', '신랑 부모님', "Groom's parents"], ['bp', '신부 부모님', "Bride's parents"]];
  const pick3 = (arr, k) => { const r = arr.find((x) => x[0] === k); return r ? (isKo() ? r[1] : tx(r[2])) : k; };
  const cname = (k) => pick3(BCATS, k), pname = (k) => pick3(PARTIES, k);

  Object.assign(L.ko, {
    eyebrow: 'Nadu Wedding Planner · 나두 웨딩 플래너', tDash: '대시보드', tPlan: '예산 계획', tList: '체크리스트', tSpend: '지출·정산', tGuests: '하객', tGifts: '축의금', tVendors: '업체 비교', tSdm: '스드메',
    wd: '예식 날짜', prog: '준비 진행률', nodate: '예식 날짜를 넣으면 단계별 실제 날짜가 계산돼요', dday: '예식 당일',
    all: '전체', open: '남은 일', late: '밀린 일', key: '핵심', tipL: 'TIP', add: '추가', addph: '우리만의 할 일 추가', now: '지금 할 차례', overdue: '밀린 일 ', mine: '직접 추가',
    dUp: '다가오는 할 일', dStage: '시기별 진행률', upEmpty: '남은 할 일이 없어요', upNoDate: '예식 날짜를 넣으면 날짜순으로 보여드려요',
    kDday: 'D-day', kProg: '준비 진행률', kPaid: '결제 완료', kPlanned: '결제 예정', kGuests: '참석 확정 하객', kMeal: '예상 식권', unitP: '명', unitT: '장', kGiftTotal: '받은 축의금', vsPlan: '계획 예상', planSnap: '예산 계획 최적안',
    stage: '시기', tasks: '할 일', done: '완료', rate: '진행률',
    spendTitle: '지출 내역', byCat: '카테고리별 지출', planTotal: '계획 결혼 총액 (선택 옵션)', sumAll: '합계',
    fCat: '카테고리', fItem: '항목', fAmt: '금액', fStatus: '상태', fPaidBy: '낸 사람', fMemo: '메모', fOwnSplit: '이 항목만 비율 따로', save: '저장', cancel: '취소', update: '수정 저장', edit: '수정',
    phExp: '예: 웨딩홀 계약금', expPaid: '결제 완료', expPlanned: '결제 예정', expEmpty: '아직 지출이 없어요. 위에서 첫 지출을 넣어보세요',
    sTitle: '양가 분담 정산', sHint: '결제 완료 금액 기준이에요. 비율만 정하면 각자 부담액과 송금할 금액이 나와요.', sTransfers: '이렇게 보내면 돼요', sOwe: '부담할 금액', sPaid: '실제 낸 금액', sBal: '차액 (+ 받을 돈 / − 보낼 돈)', party: '구분', noTransfer: '보낼 돈이 없어요. 모두 딱 맞게 냈어요', sepNote: '받을 돈이 있는 사람 순서로 최소 횟수만 보내도록 계산했어요. 원 단위 반올림으로 1원 정도 차이가 날 수 있어요.', nTransfers: (k) => `송금 ${k}건`,
    guestTitle: '하객 명단', gRate: '미정 하객 참석률 (%)', fName: '이름', fSide: '측', fGroup: '그룹', fCount: '인원', fAttend: '참석', phGroup: '예: 회사, 대학 동기', phSearch: '이름·그룹 검색',
    sideG: '신랑측', sideB: '신부측', sideAll: '양측 전체', aYes: '참석', aMaybe: '미정', aNo: '불참', aAll: '참석 여부 전체',
    kYes: '참석 확정', kMaybe: '미정', kInvited: '전체 인원', guestEmpty: '하객을 추가하면 식권 수가 자동으로 계산돼요', useCount: (k) => `예상 식권 ${k}장을 예산 하객 수로 쓰기`, usedCount: '예산 계획의 하객 수를 바꿨어요',
    giftTitle: '받은 축의금', fThanked: '감사 인사 완료', phGiftMemo: '예: 대학 동기, 계좌 입금', phSearchGift: '이름으로 검색', kGiftG: '신랑측', kGiftB: '신부측', kThanks: '감사 인사 남음', giftEmpty: '받은 축의금을 기록하면 이름으로 바로 찾을 수 있어요', thanked: '감사 인사',
    vendorTitle: '업체 비교', vHint: '같은 카테고리 안에서 최종가가 가장 낮은 곳은 초록색으로 표시돼요. 결정한 업체는 지출 내역에 결제 예정으로 바로 넣을 수 있어요.', fVendor: '업체명', fQuote: '첫 견적', fFinal: '최종가', phVendorMemo: '예: 원본 제공, 추가금 조건',
    savedL: '절감', pickL: '결정', pickedL: '결정됨', toExp: '지출에 넣기', inExp: '지출에 있음', vendorEmpty: '견적 받은 업체를 넣으면 카테고리별로 나란히 비교돼요', nVendors: (k) => `업체 ${k}곳`, addedExp: '지출 내역에 결제 예정으로 넣었어요',
    repPrep: '준비 현황', repSpend: '지출·정산', repPeople: '하객·축의금', repNotes: '메모 전체',
    noteOpen: '크게 열어서 쓰기', noteDone: '완료', noteChars: (k) => `${k.toLocaleString()}자`, noteNone: '아직 메모가 없어요'
  });
  Object.assign(L.en, {
    eyebrow: 'Nadu Wedding Planner', tDash: 'Dashboard', tPlan: 'Budget plan', tList: 'Checklist', tSpend: 'Spending & split', tGuests: 'Guests', tGifts: 'Gift money', tVendors: 'Vendors', tSdm: 'Studio & dress',
    wd: 'Wedding date', prog: 'Progress', nodate: 'Set the wedding date to see real dates for each stage', dday: 'Wedding day',
    all: 'All', open: 'To do', late: 'Overdue', key: 'Key', tipL: 'TIP', add: 'Add', addph: 'Add our own task', now: 'Up now', overdue: 'Overdue ', mine: 'Added by us',
    dUp: 'Coming up', dStage: 'Progress by stage', upEmpty: 'Nothing left to do', upNoDate: 'Set the wedding date to sort these by date',
    kDday: 'D-day', kProg: 'Progress', kPaid: 'Paid', kPlanned: 'Still to pay', kGuests: 'Confirmed guests', kMeal: 'Meal tickets est.', unitP: '', unitT: '', kGiftTotal: 'Gift money received', vsPlan: 'Plan expects', planSnap: 'Best plan option',
    stage: 'Stage', tasks: 'Tasks', done: 'Done', rate: 'Progress',
    spendTitle: 'Expenses', byCat: 'Spending by category', planTotal: 'Planned wedding total (selected option)', sumAll: 'Total',
    fCat: 'Category', fItem: 'Item', fAmt: 'Amount (KRW)', fStatus: 'Status', fPaidBy: 'Paid by', fMemo: 'Note', fOwnSplit: 'Custom split for this item', save: 'Save', cancel: 'Cancel', update: 'Save changes', edit: 'Edit',
    phExp: 'e.g. Venue deposit', expPaid: 'Paid', expPlanned: 'To pay', expEmpty: 'No expenses yet. Add the first one above',
    sTitle: 'Family cost split', sHint: 'Based on paid amounts. Set the ratio and you get what each person owes and who sends what to whom.', sTransfers: 'Transfers to settle up', sOwe: 'Share owed', sPaid: 'Actually paid', sBal: 'Balance (+ receives / − sends)', party: 'Who', noTransfer: 'Nothing to send. Everyone paid exactly their share', sepNote: 'Worked out with the fewest transfers. Rounding to the won can leave about 1 won of difference.', nTransfers: (k) => `${k} transfer${k === 1 ? '' : 's'}`,
    guestTitle: 'Guest list', gRate: 'Attendance rate for maybes (%)', fName: 'Name', fSide: 'Side', fGroup: 'Group', fCount: 'People', fAttend: 'Coming', phGroup: 'e.g. Work, uni friends', phSearch: 'Search name or group',
    sideG: "Groom's side", sideB: "Bride's side", sideAll: 'Both sides', aYes: 'Yes', aMaybe: 'Maybe', aNo: 'No', aAll: 'Any answer',
    kYes: 'Confirmed', kMaybe: 'Maybe', kInvited: 'Total people', guestEmpty: 'Add guests and meal tickets are worked out for you', useCount: (k) => `Use ${k} meal tickets as the plan's guest count`, usedCount: 'Updated the guest count in the budget plan',
    giftTitle: 'Gift money received', fThanked: 'Thank-you sent', phGiftMemo: 'e.g. uni friend, bank transfer', phSearchGift: 'Search by name', kGiftG: "Groom's side", kGiftB: "Bride's side", kThanks: 'Thank-yous left', giftEmpty: 'Log gift money here and find anyone by name later', thanked: 'Thanked',
    vendorTitle: 'Vendor comparison', vHint: 'The lowest final price in each category shows in green. Once you pick a vendor you can add it to expenses as an upcoming payment.', fVendor: 'Vendor', fQuote: 'First quote', fFinal: 'Final price', phVendorMemo: 'e.g. original files included, extra fees',
    savedL: 'Saved', pickL: 'Pick', pickedL: 'Picked', toExp: 'Add to expenses', inExp: 'In expenses', vendorEmpty: 'Add vendor quotes to compare them side by side', nVendors: (k) => `${k} vendor${k === 1 ? '' : 's'}`, addedExp: 'Added to expenses as an upcoming payment',
    repPrep: 'Preparation', repSpend: 'Spending & split', repPeople: 'Guests & gift money', repNotes: 'All notes',
    noteOpen: 'Open a larger editor', noteDone: 'Done', noteChars: (k) => `${k.toLocaleString()} characters`, noteNone: 'No notes yet'
  });

  function ensurePrep() {
    S.wedding = S.wedding || ''; S.checks = S.checks || {}; S.tasks = S.tasks || [];
    S.expenses = S.expenses || []; S.split = S.split || { g: 25, b: 25, gp: 25, bp: 25 };
    S.guests = S.guests || []; S.guestRate = S.guestRate ?? 60; S.giftLog = S.giftLog || []; S.vendors = S.vendors || [];
    S.sdmCatalog = S.sdmCatalog || { studios: [], dresses: [], tux: [], makeup: [], hair: [] }; S.sdm = S.sdm || window.NaduSdm.emptyPicks();
    if (!S.tab) S.tab = 'dash';
  }
  const PREP_KEYS = ['wedding', 'checks', 'tasks', 'expenses', 'split', 'guests', 'guestRate', 'giftLog', 'vendors', 'sdm', 'sdmCatalog', 'tab', 'skin', 'collapsed'];

  // ---------- dates ----------
  const dayNum = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
  const todayNum = () => { const x = new Date(); return Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / 864e5; };
  const MON = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  function fmtDay(v) { const d = new Date(v * 864e5), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate(), w = d.getUTCDay();
    if (S.lang === 'ko') return `${y}.${m}.${dd} (${'일월화수목금토'[w]})`;
    if (S.lang === 'en') return `${'Sun Mon Tue Wed Thu Fri Sat'.split(' ')[w]}, ${MON[m - 1]} ${dd} ${y}`;
    return d.toLocaleDateString(locale(), { timeZone: 'UTC', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }); }
  function fmtShort(v) {
    const d = new Date(v * 864e5);
    if (S.lang === 'ko') return `${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
    if (S.lang === 'en') return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
    return d.toLocaleDateString(locale(), { timeZone: 'UTC', month: 'short', day: 'numeric' });
  }
  const stageDate = (s) => S.wedding ? dayNum(S.wedding) + s.off : null;
  const stageOf = (id) => STAGES.find((s) => s.id === id);
  const stageLabel = (s) => !isKo() && s.labelEn ? tx(s.labelEn) : s.label;
  function allItems() {
    const out = [];
    STAGES.forEach((s) => s.items.forEach((it) => out.push({ ...it, stage: s.id })));
    S.tasks.forEach((c) => { if (stageOf(c.stage)) out.push({ id: c.id, cat: c.cat, ko: c.text, en: c.text, stage: c.stage, custom: true }); });
    return out;
  }
  const isDone = (id) => !!(S.checks[id] && S.checks[id].done);
  const isLate = (it) => S.wedding && stageDate(stageOf(it.stage)) < todayNum() && !isDone(it.id);
  function ddText() {
    if (!S.wedding) return ['D-?', T('nodate')];
    const diff = dayNum(S.wedding) - todayNum();
    return [diff > 0 ? 'D-' + diff : diff === 0 ? 'D-DAY' : 'D+' + (-diff), diff === 0 ? T('dday') : fmtDay(dayNum(S.wedding))];
  }
  const pctOf = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;
  const pbar = (p, done) => el('div', { class: 'pbar' + (done ? ' done' : '') }, el('i', { style: `width:${Math.min(100, p)}%` }));
  const tile = (k, v, s, cls) => el('div', { class: 'stat' }, el('div', { class: 'k', text: k }), el('div', { class: 'v ' + (cls || ''), text: v }), el('div', { class: 's', text: s || '' }));
  const people = (k) => S.lang === 'ko' ? `${k}${T('unitP')}` : String(k);
  function thead(tbl, cols) { tbl.append(el('thead', {}, el('tr', {}, cols.map(([k, cls]) => el('th', { class: cls || '', text: k }))))); }
  function emptyRow(tb, span, msg) { tb.append(el('tr', {}, el('td', { class: 'empty-row', colspan: span, text: msg }))); }
  function rowActs(onEdit, onDel) { return el('td', {}, el('div', { class: 'rowacts' }, onEdit ? Object.assign(el('button', { type: 'button', text: T('edit') }), { onclick: onEdit }) : null, delBtn('Delete', onDel))); }

  // ---------- header, tabs ----------
  const TABS = [['dash', 'tDash'], ['plan', 'tPlan'], ['list', 'tList'], ['spend', 'tSpend'], ['guests', 'tGuests'], ['gifts', 'tGifts'], ['sdm', 'tSdm'], ['vendors', 'tVendors'], ['history', 'tHistory'], ['settings', 'tSettings'], ['admin', 'tAdmin']];
  function renderTabs() {
    const nav = $('tabs'); nav.innerHTML = '';
    visibleTabs().forEach(([k, lab]) => {
      const b = el('button', { type: 'button', role: 'tab', 'aria-selected': String(S.tab === k), id: 'tab-' + k, text: T(lab) });
      b.addEventListener('click', () => { S.tab = k; save(); applyTab(); window.scrollTo({ top: 0 }); });
      nav.append(b);
    });
  }
  const visibleTabs = () => TABS.filter(([k]) => k !== 'admin' || (Sync.me && Sync.me.is_admin));
  function applyTab() {
    if (!visibleTabs().some(([k]) => k === S.tab)) S.tab = 'dash';
    document.querySelectorAll('.tabpanel').forEach((p) => p.classList.toggle('off', p.dataset.panel !== S.tab));
    TABS.forEach(([k]) => $('tab-' + k)?.setAttribute('aria-selected', String(k === S.tab)));
    renderPanel();
  }
  function renderPanel() { ({ dash: renderDash, list: renderList, spend: renderSpend, guests: renderGuests, gifts: renderGifts, vendors: renderVendors, sdm: renderSdm, history: () => renderHistory(true), settings: renderSettings, admin: renderAdmin }[S.tab] || (() => {}))(); prepSums(); }
  function renderHeader() {
    const h = $('title-h1'); h.innerHTML = '';
    const pl = Sync.plan || {};
    if (pl.partner_a || pl.partner_b) h.append(pl.partner_a || '', el('span', { class: 'amp', text: ' & ' }), pl.partner_b || '');
    else h.append(pl.name || 'Nadu Wedding Planner');
    const [main, sub] = ddText(); const c = $('dd-count'); c.firstChild.textContent = main; $('dd-sub').textContent = sub;
    if (document.activeElement !== $('wd')) $('wd').value = S.wedding || '';
    const items = allItems(), d = items.filter((i) => isDone(i.id)).length;
    $('prog-n').textContent = d; $('prog-t').textContent = items.length; $('prog-bar').style.width = (items.length ? d / items.length * 100 : 0) + '%';
  }
  $('wd').addEventListener('change', (e) => { S.wedding = e.target.value; save(); renderHeader(); renderPanel(); });

  // ---------- derived ----------
  const expTotals = () => { let paid = 0, planned = 0; S.expenses.forEach((e) => { if (e.status === 'paid') paid += n(e.amount); else planned += n(e.amount); }); return { paid, planned }; };
  function guestStats() {
    const rate = Math.min(100, Math.max(0, n(S.guestRate))) / 100;
    const c = (st) => S.guests.filter((x) => x.status === st).reduce((a, x) => a + Math.max(1, n(x.count)), 0);
    const yes = c('yes'), maybe = c('maybe'), no = c('no');
    return { yes, maybe, no, all: yes + maybe + no, meal: yes + Math.round(maybe * rate) };
  }
  function giftTotals() { const t = { total: 0, g: 0, b: 0, left: 0 }; S.giftLog.forEach((x) => { t.total += n(x.amount); t[x.side === 'b' ? 'b' : 'g'] += n(x.amount); if (!x.thanked) t.left++; }); return t; }
  function settle() {
    const keys = ['g', 'b', 'gp', 'bp'], owe = { g: 0, b: 0, gp: 0, bp: 0 }, paid = { g: 0, b: 0, gp: 0, bp: 0 };
    S.expenses.filter((e) => e.status === 'paid').forEach((e) => {
      const r = e.split && keys.some((k) => n(e.split[k]) > 0) ? e.split : S.split;
      const tot = keys.reduce((a, k) => a + n(r[k]), 0) || 1;
      keys.forEach((k) => { owe[k] += n(e.amount) * n(r[k]) / tot; });
      if (paid[e.paidBy] != null) paid[e.paidBy] += n(e.amount);
    });
    keys.forEach((k) => { owe[k] = Math.round(owe[k]); });
    const bal = {}; keys.forEach((k) => { bal[k] = paid[k] - owe[k]; });
    const cr = keys.filter((k) => bal[k] > 0).map((k) => ({ k, v: bal[k] })).sort((a, b) => b.v - a.v);
    const de = keys.filter((k) => bal[k] < 0).map((k) => ({ k, v: -bal[k] })).sort((a, b) => b.v - a.v);
    const tr = []; let i = 0, j = 0;
    while (i < de.length && j < cr.length) { const x = Math.min(de[i].v, cr[j].v); if (x >= 1) tr.push({ from: de[i].k, to: cr[j].k, amt: x }); de[i].v -= x; cr[j].v -= x; if (de[i].v < 1) i++; if (cr[j].v < 1) j++; }
    return { owe, paid, bal, tr, keys };
  }
  function prepSums() {
    const set = (k, v) => document.querySelectorAll(`[data-sum="${k}"]`).forEach((e) => { e.textContent = v; });
    const items = allItems(), d = items.filter((i) => isDone(i.id)).length, et = expTotals(), gs = guestStats();
    set('sec:dash', ddText()[0]); set('sec:list', `${d} / ${items.length}`);
    set('sec:spend', `${T('kPaid')} ${kr(et.paid)}`); set('sec:settle', T('nTransfers')(settle().tr.length));
    set('sec:guests', `${T('kMeal')} ${gs.meal}`); set('sec:gifts', kr(giftTotals().total)); set('sec:vendors', T('nVendors')(S.vendors.length));
  }

  // ---------- dashboard ----------
  function renderDash() {
    const M = model(), items = allItems(), d = items.filter((i) => isDone(i.id)).length, et = expTotals(), gs = guestStats(), gt = giftTotals();
    const [main, sub] = ddText();
    const tl = $('dash-tiles'); tl.innerHTML = '';
    const plan = el('button', { type: 'button', class: 'stat' }, el('div', { class: 'k', text: T('planSnap') }), el('div', { class: 'v ' + (M.best ? '' : 'bad'), text: M.best ? nm(M.best.v) : '—' }), el('div', { class: 's', text: M.best ? `${T('colFinal')} ${kr(M.best.final)}` : T('noFit') }));
    plan.addEventListener('click', () => { S.tab = 'plan'; save(); applyTab(); window.scrollTo({ top: 0 }); });
    tl.append(tile(T('kDday'), main, sub), tile(T('kProg'), pctOf(d, items.length) + '%', `${d} / ${items.length}`),
      tile(T('kPaid'), kr(et.paid), `${T('kPlanned')} ${kr(et.planned)}`), tile(T('kGuests'), people(gs.yes), `${T('kMeal')} ${gs.meal}${T('unitT')}`),
      tile(T('kGiftTotal'), kr(gt.total), M.sel ? `${T('vsPlan')} ${kr(M.sel.gift)}` : ''), plan);
    const up = $('upnext'); up.innerHTML = '';
    const open = items.filter((i) => !isDone(i.id));
    if (!open.length) up.append(el('li', {}, el('span', { class: 't', text: T('upEmpty') })));
    else {
      open.slice().sort((x, y) => stageOf(x.stage).off - stageOf(y.stage).off).slice(0, 7).forEach((it) => {
        const s = stageOf(it.stage);
        up.append(el('li', { class: isLate(it) ? 'late' : '' }, el('span', { class: 't', text: nm(it) }), el('span', { class: 'd', text: S.wedding ? fmtShort(stageDate(s)) : stageLabel(s) })));
      });
      if (!S.wedding) up.append(el('li', {}, el('span', { class: 'd', text: T('upNoDate') })));
    }
    const sp = $('stageprog'); sp.innerHTML = '';
    thead(sp, [[T('stage'), 'l'], [T('tasks')], [T('done')], [T('rate'), 'l']]);
    const tb = el('tbody');
    STAGES.forEach((s) => {
      const its = items.filter((i) => i.stage === s.id), dn = its.filter((i) => isDone(i.id)).length, p = pctOf(dn, its.length), late = its.filter(isLate).length;
      tb.append(el('tr', {}, el('td', { class: 'l' }, stageLabel(s), late ? el('span', { class: 'chip bad', style: 'margin-left:6px', text: T('overdue') + late }) : null),
        el('td', { class: 'n', text: its.length }), el('td', { class: 'n', text: dn }),
        el('td', { class: 'l' }, el('div', { class: 'mini' }, pbar(p, p === 100), el('span', { class: 'mono small', text: p + '%' })))));
    });
    sp.append(tb);
  }

  // ---------- checklist ----------
  let listFilter = 'all';
  function renderList() {
    const items = allItems(), today = todayNum(), now = S.wedding ? STAGES.find((s) => stageDate(s) >= today) : null;
    const fl = $('list-filters'); fl.innerHTML = '';
    const counts = { all: items.length, open: items.filter((i) => !isDone(i.id)).length, late: items.filter(isLate).length };
    ['all', 'open', 'late'].forEach((f) => {
      if (f === 'late' && !S.wedding) return;
      const b = el('button', { type: 'button', class: 'chipbtn' + (f === 'late' ? ' late' : ''), 'aria-pressed': String(listFilter === f) }, T(f), el('span', { class: 'n', text: counts[f] }));
      b.addEventListener('click', () => { listFilter = f; renderList(); });
      fl.append(b);
    });
    const keep = {}; document.querySelectorAll('.adder input').forEach((i) => { keep[i.id] = i.value; });
    const box = $('stages'); box.innerHTML = ''; box.classList.toggle('hidefilter', listFilter !== 'all');
    STAGES.forEach((s) => {
      const sec = el('div', { class: 'stage' }), sd = stageDate(s);
      if (sd !== null && sd < today) sec.classList.add('past'); if (now && now.id === s.id) sec.classList.add('now');
      const sItems = items.filter((i) => i.stage === s.id);
      const visible = sItems.filter((i) => listFilter === 'all' || (listFilter === 'open' && !isDone(i.id)) || (listFilter === 'late' && isLate(i)));
      if (!visible.length && listFilter !== 'all') sec.classList.add('nomatch');
      const lateN = sItems.filter(isLate).length;
      const when = el('div', { class: 'when' }, el('span', { class: 'dlabel', text: stageLabel(s) }), el('span', { class: 'whensub', text: nm(s) }));
      if (sd !== null) when.append(el('span', { class: 'whendate', text: (s.id === 'after' ? '~ ' : '') + fmtDay(sd) }));
      if (now && now.id === s.id) when.append(el('span', { class: 'pill', text: T('now') })); else if (lateN) when.append(el('span', { class: 'pill late', text: T('overdue') + lateN }));
      const cols = el('div', { class: 'cols' });
      ['a', 'b', 'c'].forEach((cat) => {
        const list = visible.filter((i) => i.cat === cat);
        const ul = el('ul', { class: 'items' });
        list.forEach((it) => {
          const done = isDone(it.id);
          const cb = el('input', { type: 'checkbox', class: 'ck', id: 'ck-' + it.id }); cb.checked = done;
          cb.addEventListener('change', () => { S.checks[it.id] = { done: cb.checked, at: new Date().toISOString() }; save(); renderHeader(); renderList(); prepSums(); });
          const lb = el('label', { for: cb.id }, el('span', { class: 't', text: nm(it) }), it.key ? el('span', { class: 'key', text: T('key') }) : null, it.custom ? el('span', { class: 'mine', text: T('mine') }) : null);
          const li = el('li', { class: 'item' + (done ? ' done' : '') + (isLate(it) ? ' late' : '') }, cb, lb);
          if (it.custom) li.append(delBtn('Delete', () => { S.tasks = S.tasks.filter((x) => x.id !== it.id); delete S.checks[it.id]; save(); renderHeader(); renderList(); }));
          ul.append(li);
        });
        cols.append(el('div', { class: 'col' + (list.length ? '' : ' empty') }, el('h3', { text: nm(LCATS[cat]) }), ul));
      });
      const body = el('div', {}, cols);
      if (s.tip && listFilter === 'all') body.append(el('div', { class: 'stip' }, el('b', { text: T('tipL') }), el('span', { text: isKo() ? s.tip[0] : tx(s.tip[1]) })));
      sec.append(when, body);
      if (listFilter === 'all') {
        const inp = el('input', { id: 'add-' + s.id, placeholder: T('addph'), maxlength: 80, 'aria-label': T('addph') }); inp.value = keep[inp.id] || '';
        const sel = el('select', { id: 'addcat-' + s.id, 'aria-label': T('fCat') }, ['a', 'b', 'c'].map((k) => el('option', { value: k, text: nm(LCATS[k]) })));
        const ad = el('form', { class: 'adder' }, inp, sel, el('button', { type: 'submit', text: T('add') }));
        ad.addEventListener('submit', (e) => { e.preventDefault(); const v = inp.value.trim(); if (!v) return; inp.value = ''; S.tasks.push({ id: 'c' + uid(), stage: s.id, cat: sel.value, text: v }); save(); renderHeader(); renderList(); $('add-' + s.id)?.focus(); });
        sec.append(ad);
      }
      box.append(sec);
    });
  }

  // ---------- entry forms ----------
  function entryForm(id, fields, onSubmit) {
    const f = el('form', { class: 'entry', id });
    fields.forEach((fd) => {
      const iid = `${id}-${fd.name}`; let inp;
      if (fd.type === 'check') { inp = el('input', { type: 'checkbox', id: iid, name: fd.name }); f.append(el('label', { class: 'check' + (fd.wide ? ' wide' : ''), for: iid }, inp, fd.label)); return; }
      if (fd.type === 'select') { inp = el('select', { id: iid, name: fd.name }, fd.opts().map(([v, l]) => el('option', { value: v, text: l }))); if (fd.def != null) inp.value = fd.def; }
      else if (fd.type === 'note') {
        const ta = el('textarea', { id: iid, name: fd.name, placeholder: fd.ph || '' });
        f.append(el('label', { class: 'f' + (fd.wide ? ' wide' : ''), for: iid }, fd.label, noteWrap(ta, fd.label)));
        return;
      }
      else {
        inp = el('input', { id: iid, name: fd.name, type: fd.type === 'number' ? 'number' : 'text', placeholder: fd.ph || '', class: fd.type === 'money' ? 'money' : '', inputmode: fd.type === 'money' ? 'numeric' : undefined, min: fd.type === 'number' ? 0 : undefined });
        if (fd.def != null) inp.value = fd.def;
        if (fd.type === 'money') inp.addEventListener('blur', () => { if (inp.value !== '') inp.value = comma(parse(inp.value)); });
      }
      f.append(el('label', { class: 'f' + (fd.wide ? ' wide' : '') + (fd.split ? ' split-f hide' : ''), for: iid }, fd.label, inp));
    });
    const sub = el('button', { type: 'submit', class: 'primary', text: T('save') });
    const cancel = el('button', { type: 'button', text: T('cancel'), hidden: true });
    f.append(el('div', { class: 'acts' }, sub, cancel));
    f._editId = null;
    const showSplit = (on) => f.querySelectorAll('.split-f').forEach((x) => x.classList.toggle('hide', !on));
    if (f.elements.custom) f.elements.custom.addEventListener('change', (e) => showSplit(e.target.checked));
    f.resetForm = () => {
      const keep = {}; f.querySelectorAll('select').forEach((s) => { keep[s.name] = s.value; });
      f.reset(); Object.entries(keep).forEach(([k, v]) => { f.elements[k].value = v; });
      fields.forEach((fd) => { if (fd.def != null && fd.type !== 'select') f.elements[fd.name].value = fd.def; });
      f._editId = null; cancel.hidden = true; sub.textContent = T('save'); f.classList.remove('editing'); showSplit(false);
      f.querySelectorAll('.note-wrap').forEach((w) => w._mark && w._mark());
    };
    cancel.addEventListener('click', f.resetForm);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const o = {}; fields.forEach((fd) => { const x = f.elements[fd.name]; o[fd.name] = fd.type === 'check' ? x.checked : fd.type === 'money' ? parse(x.value) : fd.type === 'number' ? n(x.value) : x.value.trim(); });
      if (onSubmit(o, f._editId) === false) return;
      f.resetForm(); f.querySelector('input:not([type=checkbox]), textarea')?.focus();
    });
    f.edit = (obj) => {
      fields.forEach((fd) => { const x = f.elements[fd.name]; if (fd.type === 'check') x.checked = !!obj[fd.name]; else if (fd.type === 'money') x.value = obj[fd.name] ? comma(obj[fd.name]) : ''; else x.value = obj[fd.name] ?? ''; });
      showSplit(!!(f.elements.custom && f.elements.custom.checked));
      f._editId = obj.id; cancel.hidden = false; sub.textContent = T('update'); f.classList.add('editing');
      f.querySelectorAll('.note-wrap').forEach((w) => w._mark && w._mark());
      f.scrollIntoView({ behavior: 'smooth', block: 'center' }); f.querySelector('input:not([type=checkbox])')?.focus({ preventScroll: true });
    };
    return f;
  }
  const upsert = (arr, id, obj) => { const i = arr.findIndex((x) => x.id === id); if (i >= 0) arr[i] = { ...arr[i], ...obj }; else arr.push({ id: uid(), ...obj }); };
  const opts = {
    cats: () => BCATS.map((c) => [c[0], cname(c[0])]), parties: () => PARTIES.map((p) => [p[0], pname(p[0])]),
    expStatus: () => [['paid', T('expPaid')], ['planned', T('expPlanned')]], sides: () => [['g', T('sideG')], ['b', T('sideB')]],
    attend: () => [['yes', T('aYes')], ['maybe', T('aMaybe')], ['no', T('aNo')]]
  };
  let forms = {};
  function renderPrepForms() {
    forms.exp = entryForm('exp-form', [
      { name: 'cat', type: 'select', label: T('fCat'), opts: opts.cats }, { name: 'name', type: 'text', label: T('fItem'), ph: T('phExp') },
      { name: 'amount', type: 'money', label: T('fAmt') }, { name: 'status', type: 'select', label: T('fStatus'), opts: opts.expStatus },
      { name: 'paidBy', type: 'select', label: T('fPaidBy'), opts: opts.parties }, { name: 'memo', type: 'note', label: T('fMemo'), wide: true },
      { name: 'custom', type: 'check', label: T('fOwnSplit'), wide: true },
      ...PARTIES.map((p) => ({ name: 's' + p[0], type: 'number', label: pname(p[0]), split: true }))
    ], (o, id) => {
      if (!o.name || !o.amount) return false;
      const d = { cat: o.cat, name: o.name, amount: o.amount, status: o.status, paidBy: o.paidBy, memo: o.memo, custom: o.custom, split: o.custom ? { g: o.sg, b: o.sb, gp: o.sgp, bp: o.sbp } : null };
      upsert(S.expenses, id, d); save(); renderSpend(); prepSums();
    });
    forms.guest = entryForm('guest-form', [
      { name: 'name', type: 'text', label: T('fName') }, { name: 'side', type: 'select', label: T('fSide'), opts: opts.sides },
      { name: 'group', type: 'text', label: T('fGroup'), ph: T('phGroup') }, { name: 'count', type: 'number', label: T('fCount'), def: 1 },
      { name: 'status', type: 'select', label: T('fAttend'), opts: opts.attend }, { name: 'memo', type: 'note', label: T('fMemo'), wide: true }
    ], (o, id) => { if (!o.name) return false; upsert(S.guests, id, { ...o, count: Math.max(1, o.count || 1) }); save(); renderGuests(); prepSums(); });
    forms.gift = entryForm('gift-form', [
      { name: 'name', type: 'text', label: T('fName') }, { name: 'side', type: 'select', label: T('fSide'), opts: opts.sides },
      { name: 'amount', type: 'money', label: T('fAmt') }, { name: 'memo', type: 'note', label: T('fMemo'), ph: T('phGiftMemo'), wide: true },
      { name: 'thanked', type: 'check', label: T('fThanked') }
    ], (o, id) => { if (!o.name || !o.amount) return false; upsert(S.giftLog, id, o); save(); renderGifts(); prepSums(); });
    forms.vendor = entryForm('vendor-form', [
      { name: 'cat', type: 'select', label: T('fCat'), opts: opts.cats }, { name: 'name', type: 'text', label: T('fVendor') },
      { name: 'quote', type: 'money', label: T('fQuote') }, { name: 'final', type: 'money', label: T('fFinal') },
      { name: 'memo', type: 'note', label: T('fMemo'), ph: T('phVendorMemo'), wide: true }
    ], (o, id) => { if (!o.name) return false; upsert(S.vendors, id, o); save(); renderVendors(); prepSums(); });
    [['exp-form-host', forms.exp], ['guest-form-host', forms.guest], ['gift-form-host', forms.gift], ['vendor-form-host', forms.vendor]].forEach(([h, f]) => { const host = $(h); host.innerHTML = ''; host.append(f); });
    forms.lang = S.lang;
  }

  // ---------- spending & split ----------
  function renderSpend() {
    const M = model(), et = expTotals();
    const tl = $('spend-tiles'); tl.innerHTML = '';
    tl.append(tile(T('kPaid'), kr(et.paid), won(et.paid)), tile(T('kPlanned'), kr(et.planned), won(et.planned)), tile(T('sumAll'), kr(et.paid + et.planned), won(et.paid + et.planned)),
      tile(T('planTotal'), M.sel ? kr(M.sel.total) : '—', M.sel ? nm(M.sel.v) : ''));
    const tbl = $('exp-table'); tbl.innerHTML = '';
    thead(tbl, [[T('fCat'), 'l'], [T('fItem'), 'l'], [T('fAmt')], [T('fStatus'), 'l'], [T('fPaidBy'), 'l'], [T('fMemo'), 'l'], ['']]);
    const tb = el('tbody'), order = BCATS.map((c) => c[0]);
    const list = S.expenses.slice().sort((a, b) => (a.status === 'paid') - (b.status === 'paid') || order.indexOf(a.cat) - order.indexOf(b.cat));
    if (!list.length) emptyRow(tb, 7, T('expEmpty'));
    list.forEach((x) => tb.append(el('tr', {},
      el('td', { class: 'l', text: cname(x.cat) }), el('td', { class: 'l vname', text: x.name }), el('td', { class: 'n', text: won(n(x.amount)) }),
      el('td', { class: 'l' }, el('span', { class: 'chip ' + (x.status === 'paid' ? 'good' : 'plan'), text: x.status === 'paid' ? T('expPaid') : T('expPlanned') })),
      el('td', { class: 'l', text: pname(x.paidBy) + (x.custom ? ' *' : '') }), noteCell(x.memo),
      rowActs(() => forms.exp.edit(x), () => { S.expenses = S.expenses.filter((y) => y !== x); save(); renderSpend(); prepSums(); }))));
    if (list.length) tb.append(el('tr', { class: 'tot' }, el('td', { class: 'l', colspan: 2, text: T('sumAll') }), el('td', { class: 'n', text: won(et.paid + et.planned) }), el('td', { colspan: 4 })));
    tbl.append(tb);
    const ct = $('cat-table'); ct.innerHTML = '';
    thead(ct, [[T('fCat'), 'l'], [T('kPaid')], [T('kPlanned')], [T('sumAll')]]);
    const ctb = el('tbody');
    BCATS.forEach(([k]) => {
      const rows = S.expenses.filter((x) => x.cat === k); if (!rows.length) return;
      const p = rows.filter((x) => x.status === 'paid').reduce((a, x) => a + n(x.amount), 0), q = rows.filter((x) => x.status !== 'paid').reduce((a, x) => a + n(x.amount), 0);
      ctb.append(el('tr', {}, el('td', { class: 'l', text: cname(k) }), el('td', { class: 'n', text: p ? won(p) : '–' }), el('td', { class: 'n', text: q ? won(q) : '–' }), el('td', { class: 'n', text: won(p + q) })));
    });
    if (!ctb.children.length) emptyRow(ctb, 4, T('expEmpty'));
    ct.append(ctb);
    renderSettle();
  }
  function renderRatio() {
    const box = $('ratio'); box.innerHTML = '';
    PARTIES.forEach(([k]) => {
      const i = el('input', { type: 'number', id: 'ratio-' + k, min: 0, step: 1, inputmode: 'decimal' }); i.value = S.split[k] ?? 0;
      i.addEventListener('input', () => { S.split[k] = n(i.value); save(); renderSettle(); prepSums(); });
      box.append(el('label', { class: 'f', for: i.id }, pname(k), i));
    });
  }
  function renderSettle() {
    const st = settle(), tbl = $('settle-table'); tbl.innerHTML = '';
    thead(tbl, [[T('party'), 'l'], [T('sOwe')], [T('sPaid')], [T('sBal')]]);
    const tb = el('tbody');
    st.keys.forEach((k) => tb.append(el('tr', {}, el('td', { class: 'l', text: pname(k) }), el('td', { class: 'n', text: won(st.owe[k]) }), el('td', { class: 'n', text: won(st.paid[k]) }),
      el('td', { class: 'n ' + (st.bal[k] > 0 ? 'pos' : st.bal[k] < 0 ? 'neg' : ''), text: (st.bal[k] > 0 ? '+' : '') + won(st.bal[k]) }))));
    tbl.append(tb);
    const ul = $('transfers'); ul.innerHTML = '';
    if (!st.tr.length) ul.append(el('li', {}, el('span', { class: 'small', text: T('noTransfer') })));
    st.tr.forEach((x) => ul.append(el('li', {}, el('span', { text: `${pname(x.from)} → ${pname(x.to)}` }), el('b', { text: won(x.amt) }))));
  }

  // ---------- guests ----------
  const gf = { q: '', side: '', st: '' }, ff = { q: '', side: '' };
  function renderSearchRows() {
    const mk = (id, ph, state, key) => { const i = el('input', { id, type: 'search', placeholder: ph, 'aria-label': ph }); i.value = state[key]; i.addEventListener('input', () => { state[key] = i.value; (state === gf ? renderGuests : renderGifts)(); }); return i; };
    const sel = (id, list, state, key) => { const s = el('select', { id, 'aria-label': id }, list.map(([v, l]) => el('option', { value: v, text: l }))); s.value = state[key]; s.addEventListener('change', () => { state[key] = s.value; (state === gf ? renderGuests : renderGifts)(); }); return s; };
    const sides = [['', T('sideAll')], ['g', T('sideG')], ['b', T('sideB')]];
    const g = $('guest-filters'); g.innerHTML = '';
    g.append(mk('gq', T('phSearch'), gf, 'q'), sel('gside', sides, gf, 'side'), sel('gstat', [['', T('aAll')], ['yes', T('aYes')], ['maybe', T('aMaybe')], ['no', T('aNo')]], gf, 'st'));
    const f = $('gift-filters'); f.innerHTML = '';
    f.append(mk('fq', T('phSearchGift'), ff, 'q'), sel('fside', sides, ff, 'side'));
    const r = $('g-rate'); r.value = S.guestRate;
    r.oninput = () => { S.guestRate = Math.min(100, Math.max(0, n(r.value))); save(); renderGuests(); prepSums(); };
  }
  function renderGuests() {
    const gs = guestStats();
    const tl = $('guest-tiles'); tl.innerHTML = '';
    tl.append(tile(T('kYes'), people(gs.yes)), tile(T('kMaybe'), people(gs.maybe)), tile(T('kMeal'), gs.meal + T('unitT'), `${T('aMaybe')} × ${n(S.guestRate)}%`), tile(T('kInvited'), people(gs.all)));
    const use = $('use-count'); use.textContent = T('useCount')(gs.meal); use.disabled = !gs.meal;
    const q = gf.q.trim().toLowerCase();
    const list = S.guests.filter((x) => (!gf.side || x.side === gf.side) && (!gf.st || x.status === gf.st) && (!q || (x.name + ' ' + (x.group || '')).toLowerCase().includes(q)));
    const tbl = $('guest-table'); tbl.innerHTML = '';
    thead(tbl, [[T('fName'), 'l'], [T('fSide'), 'l'], [T('fGroup'), 'l'], [T('fCount')], [T('fAttend'), 'l'], [T('fMemo'), 'l'], ['']]);
    const tb = el('tbody');
    if (!list.length) emptyRow(tb, 7, T('guestEmpty'));
    list.forEach((x) => tb.append(el('tr', {},
      el('td', { class: 'l vname', text: x.name }), el('td', { class: 'l', text: x.side === 'b' ? T('sideB') : T('sideG') }), el('td', { class: 'l', text: x.group || '' }),
      el('td', { class: 'n', text: Math.max(1, n(x.count)) }),
      el('td', { class: 'l' }, el('span', { class: 'chip ' + ({ yes: 'good', maybe: 'plan', no: '' }[x.status] || ''), text: T({ yes: 'aYes', maybe: 'aMaybe', no: 'aNo' }[x.status] || 'aMaybe') })),
      noteCell(x.memo),
      rowActs(() => forms.guest.edit(x), () => { S.guests = S.guests.filter((y) => y !== x); save(); renderGuests(); prepSums(); }))));
    tbl.append(tb);
  }
  $('use-count').addEventListener('click', () => { const m = guestStats().meal; if (!m) return; S.budget.guests = m; save(); renderBudget(); compute(); toast(T('usedCount')); });

  // ---------- gift money ----------
  function renderGifts() {
    const M = model(), gt = giftTotals();
    const tl = $('gift-tiles'); tl.innerHTML = '';
    tl.append(tile(T('kGiftTotal'), kr(gt.total), M.sel ? `${T('vsPlan')} ${kr(M.sel.gift)}` : ''), tile(T('kGiftG'), kr(gt.g)), tile(T('kGiftB'), kr(gt.b)), tile(T('kThanks'), String(gt.left)));
    const q = ff.q.trim().toLowerCase();
    const list = S.giftLog.filter((x) => (!ff.side || x.side === ff.side) && (!q || x.name.toLowerCase().includes(q)));
    const tbl = $('gift-table'); tbl.innerHTML = '';
    thead(tbl, [[T('fName'), 'l'], [T('fSide'), 'l'], [T('fAmt')], [T('fMemo'), 'l'], [T('thanked'), 'l'], ['']]);
    const tb = el('tbody');
    if (!list.length) emptyRow(tb, 6, T('giftEmpty'));
    list.forEach((x) => {
      const cb = el('input', { type: 'checkbox', class: 'ck', id: 'th-' + x.id, 'aria-label': T('fThanked') }); cb.checked = !!x.thanked;
      cb.addEventListener('change', () => { x.thanked = cb.checked; save(); renderGifts(); });
      tb.append(el('tr', {}, el('td', { class: 'l vname', text: x.name }), el('td', { class: 'l', text: x.side === 'b' ? T('sideB') : T('sideG') }), el('td', { class: 'n', text: won(n(x.amount)) }),
        noteCell(x.memo), el('td', { class: 'l' }, cb),
        rowActs(() => forms.gift.edit(x), () => { S.giftLog = S.giftLog.filter((y) => y !== x); save(); renderGifts(); prepSums(); })));
    });
    tbl.append(tb);
  }

  // ---------- vendors ----------
  // ---------- 스드메 (studio / dress / makeup picker, see sdm.js) ----------
  function renderSdm() {
    const line = (S.nonVenue || []).find((x) => x.ko === '스드메');
    window.NaduSdm.render($('sdm-root'), {
      lang: S.lang, tx, writable: !!(Sync.plan && Sync.plan.writable),
      catalog: S.sdmCatalog, picks: S.sdm, budgetFallback: line ? n(line.amount) : 0,
      setPicks: (p) => { S.sdm = p; save(); renderSdm(); },
      setCatalog: (c) => { S.sdmCatalog = c; save(); renderSdm(); },
      rerender: renderSdm, toast,
      fileUrl: (name) => '/api/plan/files/' + encodeURIComponent(name) + '?plan=' + Sync.planId,
      uploadFile: (name, blob) => putPlanFile(name, blob),
      addVendors: (rows) => {
        let k = 0;
        rows.forEach((r) => {
          if (!r.name || S.vendors.some((v) => v.sdmRef === r.ref || (v.cat === (r.cat || 'sdm') && v.name === r.name))) return;
          S.vendors.push({ id: uid(), cat: r.cat || 'sdm', name: r.name, quote: r.price || 0, final: 0, memo: '', sdmRef: r.ref }); k++;
        });
        if (k) save();
        return k;
      }
    });
  }
  async function putPlanFile(name, blob, fromImport) {
    try {
      const r = await fetch('/api/plan/files/' + encodeURIComponent(name) + (fromImport ? '?import=1' : ''), { method: 'PUT', credentials: 'same-origin', headers: { 'content-type': blob.type || 'image/jpeg', 'x-plan-id': String(Sync.planId) }, body: blob });
      return r.ok;
    } catch (e) { return false; }
  }

  function renderVendors() {
    const tbl = $('vendor-table'); tbl.innerHTML = '';
    thead(tbl, [[T('fVendor'), 'l'], [T('fQuote')], [T('fFinal')], [T('savedL')], [T('fMemo'), 'l'], [T('pickL'), 'l'], ['']]);
    const tb = el('tbody');
    if (!S.vendors.length) emptyRow(tb, 7, T('vendorEmpty'));
    BCATS.forEach(([k]) => {
      const rows = S.vendors.filter((v) => v.cat === k); if (!rows.length) return;
      const finals = rows.map((v) => n(v.final) || n(v.quote)).filter((x) => x > 0), low = finals.length ? Math.min(...finals) : null;
      tb.append(el('tr', { class: 'tot' }, el('td', { class: 'l', colspan: 7, text: cname(k) })));
      rows.forEach((v) => {
        const fin = n(v.final) || n(v.quote), inExp = S.expenses.some((e) => e.vendorId === v.id);
        const pickB = el('button', { type: 'button', class: v.picked ? 'chipbtn' : 'chipbtn', 'aria-pressed': String(!!v.picked), text: v.picked ? T('pickedL') : T('pickL') });
        pickB.addEventListener('click', () => { v.picked = !v.picked; save(); renderVendors(); });
        const cell = el('td', { class: 'l' }, el('div', { class: 'row-btns' }, pickB));
        if (v.picked) {
          if (inExp) cell.firstChild.append(el('span', { class: 'chip good', text: T('inExp') }));
          else { const add = el('button', { type: 'button', text: T('toExp') }); add.addEventListener('click', () => { S.expenses.push({ id: uid(), cat: v.cat, name: v.name, amount: fin, status: 'planned', paidBy: 'g', memo: v.memo || '', vendorId: v.id }); save(); renderVendors(); prepSums(); toast(T('addedExp')); }); cell.firstChild.append(add); }
        }
        const saved = n(v.quote) && n(v.final) ? n(v.quote) - n(v.final) : 0;
        tb.append(el('tr', { class: (low != null && fin === low ? 'best ' : '') + (v.picked ? 'picked' : '') },
          el('td', { class: 'l vname', text: v.name }), el('td', { class: 'n', text: n(v.quote) ? won(n(v.quote)) : '–' }), el('td', { class: 'n fin', text: fin ? won(fin) : '–' }),
          el('td', { class: 'n ' + (saved > 0 ? 'pos' : ''), text: saved ? won(saved) : '–' }), noteCell(v.memo), cell,
          rowActs(() => forms.vendor.edit(v), () => { S.vendors = S.vendors.filter((y) => y !== v); save(); renderVendors(); prepSums(); })));
      });
    });
    tbl.append(tb);
  }

  // ---------- report sections for prep ----------
  function reportPrep(R) {
    const items = allItems(), d = items.filter((i) => isDone(i.id)).length;
    const tbl = el('table', {}, el('thead', {}, el('tr', {}, [[T('stage'), 'l'], [T('tasks')], [T('done')], [T('rate')]].map(([k, c]) => el('th', { class: c || '', text: k })))),
      el('tbody', {}, STAGES.map((s) => { const its = items.filter((i) => i.stage === s.id), dn = its.filter((i) => isDone(i.id)).length; return el('tr', {}, el('td', { class: 'l', text: stageLabel(s) + (S.wedding ? ` · ${fmtShort(stageDate(s))}` : '') }), el('td', { class: 'n', text: its.length }), el('td', { class: 'n', text: dn }), el('td', { class: 'n', text: pctOf(dn, its.length) + '%' })); })));
    R.append(el('section', {}, el('h3', { text: `${T('repPrep')} · ${ddText()[0]} · ${d} / ${items.length}` }), el('div', { class: 'scroll' }, tbl)));
  }
  function reportSpend(R) {
    const et = expTotals(), st = settle();
    const rows = BCATS.map(([k]) => { const r = S.expenses.filter((x) => x.cat === k); return [cname(k), r.filter((x) => x.status === 'paid').reduce((a, x) => a + n(x.amount), 0), r.filter((x) => x.status !== 'paid').reduce((a, x) => a + n(x.amount), 0)]; }).filter((r) => r[1] || r[2]);
    const tbl = el('table', {}, el('thead', {}, el('tr', {}, [[T('fCat'), 'l'], [T('kPaid')], [T('kPlanned')]].map(([k, c]) => el('th', { class: c || '', text: k })))),
      el('tbody', {}, rows.map((r) => el('tr', {}, el('td', { class: 'l', text: r[0] }), el('td', { class: 'n', text: won(r[1]) }), el('td', { class: 'n', text: won(r[2]) }))),
        el('tr', { class: 'tot' }, el('td', { class: 'l', text: T('sumAll') }), el('td', { class: 'n', text: won(et.paid) }), el('td', { class: 'n', text: won(et.planned) }))));
    const tr = el('ul', { class: 'transfers' }, st.tr.length ? st.tr.map((x) => el('li', {}, el('span', { text: `${pname(x.from)} → ${pname(x.to)}` }), el('b', { text: won(x.amt) }))) : el('li', {}, T('noTransfer')));
    R.append(el('section', {}, el('h3', { text: T('repSpend') }), el('div', { class: 'scroll' }, tbl), el('div', { class: 'small', text: T('sTransfers') }), tr));
  }
  // Every note in the plan, in full with its line breaks, grouped by where it was written.
  function reportNotes(R, M) {
    const groups = [
      [T('secVenues'), (M ? M.inc.map((x) => x.v) : S.venues).filter((v) => v.notes).map((v) => [nm(v), v.notes])],
      [T('secLoans'), S.loans.filter((l) => l.note).map((l) => [nm(l), l.note])],
      [T('spendTitle'), S.expenses.filter((x) => x.memo).map((x) => [`${cname(x.cat)} · ${x.name}`, x.memo])],
      [T('vendorTitle'), S.vendors.filter((v) => v.memo).map((v) => [`${cname(v.cat)} · ${v.name}`, v.memo])],
      [T('guestTitle'), S.guests.filter((x) => x.memo).map((x) => [x.name + (x.group ? ` (${x.group})` : ''), x.memo])],
      [T('giftTitle'), S.giftLog.filter((x) => x.memo).map((x) => [x.name, x.memo])]
    ].filter(([, rows]) => rows.length);
    const sec = el('section', { class: 'rep-notes' }, el('h3', { text: T('repNotes') }));
    if (!groups.length) sec.append(el('p', { class: 'small', text: T('noteNone') }));
    groups.forEach(([title, rows]) => sec.append(el('h4', { text: title }),
      el('dl', { class: 'note-list' }, rows.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { class: 'note-text', text: v })]))));
    R.append(sec);
  }
  function reportPeople(R) {
    const gs = guestStats(), gt = giftTotals();
    const kv = (pairs) => el('div', { class: 'kv' }, pairs.map(([k, v]) => el('div', {}, el('span', { text: k }), el('span', { text: v }))));
    R.append(el('section', {}, el('h3', { text: T('repPeople') }), kv([[T('kYes'), String(gs.yes)], [T('kMaybe'), String(gs.maybe)], [T('kMeal'), String(gs.meal)], [T('kInvited'), String(gs.all)],
      [T('kGiftTotal'), won(gt.total)], [T('kGiftG'), won(gt.g)], [T('kGiftB'), won(gt.b)], [T('kThanks'), String(gt.left)]])));
  }

  window.addEventListener('beforeprint', () => { if ($('report-sec').hidden) buildReport(); });
    // ================= cloud sync: Cloudflare Worker + D1, two-person editing =================
  // Each plan section is its own document with a version number. A save only lands if it was made
  // against the latest version; otherwise the server returns the newer copy, we merge both people's
  // edits (record by record, field by field) and try again. Every saved version is kept as history.
  const SHARED = ['budget', 'selectedVenue', 'selectedLoan', 'venues', 'nonVenue', 'afterCosts', 'honsu', 'categories', 'loans', 'seeded',
    'wedding', 'checks', 'tasks', 'expenses', 'split', 'guests', 'guestRate', 'giftLog', 'vendors', 'sdm', 'sdmCatalog'];
  const PREFS = ['lang', 'skin', 'tab', 'collapsed', 'report', 'planId'];
  const PREF_KEY = 'nadu-wedding-prefs-v1';
  const Sync = { me: null, plans: [], planId: null, plan: null, users: {}, base: {}, ver: {}, seq: 0, timer: null, inflight: false, again: false, merged: false, poller: null, lastEdit: null, status: 'idle' };
  const clone = (v) => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const isRecList = (v) => Array.isArray(v) && v.every((x) => isObj(x) && x.id != null);

  Object.assign(L.ko, {
    tHistory: '변경 기록', printNow: '인쇄 · PDF 저장', gUser: '아이디', gPass: '비밀번호', gDisplay: '표시 이름', gInvite: '초대 코드', gLogin: '로그인', gSignup: '가입하기',
    gToSignup: '처음이세요? 초대 코드로 가입하기', gToLogin: '이미 계정이 있어요. 로그인하기', gTitleLogin: '둘만의 웨딩 플래너에 로그인', gTitleSignup: '계정 만들기',
    gErr: { bad_login: '아이디나 비밀번호가 맞지 않아요.', bad_invite: '초대 코드가 맞지 않아요.', user_limit: '더 이상 계정을 만들 수 없어요.', username_taken: '이미 있는 아이디예요.', bad_username: '아이디는 영문·숫자 3~32자로 만들어 주세요.', weak_password: '비밀번호는 8자 이상이어야 해요.', too_many_attempts: '시도가 너무 많아요. 15분 뒤에 다시 해 주세요.', invite_not_configured: '서버에 초대 코드가 아직 설정되지 않았어요.', network: '서버에 연결할 수 없어요.' },
    logout: '로그아웃', stSaving: '저장 중…', stSaved: '저장됨', stError: '저장 실패 · 다시 시도 중', stOffline: '오프라인', stMerged: '두 사람의 수정을 합쳤어요',
    lastBy: (who, when) => `마지막 수정 ${who} · ${when}`, ago: { s: '방금', m: (k) => `${k}분 전`, h: (k) => `${k}시간 전`, d: (k) => `${k}일 전` },
    histHelp: '모든 저장은 항목별 버전으로 남아요. 이전 버전으로 되돌려도 지금 버전은 기록에 그대로 남습니다.', hWhen: '시각', hWho: '수정한 사람', hWhat: '항목', hVer: '버전', hAct: '종류',
    aEdit: '수정', aRestore: '되돌림', aImport: '가져오기', restoreL: '이 버전으로 되돌리기', restoreQ: '정말 되돌릴까요?', restored: '이전 버전으로 되돌렸어요', more: '더 보기', histEmpty: '아직 기록이 없어요',
    filesLoaded: (a, b) => `사진 ${a}/${b}장을 올렸어요`, exportTitle: '내보내기', exBackup: '전체 백업 (.sql)', exJson: '전체 데이터 (JSON)', exExp: '지출 CSV', exGuests: '하객 CSV', exGifts: '축의금 CSV', exVendors: '업체 CSV', exHist: '변경 기록 CSV',
    keyLabels: { budget: '예산 기준', selectedVenue: '선택한 예식장', selectedLoan: '선택한 대출', venues: '예식장 옵션', nonVenue: '예식장 외 비용', afterCosts: '입주 비용', honsu: '혼수', categories: '추가 카테고리', loans: '대출 옵션', seeded: '기본 옵션', wedding: '예식 날짜', checks: '체크리스트 완료', tasks: '직접 추가한 할 일', expenses: '지출 내역', split: '분담 비율', guests: '하객 명단', guestRate: '미정 참석률', giftLog: '받은 축의금', vendors: '업체 비교', sdm: '스드메 조합', sdmCatalog: '스드메 업체 목록' }
  });
  Object.assign(L.en, {
    tHistory: 'History', printNow: 'Print · Save as PDF', gUser: 'Username', gPass: 'Password', gDisplay: 'Display name', gInvite: 'Invite code', gLogin: 'Sign in', gSignup: 'Create account',
    gToSignup: 'New here? Sign up with the invite code', gToLogin: 'Already have an account? Sign in', gTitleLogin: 'Sign in to your wedding planner', gTitleSignup: 'Create your account',
    gErr: { bad_login: 'That username and password don’t match.', bad_invite: 'That invite code isn’t right.', user_limit: 'No more accounts can be created.', username_taken: 'That username is taken.', bad_username: 'Use 3–32 letters, numbers, dots, dashes or underscores.', weak_password: 'Use at least 8 characters.', too_many_attempts: 'Too many attempts. Try again in 15 minutes.', invite_not_configured: 'The invite code hasn’t been set on the server yet.', network: 'Can’t reach the server.' },
    logout: 'Sign out', stSaving: 'Saving…', stSaved: 'Saved', stError: 'Save failed · retrying', stOffline: 'Offline', stMerged: 'Merged both of your edits',
    lastBy: (who, when) => `Last edit by ${who} · ${when}`, ago: { s: 'just now', m: (k) => `${k} min ago`, h: (k) => `${k} h ago`, d: (k) => `${k} d ago` },
    histHelp: 'Every save is kept as a version of that section. Restoring an old version adds a new version, so nothing is lost.', hWhen: 'When', hWho: 'Who', hWhat: 'Section', hVer: 'Version', hAct: 'Type',
    aEdit: 'Edit', aRestore: 'Restore', aImport: 'Import', restoreL: 'Restore this version', restoreQ: 'Restore it?', restored: 'Restored the earlier version', more: 'Load more', histEmpty: 'No history yet',
    filesLoaded: (a, b) => `Uploaded ${a} of ${b} photos`, exportTitle: 'Export', exBackup: 'Full backup (.sql)', exJson: 'All data (JSON)', exExp: 'Expenses CSV', exGuests: 'Guests CSV', exGifts: 'Gift money CSV', exVendors: 'Vendors CSV', exHist: 'History CSV',
    keyLabels: { budget: 'Budget inputs', selectedVenue: 'Selected venue', selectedLoan: 'Selected loan', venues: 'Venue options', nonVenue: 'Non-venue costs', afterCosts: 'Move-in costs', honsu: '혼수', categories: 'Extra categories', loans: 'Loan options', seeded: 'Default options', wedding: 'Wedding date', checks: 'Checklist ticks', tasks: 'Our own tasks', expenses: 'Expenses', split: 'Split ratio', guests: 'Guest list', guestRate: 'Maybe attendance rate', giftLog: 'Gift money', vendors: 'Vendors', sdm: 'Studio/dress combo', sdmCatalog: 'Studio/dress listings' }
  });

  // ---------- three-way merge ----------
  // base: what both started from; mine: this browser; theirs: what the server now has.
  function merge3(base, mine, theirs) {
    if (base === undefined) return clone(theirs === undefined ? mine : theirs); // first write raced: keep the server's copy
    if (same(mine, base)) return clone(theirs);
    if (same(theirs, base) || same(mine, theirs)) return clone(mine);
    if (isRecList(mine) && isRecList(theirs) && (base === null || isRecList(base))) {
      const bm = new Map((base || []).map((x) => [x.id, x])), mm = new Map(mine.map((x) => [x.id, x])), tm = new Map(theirs.map((x) => [x.id, x]));
      const out = [];
      theirs.forEach((t) => {
        const b = bm.get(t.id), m = mm.get(t.id);
        if (m) out.push(merge3(b, m, t));
        else if (!b) out.push(clone(t));                       // they added it
        else if (!same(t, b)) out.push(clone(t));              // I deleted it, they changed it: keep their change
      });
      mine.forEach((m) => {
        if (tm.has(m.id)) return;
        const b = bm.get(m.id);
        if (!b) out.push(clone(m));                            // I added it
        else if (!same(m, b)) out.push(clone(m));              // they deleted it, I changed it: keep mine
      });
      return out;
    }
    if (isObj(mine) && isObj(theirs) && (base === null || isObj(base))) {
      const out = {}, b = base || {};
      new Set([...Object.keys(mine), ...Object.keys(theirs)]).forEach((k) => {
        const v = merge3(k in b ? b[k] : undefined, mine[k], theirs[k]);
        if (v !== undefined) out[k] = v;
      });
      return out;
    }
    return clone(mine); // both changed the same value: the edit being saved now wins (the other is still in history)
  }

  // ---------- api ----------
  async function api(path, opts = {}) {
    try {
      const headers = { 'content-type': 'application/json' }; if (Sync.planId) headers['x-plan-id'] = String(Sync.planId);
      const r = await fetch('/api' + path, { method: opts.method || 'GET', credentials: 'same-origin', headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
      let data = null; try { data = await r.json(); } catch (e) {}
      return { ok: r.ok, status: r.status, data };
    } catch (e) { return { ok: false, status: 0, data: { error: 'network' } }; }
  }

  // ---------- local prefs (per device) ----------
  function loadPrefs() { try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); PREFS.forEach((k) => { if (p[k] !== undefined) S[k] = p[k]; }); } catch (e) {} }
  function savePrefs() { try { const p = {}; PREFS.forEach((k) => { p[k] = S[k]; }); localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (e) {} }

  // ---------- status line ----------
  function agoText(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000), a = T('ago');
    return s < 45 ? a.s : s < 3600 ? a.m(Math.round(s / 60)) : s < 86400 ? a.h(Math.round(s / 3600)) : a.d(Math.round(s / 86400));
  }
  function setStatus(st) { Sync.status = st; renderPresence(); }
  function renderPresence() {
    const who = $('who'); if (!who) return;
    who.textContent = Sync.me ? Sync.me.display : '';
    const st = $('sync-status');
    const label = { saving: T('stSaving'), saved: T('stSaved'), error: T('stError'), offline: T('stOffline'), merged: T('stMerged') }[Sync.status] || '';
    const last = Sync.lastEdit && Sync.lastEdit.at ? T('lastBy')(Sync.users[Sync.lastEdit.by] || '—', agoText(Sync.lastEdit.at)) : '';
    st.textContent = [label, last].filter(Boolean).join(' · ');
    st.className = 'sync ' + (Sync.status === 'error' || Sync.status === 'offline' ? 'bad' : '');
  }
  function noteEdit(by, at) { if (at && (!Sync.lastEdit || at > Sync.lastEdit.at)) Sync.lastEdit = { by, at }; }

  // ---------- saving ----------
  function scheduleSync() {
    savePrefs();
    if (!Sync.me || !Sync.planId || !(Sync.plan && Sync.plan.writable)) return;
    clearTimeout(Sync.timer);
    if (SHARED.some((k) => !same(S[k], Sync.base[k]))) { setStatus('saving'); Sync.timer = setTimeout(flush, 600); }
  }
  async function flush() {
    if (!Sync.me) return;
    if (Sync.inflight) { Sync.again = true; return; }
    Sync.inflight = true;
    let failed = false;
    try {
      for (const k of SHARED) {
        for (let attempt = 0; attempt < 5 && !same(S[k], Sync.base[k]); attempt++) {
          const value = clone(S[k]);
          const r = await api('/doc/' + k, { method: 'PUT', body: { value, baseVersion: Sync.ver[k] || 0, action: Sync.importing ? 'import' : 'edit' } });
          if (r.ok) { Sync.base[k] = value; Sync.ver[k] = r.data.version; noteEdit(Sync.me.id, r.data.updated_at); if (r.data.warn && r.data.warn.includes('card')) toast(T('cardWarn')); continue; }
          // Refused content (ID numbers) or an import without the add-on: put the section back as saved and say why.
          if ((r.status === 400 && r.data && r.data.error === 'id_number') || r.status === 402) {
            S[k] = clone(Sync.base[k]); Sync.merged = true; toast(r.status === 402 ? T('ioLocked') : T('idNumber')); break;
          }
          if (r.status === 409) {
            S[k] = merge3(Sync.base[k], S[k], r.data.value);
            Sync.base[k] = clone(r.data.value); Sync.ver[k] = r.data.version; Sync.merged = true;
            noteEdit(r.data.updated_by, r.data.updated_at);
            continue;
          }
          if (r.status === 401) { Sync.me = null; showGate('login'); return; }
          if (r.status === 403 && r.data && r.data.access !== undefined) { updatePlanView({ ...Sync.plan, writable: false, access: r.data.access }); toast(errText(r)); return; }
          failed = true; break;
        }
      }
    } finally {
      Sync.inflight = false; Sync.importing = false;
      if (Sync.merged) { Sync.merged = false; rerender(); setStatus('merged'); setTimeout(() => { if (Sync.status === 'merged') setStatus('saved'); }, 2500); }
      else setStatus(failed ? 'error' : 'saved');
      if (!Sync.me) { /* signed out mid-save */ }
      else if (failed) { clearTimeout(Sync.timer); Sync.timer = setTimeout(flush, 5000); }
      else if (Sync.again || SHARED.some((k) => !same(S[k], Sync.base[k]))) { Sync.again = false; clearTimeout(Sync.timer); Sync.timer = setTimeout(flush, 300); }
    }
  }
  // Save right away when the tab is hidden or closed, so the other person sees it sooner.
  document.addEventListener('visibilitychange', () => { if (document.hidden && Sync.me && !Sync.inflight) { clearTimeout(Sync.timer); flush(); } else if (!document.hidden) poll(); });

  // ---------- receiving ----------
  async function poll() {
    if (!Sync.me || !Sync.planId || Sync.inflight || document.hidden) return;
    const r = await api('/changes?since=' + Sync.seq);
    if (r.status === 401) { Sync.me = null; showGate('login'); return; }
    if (!r.ok) { setStatus('offline'); return; }
    if (Sync.status === 'offline') setStatus('saved');
    if (r.data.users) Sync.users = r.data.users;
    if (r.data.plan) updatePlanView(r.data.plan);
    let changed = false;
    (r.data.docs || []).forEach((d) => {
      noteEdit(d.updated_by, d.updated_at);
      if ((Sync.ver[d.key] || 0) >= d.version) return;
      const dirty = !same(S[d.key], Sync.base[d.key]);
      S[d.key] = dirty ? merge3(Sync.base[d.key], S[d.key], d.value) : clone(d.value);
      Sync.base[d.key] = clone(d.value); Sync.ver[d.key] = d.version; changed = true;
    });
    Sync.seq = Math.max(Sync.seq, r.data.seq || 0);
    if (changed) { rerender(); scheduleSync(); }
    renderPresence();
  }

  // Re-render without losing the field someone is typing in.
  function rerender() {
    const a = document.activeElement, id = a && a.id, s0 = a && a.selectionStart, s1 = a && a.selectionEnd;
    ensureShape(); renderAll();
    if (id) { const n2 = document.getElementById(id); if (n2 && n2 !== document.activeElement) { n2.focus({ preventScroll: true }); try { n2.setSelectionRange(s0, s1); } catch (e) {} } }
  }
  function ensureShape() {
    const d = DEFAULTS();
    ['budget', 'venues', 'nonVenue', 'afterCosts', 'loans'].forEach((k) => { if (S[k] == null) S[k] = d[k]; });
    S.budget.gifts = S.budget.gifts || d.budget.gifts;
    S.seeded = S.seeded || [];
    if (!Array.isArray(S.honsu)) S.honsu = DEFAULT_HONSU();
    if (!Array.isArray(S.categories)) S.categories = [];
    SEED_VENUES().forEach((v) => { if (!S.seeded.includes(v.id)) { if (!S.venues.some((x) => x.id === v.id)) S.venues.push(v); S.seeded.push(v.id); } });
    ensurePrep();
  }

  // ================= accounts, plans, settings, admin =================
  Object.assign(L.ko, {
    appName: 'Nadu Wedding Planner', appNameKo: '나두 웨딩 플래너',
    gEmail: '이메일', gEmailOrId: '이메일 (예전 계정은 아이디)', gName: '이름 (상대에게 보이는 이름)', gNewPass: '새 비밀번호 (8자 이상)',
    gTitleLogin: '로그인', gTitleSignup: '무료 체험 시작하기', gTitleForgot: '비밀번호 찾기', gTitleReset: '새 비밀번호 설정',
    gToSignup: '처음이세요? 계정 만들기', gToLogin: '이미 계정이 있어요 · 로그인', gToForgot: '비밀번호를 잊었어요',
    gAgree: '개인정보 안내를 읽었고 동의합니다', gPrivacy: '개인정보 안내',
    gNotice: '가입하면 서비스 제공을 위해 이메일, 이름, 암호화된 비밀번호를 수집하고, 입력한 결혼 준비 정보를 Cloudflare(해외 서버 포함)에 암호화해 보관해요. 계정을 삭제하면 바로 지워져요.', gPrivacyLink: '개인정보처리방침 보기',
    gAge14: '만 14세 이상이에요', gCode: '인증 앱의 6자리 코드',
    gNeedCode: '2단계 인증을 켠 계정이에요. 인증 앱의 6자리 코드를 입력하세요.', gLeft: (k) => ` (남은 시도 ${k}회)`,
    guestHint: '하객은 이름과 그룹만 적어 주세요. 연락처, 주민등록번호 같은 정보는 저장하지 않아요.',
    footPrivacy: '개인정보처리방침', footSecurity: '데이터는 암호화해 보관해요',
    ioLocked: '파일 가져오기는 유료 부가 서비스예요. 관리자에게 문의하세요. 내보내기(JSON·CSV)는 언제나 무료예요.',
    idNumber: '주민등록번호 같은 고유식별번호는 저장할 수 없어요. 해당 내용을 지우고 다시 저장해 주세요.', cardWarn: '카드 번호처럼 보이는 내용이 있어요. 꼭 필요하지 않다면 지워 주세요.',
    sExportFirst: '먼저 내 데이터 내려받기 (무료)',
    tsTitle: '2단계 인증', tsHelp: '로그인할 때 비밀번호와 함께 인증 앱(Google Authenticator 등)의 6자리 코드를 입력해요. 관리자는 꼭 켜야 관리자 탭을 쓸 수 있어요.',
    tsOn: '켜져 있어요', tsOff: '꺼져 있어요', tsStart: '2단계 인증 켜기', tsStop: '2단계 인증 끄기', tsPw: '현재 비밀번호', tsCode: '6자리 코드', tsConfirm: '코드 확인하고 켜기',
    tsStep1: '1. 인증 앱에서 ‘설정 키 입력’을 고르고 아래 키를 넣으세요 (또는 휴대폰에서 링크를 여세요).', tsStep2: '2. 앱에 나온 6자리 코드를 입력하세요.', tsLink: '인증 앱에서 열기', tsDone: '2단계 인증을 켰어요. 다른 기기에서는 다시 로그인해야 해요.', tsOffDone: '2단계 인증을 껐어요.',
    adNeed2fa: '관리자 탭은 2단계 인증으로 로그인해야 쓸 수 있어요.', adNeed2faSetup: '설정 탭에서 2단계 인증을 먼저 켜세요.', adNeed2faLogin: '로그아웃한 뒤 인증 코드와 함께 다시 로그인하세요.', adGoSettings: '설정으로 가기',
    adIO: '가져오기', secTitle: '보안·개인정보', secEnc: '저장 암호화', secEncOn: (id) => `켜짐 (키 ${id})`, secEncOff: '꺼짐: DATA_KEY 비밀값이 필요해요', secPlain: (k) => `암호화 안 된 항목 ${k}개`, secEncNow: '지금 암호화하기',
    secEmail: '이메일 발송 (Resend)', secTurnstile: '봇 차단 (Turnstile)', secSignup: '새 가입', secLimit: '읽기 속도 제한', secOfficer: '개인정보 보호책임자', secLegacy: '예전 복사본 테이블', secOn: '켜짐', secOffS: '꺼짐', secOpen: '열림', secClosed: '닫힘', secNone: '없음', secUnset: '설정 필요',
    secRetention: '삭제 예정 플랜 (만료 1년)', secRetNone: '없어요', secRetRow: (x) => `#${x.id} ${x.name}: 안내 ${x.warned ? '보냄' : '대기'} · 삭제 ${new Date(x.deleteAt).toISOString().slice(0, 10)}`,
    bkTitle: '전체 백업 (암호화)', bkHelp: '모든 계정과 플랜 데이터를 비밀번호로 잠근 파일로 받아요. 받는 이유가 접속기록에 남아요. 파일과 비밀번호는 따로 안전하게 보관하고, 오래된 백업은 지우세요.',
    bkReason: '이유 (예: 운영 배포 전)', bkPass: '파일 비밀번호 (12자 이상)', bkPass2: '비밀번호 확인', bkGo: '암호화 백업 받기', bkMismatch: '비밀번호가 서로 달라요', bkDone: '백업 파일을 받았어요',
    auTitle: '접속기록 점검', auHelp: '월 1회 이상 확인하세요. 내려받기 기록은 이유를 확인해야 해요.', auAll: '전체', auDownloads: '내려받기', auSecurity: '보안', auAdmin: '관리자', auMembers: '계정·멤버', auVerify: '변조 확인', auOk: (n) => `정상: 기록 ${n}개 모두 확인됐어요`, auBad: (t, m) => `확인 필요: 바뀐 기록 ${t}개, 빠진 구간 ${m}개`,
    auWhen: '시각', auWho: '누가', auIp: 'IP', auAct: '작업', auDetail: '내용', auEmpty: '기록이 없어요',
    ntTitle: '유출 통지용 이메일 목록', ntHelp: '개인정보 유출(의심 포함) 시 72시간 안에 알려야 해요. 대응 순서는 docs/incident-response.md를 보세요.', ntGo: '전체 이메일 복사', ntDone: (n) => `${n}개 주소를 복사했어요`, gSendLink: '재설정 링크 보내기', gSetPass: '비밀번호 저장',
    gSent: '계정이 있다면 재설정 링크를 이메일로 보냈어요. 메일이 오지 않으면 관리자에게 문의하세요.',
    gTagline: '둘이 함께 쓰는 결혼·신혼집 예산 플래너',
    gErr: { age_required: '만 14세 이상만 가입할 수 있어요.', common_password: '너무 흔한 비밀번호예요. 다른 비밀번호를 써 주세요.', password_has_email: '비밀번호에 이메일을 넣지 마세요.', signup_closed: '지금은 새 가입을 받지 않아요.', totp_required: '인증 코드를 입력하세요.', bad_code: '인증 코드가 맞지 않아요.', addon_required: '유료 부가 서비스예요. 관리자에게 문의하세요.', id_number: '주민등록번호 같은 고유식별번호는 저장할 수 없어요.', admin_2fa_required: '2단계 인증으로 로그인해야 해요.', reason_required: '백업하는 이유를 적어 주세요.', weak_passphrase: '파일 비밀번호는 12자 이상이어야 해요.', slow_down: '요청이 너무 많아요. 잠시 후 다시 시도하세요.', bot_check_failed: '자동 가입 방지 확인을 다시 해 주세요.', no_setup: '먼저 2단계 인증 설정을 시작하세요.', no_key: '암호화 키(DATA_KEY)가 설정되지 않았어요.',
      bad_login: '이메일이나 비밀번호가 맞지 않아요.', bad_email: '이메일 주소를 확인해 주세요.', email_taken: '이미 가입된 이메일이에요. 로그인하거나 비밀번호를 찾아보세요.', weak_password: '비밀번호는 8자 이상이어야 해요.', no_name: '이름을 입력해 주세요.', must_agree: '개인정보 안내에 동의해야 가입할 수 있어요.', too_many_attempts: '시도가 너무 많아요. 잠시 뒤에 다시 해 주세요.', bot_check_failed: '자동 가입 방지 확인을 다시 해 주세요.', bad_reset_link: '링크가 만료됐거나 이미 사용됐어요. 다시 요청해 주세요.', bad_invite: '초대 코드가 맞지 않거나 만료됐어요.', plan_limit: '만들 수 있는 플랜 수를 넘었어요.', bad_password: '현재 비밀번호가 맞지 않아요.', last_owner: '소유자가 최소 한 명은 있어야 해요.', last_member: '마지막 멤버는 나갈 수 없어요. 계정 삭제를 이용하세요.', owner_only: '플랜 소유자만 할 수 있어요.', read_only: '읽기 전용이에요.', plan_expired: '이용 기간이 끝나 읽기 전용이에요.', network: '서버에 연결할 수 없어요.' },
    obTitle: '플랜 시작하기', obHelp: '새 플랜을 만들거나, 상대가 보낸 초대 코드로 참여하세요.', obNew: '새 플랜 만들기', obJoin: '초대 코드로 참여',
    obA: '신랑 이름', obB: '신부 이름', obCreate: '플랜 만들기', obCode: '초대 코드', obJoinBtn: '참여하기', obTrial: (d) => `새 플랜은 ${d}일 동안 무료로 체험할 수 있어요.`,
    tSettings: '설정', tAdmin: '관리자',
    accTrial: (d) => `체험 중 · ${d}일 남음`, accActive: '이용 중', accActiveUntil: (d) => `이용 중 · ${d}까지`, accExpired: '이용 기간 만료 · 읽기 전용', accViewer: '보기 전용',
    roBanner: { expired: '이용 기간이 끝나 읽기 전용이에요. 데이터 보기와 내보내기는 계속할 수 있어요.', viewer: '보기 전용 멤버예요. 편집은 소유자나 편집자만 할 수 있어요.' },
    payHow: '이용 연장·AI 기능 신청은 관리자에게 문의해 주세요.', contact: '문의',
    sPlan: '플랜', sNames: '이름', sSaveNames: '이름 저장', sMembers: '멤버', sInvite: '초대하기', sInviteHelp: '코드나 링크를 상대에게 보내세요. 7일 동안 한 번 사용할 수 있어요.',
    sRoleEditor: '편집자 (함께 수정)', sRoleViewer: '보기 전용 (예: 부모님)', sMakeInvite: '초대 코드 만들기', sOpenInvites: (k) => `사용 전 초대 ${k}개`, sRevoke: '취소',
    rOwner: '소유자', rEditor: '편집자', rViewer: '보기 전용', sRemove: '내보내기', sLeave: '플랜에서 나가기', sYou: '나',
    sStatus: '이용 상태', sAI: 'AI 기능 (견적 자동 읽기 등)', sAIon: '사용 가능', sAIoff: '유료 추가 기능 · 관리자에게 신청',
    sAccount: '내 계정', sEmailNeeded: '이메일을 등록하면 비밀번호를 잊었을 때 재설정할 수 있어요.', sSave: '저장', sChangePass: '비밀번호 변경', sCurPass: '현재 비밀번호', sNewPass: '새 비밀번호',
    sDanger: '계정 삭제', sDeleteHelp: '계정을 삭제하면 다시 되돌릴 수 없어요. 내가 마지막 멤버인 플랜은 모든 데이터와 함께 삭제돼요. 먼저 내보내기로 백업하세요.', sDeleteBtn: '계정 영구 삭제', sDeletePw: '확인용 비밀번호',
    sNewPlan: '다른 플랜 만들기', saved: '저장했어요', copied2: '복사했어요', planSwitch: '플랜',
    adTitle: '관리자 · 플랜과 결제', adHelp: '결제를 받은 뒤 기간을 연장하고, AI 기능을 켜거나 끄세요. 이메일 발송이 설정되지 않았다면 여기서 비밀번호 재설정 링크를 만들어 전달하세요.',
    adPlan: '플랜', adMembers: '멤버', adAccess: '상태', adUntil: '체험/이용 종료', adAI: 'AI', adNote: '메모', adActions: '결제 기록', adLast: '마지막 수정',
    adBackupTitle: '전체 백업', adBackup: '전체 백업 다운로드 (.sql)', adBackupHelp: '모든 계정, 플랜, 데이터와 변경 기록을 파일 하나로 저장해요. 운영에 배포하기 전에 꼭 받아두세요. 복원: npx wrangler d1 execute <데이터베이스> --remote --file <파일>.sql',
    ad30: '+30일', ad365: '+1년', adExpire: '만료', adReset: '재설정 링크', adNoPlan: '플랜이 없는 계정', adEmail: (on) => on ? '이메일 발송: 설정됨' : '이메일 발송: 설정 안 됨 (재설정 링크를 직접 전달)',
    privacyText: 'Nadu Wedding Planner는 결혼 준비에 필요한 정보(예산, 하객, 축의금, 체크리스트 등)와 계정 정보(이메일, 이름, 암호화된 비밀번호)를 Cloudflare 서버에 저장합니다. 이 정보는 서비스 제공과 문의 응대에만 쓰이며 광고나 제3자 제공에 쓰이지 않습니다. 같은 플랜의 멤버만 플랜 데이터를 볼 수 있어요. 언제든 데이터를 내보낼 수 있고, 설정에서 계정을 삭제하면 관련 데이터가 삭제됩니다.'
  });
  Object.assign(L.en, {
    appName: 'Nadu Wedding Planner', appNameKo: 'Nadu Wedding Planner',
    gEmail: 'Email', gEmailOrId: 'Email (or username for older accounts)', gName: 'Your name (shown to your partner)', gNewPass: 'New password (8+ characters)',
    gTitleLogin: 'Sign in', gTitleSignup: 'Start your free trial', gTitleForgot: 'Forgot your password?', gTitleReset: 'Set a new password',
    gToSignup: 'New here? Create an account', gToLogin: 'Already have an account? Sign in', gToForgot: 'Forgot password',
    gAgree: 'I have read and agree to the privacy note', gPrivacy: 'Privacy note',
    gNotice: 'To run the service we collect your email, name and an encrypted password, and keep the wedding details you enter encrypted on Cloudflare (including servers outside Korea). Deleting your account deletes them right away.', gPrivacyLink: 'Read the privacy policy',
    gAge14: 'I am 14 or older', gCode: '6-digit code from your authenticator app',
    gNeedCode: 'This account uses two-step sign-in. Enter the 6-digit code from your authenticator app.', gLeft: (k) => ` (${k} tries left)`,
    guestHint: 'Enter guest names and groups only. Contact details and ID numbers aren’t stored.',
    footPrivacy: 'Privacy policy', footSecurity: 'Your data is stored encrypted',
    ioLocked: 'Importing files is a paid add-on. Ask the admin. Export (JSON and CSV) is always free.',
    idNumber: 'ID numbers such as resident registration numbers can’t be stored. Remove it and save again.', cardWarn: 'Something looks like a card number. Remove it unless you really need it.',
    sExportFirst: 'Download my data first (free)',
    tsTitle: 'Two-step sign-in', tsHelp: 'When you sign in you also enter a 6-digit code from an authenticator app (Google Authenticator or similar). Admins need it to use the Admin tab.',
    tsOn: 'On', tsOff: 'Off', tsStart: 'Turn on two-step sign-in', tsStop: 'Turn off two-step sign-in', tsPw: 'Current password', tsCode: '6-digit code', tsConfirm: 'Check code and turn on',
    tsStep1: '1. In your authenticator app choose “Enter a setup key” and type the key below (or open the link on your phone).', tsStep2: '2. Enter the 6-digit code the app shows.', tsLink: 'Open in authenticator app', tsDone: 'Two-step sign-in is on. Other devices need to sign in again.', tsOffDone: 'Two-step sign-in is off.',
    adNeed2fa: 'The Admin tab needs a two-step sign-in.', adNeed2faSetup: 'Turn on two-step sign-in in Settings first.', adNeed2faLogin: 'Sign out and sign in again with your code.', adGoSettings: 'Go to Settings',
    adIO: 'Import', secTitle: 'Security & privacy', secEnc: 'Encryption at rest', secEncOn: (id) => `On (key ${id})`, secEncOff: 'Off: needs the DATA_KEY secret', secPlain: (k) => `${k} items not encrypted yet`, secEncNow: 'Encrypt now',
    secEmail: 'Email (Resend)', secTurnstile: 'Bot check (Turnstile)', secSignup: 'New sign-ups', secLimit: 'Read rate limit', secOfficer: 'Privacy officer', secLegacy: 'Old copy tables', secOn: 'On', secOffS: 'Off', secOpen: 'Open', secClosed: 'Closed', secNone: 'None', secUnset: 'Not set',
    secRetention: 'Plans due for deletion (expired 1 year)', secRetNone: 'None', secRetRow: (x) => `#${x.id} ${x.name}: notice ${x.warned ? 'sent' : 'pending'} · deletes ${new Date(x.deleteAt).toISOString().slice(0, 10)}`,
    bkTitle: 'Full backup (encrypted)', bkHelp: 'Downloads every account and plan in a file locked with a passphrase. The reason is recorded in the access log. Keep the file and passphrase apart, and delete old backups.',
    bkReason: 'Reason (e.g. before a release)', bkPass: 'File passphrase (12+ characters)', bkPass2: 'Repeat passphrase', bkGo: 'Download encrypted backup', bkMismatch: 'The passphrases don’t match', bkDone: 'Backup downloaded',
    auTitle: 'Access log review', auHelp: 'Check at least once a month. Every download needs a known reason.', auAll: 'All', auDownloads: 'Downloads', auSecurity: 'Security', auAdmin: 'Admin', auMembers: 'Accounts & members', auVerify: 'Check for tampering', auOk: (n) => `OK: all ${n} entries verified`, auBad: (t, m) => `Needs a look: ${t} changed entries, ${m} missing ranges`,
    auWhen: 'When', auWho: 'Who', auIp: 'IP', auAct: 'Action', auDetail: 'Details', auEmpty: 'No entries',
    ntTitle: 'Emails for a breach notice', ntHelp: 'After a leak (even a suspected one) people must be told within 72 hours. Steps: docs/incident-response.md.', ntGo: 'Copy all emails', ntDone: (n) => `Copied ${n} addresses`, gSendLink: 'Send reset link', gSetPass: 'Save password',
    gSent: 'If that email has an account, a reset link is on its way. No email? Contact the site admin.',
    gTagline: 'A wedding & first-home budget planner for two',
    gErr: { age_required: 'You must be 14 or older to sign up.', common_password: 'That password is too common. Pick another one.', password_has_email: 'Don’t put your email in your password.', signup_closed: 'New sign-ups are closed right now.', totp_required: 'Enter your sign-in code.', bad_code: 'That code isn’t right.', addon_required: 'This is a paid add-on. Ask the admin.', id_number: 'ID numbers such as resident registration numbers can’t be stored.', admin_2fa_required: 'Sign in with two-step sign-in first.', reason_required: 'Add a reason for the backup.', weak_passphrase: 'The file passphrase needs 12 or more characters.', slow_down: 'Too many requests. Try again in a moment.', bot_check_failed: 'Please complete the bot check again.', no_setup: 'Start two-step setup first.', no_key: 'No encryption key (DATA_KEY) is set.',
      bad_login: 'That email and password don’t match.', bad_email: 'Check the email address.', email_taken: 'That email already has an account. Sign in or reset your password.', weak_password: 'Use at least 8 characters.', no_name: 'Enter your name.', must_agree: 'Please agree to the privacy note to sign up.', too_many_attempts: 'Too many attempts. Try again in a little while.', bot_check_failed: 'Please complete the bot check again.', bad_reset_link: 'This link has expired or was already used. Request a new one.', bad_invite: 'That invite code is wrong or expired.', plan_limit: 'You’ve reached the number of plans you can create.', bad_password: 'Your current password isn’t right.', last_owner: 'A plan needs at least one owner.', last_member: 'The last member can’t leave. Delete the account instead.', owner_only: 'Only the plan owner can do that.', read_only: 'This plan is read-only for you.', plan_expired: 'Your access has ended, so the plan is read-only.', network: 'Can’t reach the server.' },
    obTitle: 'Start planning', obHelp: 'Create a new plan, or join your partner’s with the invite code they sent.', obNew: 'Create a new plan', obJoin: 'Join with an invite code',
    obA: 'Groom’s name', obB: 'Bride’s name', obCreate: 'Create plan', obCode: 'Invite code', obJoinBtn: 'Join', obTrial: (d) => `New plans come with a ${d}-day free trial.`,
    tSettings: 'Settings', tAdmin: 'Admin',
    accTrial: (d) => `Trial · ${d} day${d === 1 ? '' : 's'} left`, accActive: 'Active', accActiveUntil: (d) => `Active until ${d}`, accExpired: 'Access ended · read-only', accViewer: 'View only',
    roBanner: { expired: 'Your access has ended, so the plan is read-only. You can still view and export everything.', viewer: 'You’re a view-only member. Only the owner and editors can make changes.' },
    payHow: 'To extend access or add AI features, contact the site admin.', contact: 'Contact',
    sPlan: 'Plan', sNames: 'Names', sSaveNames: 'Save names', sMembers: 'Members', sInvite: 'Invite someone', sInviteHelp: 'Send the code or link. It works once, for 7 days.',
    sRoleEditor: 'Editor (edits with you)', sRoleViewer: 'View only (e.g. parents)', sMakeInvite: 'Create invite code', sOpenInvites: (k) => `${k} unused invite${k === 1 ? '' : 's'}`, sRevoke: 'Cancel',
    rOwner: 'Owner', rEditor: 'Editor', rViewer: 'View only', sRemove: 'Remove', sLeave: 'Leave this plan', sYou: 'you',
    sStatus: 'Access', sAI: 'AI features (automatic quote reading, etc.)', sAIon: 'Available', sAIoff: 'Paid add-on · ask the admin',
    sAccount: 'My account', sEmailNeeded: 'Add an email so you can reset your password if you forget it.', sSave: 'Save', sChangePass: 'Change password', sCurPass: 'Current password', sNewPass: 'New password',
    sDanger: 'Delete account', sDeleteHelp: 'This can’t be undone. Plans where you are the last member are deleted with all their data. Export a backup first.', sDeleteBtn: 'Delete my account permanently', sDeletePw: 'Password to confirm',
    sNewPlan: 'Create another plan', saved: 'Saved', copied2: 'Copied', planSwitch: 'Plan',
    adTitle: 'Admin · plans & payments', adHelp: 'After a couple pays you, extend their access and turn AI on or off. If email sending isn’t set up, create password reset links here and pass them on.',
    adPlan: 'Plan', adMembers: 'Members', adAccess: 'Access', adUntil: 'Trial / paid until', adAI: 'AI', adNote: 'Note', adActions: 'Record payment', adLast: 'Last edit',
    adBackupTitle: 'Full backup', adBackup: 'Download full backup (.sql)', adBackupHelp: 'Saves every account, plan, section and history entry in one file. Take one before every release to live. Restore: npx wrangler d1 execute <database> --remote --file <file>.sql',
    ad30: '+30 days', ad365: '+1 year', adExpire: 'End', adReset: 'Reset link', adNoPlan: 'Accounts without a plan', adEmail: (on) => on ? 'Email sending: set up' : 'Email sending: not set up (pass reset links on yourself)',
    privacyText: 'Nadu Wedding Planner stores your wedding planning data (budget, guests, gift money, checklist and so on) and account details (email, name, encrypted password) on Cloudflare’s servers. It is used only to run the service and answer support requests — never for advertising or shared with third parties. Only members of a plan can see that plan’s data. You can export your data at any time, and deleting your account in Settings deletes the related data.'
  });
  const ENV = { env: 'production', turnstileSiteKey: null, contact: null, trialDays: 14 };
  const fmtDate = (ms) => new Date(ms).toLocaleDateString(locale(), { year: 'numeric', month: 'short', day: 'numeric' });
  const daysLeft = (ms) => Math.max(0, Math.ceil((ms - Date.now()) / 864e5));
  function accessLabel(p) {
    if (!p) return '';
    if (p.access === 'trial') return T('accTrial')(daysLeft(p.trial_ends));
    if (p.access === 'active') return p.paid_until ? T('accActiveUntil')(fmtDate(p.paid_until)) : T('accActive');
    return T('accExpired');
  }
  const errText = (r) => { const c = (r.data && r.data.error) || 'network'; return T('gErr')[c] || c; };

  // ---------- party names follow the plan ----------
  function applyPlanNames() {
    const p = Sync.plan || {}, a = p.partner_a || '', b = p.partner_b || '';
    PARTIES[0][1] = a ? `신랑 (${a})` : '신랑'; PARTIES[0][2] = a ? `Groom (${a})` : 'Groom';
    PARTIES[1][1] = b ? `신부 (${b})` : '신부'; PARTIES[1][2] = b ? `Bride (${b})` : 'Bride';
    const t = (p.name ? p.name + ' · ' : '') + 'Nadu Wedding Planner';
    document.title = (ENV.env === 'staging' ? '[STAGING] ' : '') + t;
  }

  // ---------- gate: login / signup / forgot / reset / onboarding ----------
  let gateMode = 'login', resetToken = null, turnstileWidget = null;
  const GATE_VIEWS = ['login', 'signup', 'forgot', 'reset', 'onboard'];
  function showGate(mode) {
    gateMode = mode || 'login';
    clearInterval(Sync.poller);
    $('gate').hidden = false; document.body.classList.add('gated');
    GATE_VIEWS.forEach((v) => document.querySelectorAll('.gv-' + v).forEach((e) => { e.hidden = !e.className.split(' ').some((c) => c === 'gv-' + gateMode); }));
    document.querySelectorAll('#gate [data-t]').forEach((n) => { n.textContent = T(n.dataset.t); });
    $('gate-title').textContent = T({ login: 'gTitleLogin', signup: 'gTitleSignup', forgot: 'gTitleForgot', reset: 'gTitleReset', onboard: 'obTitle' }[gateMode]);
    $('g-pass').autocomplete = gateMode === 'signup' ? 'new-password' : 'current-password';
    $('gate-err').textContent = ''; $('gate-msg').textContent = '';
    $('ob-trial').textContent = T('obTrial')(ENV.trialDays);
    if ($('gate-lang')) $('gate-lang').value = S.lang;
    $('ob-logout').hidden = gateMode !== 'onboard' || !!Sync.planId;
    if (['signup', 'login', 'forgot'].includes(gateMode)) mountTurnstile();
    if (gateMode !== 'login') { $('g-code-wrap').hidden = true; $('g-code').value = ''; }
    const first = { login: 'g-email', signup: 'g-email', forgot: 'g-email', reset: 'g-newpass', onboard: 'ob-a' }[gateMode];
    setTimeout(() => $(first) && $(first).focus(), 0);
  }
  function hideGate() { $('gate').hidden = true; document.body.classList.remove('gated'); }
  function mountTurnstile() {
    if (!ENV.turnstileSiteKey || turnstileWidget !== null) return;
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true;
    s.onload = () => { turnstileWidget = window.turnstile.render('#g-turnstile', { sitekey: ENV.turnstileSiteKey }); };
    document.head.append(s); turnstileWidget = 'loading';
  }
  $('ob-logout').addEventListener('click', () => $('btn-logout').click());
  document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => showGate(b.dataset.goto)));
  $('gate-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter || $('gate-submit'); btn.disabled = true;
    try {
      let r;
      const ts = () => window.turnstile && typeof turnstileWidget === 'string' && turnstileWidget !== 'loading' ? window.turnstile.getResponse(turnstileWidget) : undefined;
      const tsReset = () => { if (window.turnstile && turnstileWidget && turnstileWidget !== 'loading') window.turnstile.reset(turnstileWidget); };
      if (gateMode === 'login') {
        const code = $('g-code-wrap').hidden ? undefined : $('g-code').value.trim();
        r = await api('/login', { method: 'POST', body: { email: $('g-email').value.trim(), password: $('g-pass').value, code, turnstile: ts() } });
        if (!r.ok) tsReset();
        if (r.status === 401 && r.data && r.data.error === 'totp_required') { $('g-code-wrap').hidden = false; $('gate-msg').textContent = T('gNeedCode'); $('g-code').focus(); return; }
        if (!r.ok && r.data && r.data.retryMinutes) { $('gate-err').textContent = errText(r) + ` (${r.data.retryMinutes} min)`; return; }
        if (!r.ok && r.data && r.data.attemptsLeft !== undefined && r.data.attemptsLeft <= 2) { $('gate-err').textContent = errText(r) + T('gLeft')(r.data.attemptsLeft); return; }
        if (r.ok) { $('g-code').value = ''; $('g-code-wrap').hidden = true; }
      } else if (gateMode === 'signup') {
        r = await api('/signup', { method: 'POST', body: { email: $('g-email').value.trim(), display: $('g-display').value.trim(), password: $('g-pass').value, age14: $('g-age14').checked, turnstile: ts() } });
        if (!r.ok) tsReset();
      } else if (gateMode === 'forgot') {
        r = await api('/forgot', { method: 'POST', body: { email: $('g-email').value.trim(), turnstile: ts() } });
        tsReset();
        if (r.ok) { $('gate-msg').textContent = T('gSent'); return; }
      } else if (gateMode === 'reset') {
        r = await api('/reset', { method: 'POST', body: { token: resetToken, password: $('g-newpass').value } });
        if (r.ok) history.replaceState(null, '', location.pathname);
      } else return;
      if (!r.ok) { $('gate-err').textContent = errText(r); return; }
      $('g-pass').value = ''; $('g-newpass').value = '';
      await afterSignIn();
    } finally { btn.disabled = false; }
  });
  $('ob-create').addEventListener('click', async () => {
    const r = await api('/plans', { method: 'POST', body: { partner_a: $('ob-a').value.trim(), partner_b: $('ob-b').value.trim() } });
    if (!r.ok) { $('gate-err').textContent = errText(r); return; }
    S.planId = r.data.id; savePrefs(); await afterSignIn();
  });
  $('ob-join').addEventListener('click', () => joinWith($('ob-code').value));
  async function joinWith(code) {
    const r = await api('/plans/join', { method: 'POST', body: { code } });
    try { sessionStorage.removeItem('nadu-join'); } catch (e) {}
    if (!r.ok) { if (!$('gate').hidden) $('gate-err').textContent = errText(r); else toast(errText(r)); return false; }
    S.planId = r.data.id; savePrefs(); await afterSignIn(); return true;
  }
  async function afterSignIn() {
    const me = await api('/me');
    if (!me.ok) { showGate('login'); return; }
    Sync.me = me.data.user; Sync.plans = me.data.plans;
    let pending = null; try { pending = sessionStorage.getItem('nadu-join'); } catch (e) {}
    if (pending) { if (await joinWith(pending)) return; }
    if (!Sync.plans.length) { showGate('onboard'); return; }
    const chosen = Sync.plans.find((p) => p.id === S.planId) || Sync.plans[0];
    await openPlan(chosen.id);
  }
  $('btn-logout').addEventListener('click', async () => {
    clearTimeout(Sync.timer); if (Sync.planId && SHARED.some((k) => !same(S[k], Sync.base[k]))) await flush();
    await api('/logout', { method: 'POST' });
    resetSync(); Sync.me = null; Sync.plans = [];
    S = Object.assign(DEFAULTS(), {}); loadPrefs(); ensureShape(); renderAll(); renderPresence(); showGate('login');
  });
  function resetSync() { clearInterval(Sync.poller); clearTimeout(Sync.timer); Sync.planId = null; Sync.plan = null; Sync.base = {}; Sync.ver = {}; Sync.seq = 0; Sync.users = {}; Sync.lastEdit = null; }

  async function openPlan(id) {
    if (Sync.planId && Sync.planId !== id && SHARED.some((k) => !same(S[k], Sync.base[k]))) { clearTimeout(Sync.timer); await flush(); }
    resetSync(); Sync.planId = id;
    const st = await api('/state');
    if (!st.ok) { Sync.planId = null; if (st.status === 401) { showGate('login'); return; } S.planId = null; savePrefs(); Sync.plans = Sync.plans.filter((p) => p.id !== id); if (Sync.plans.length) return openPlan(Sync.plans[0].id); showGate('onboard'); return; }
    S.planId = id; savePrefs();
    Sync.plan = st.data.plan;
    const docs = st.data.docs || {}, defs = DEFAULTS();
    SHARED.forEach((k) => {
      if (docs[k]) { S[k] = clone(docs[k].value); Sync.base[k] = clone(docs[k].value); Sync.ver[k] = docs[k].version; noteEdit(docs[k].updated_by, docs[k].updated_at); }
      else { S[k] = clone(defs[k]); Sync.base[k] = undefined; Sync.ver[k] = 0; }
    });
    Sync.users = st.data.users || {}; Sync.seq = st.data.seq || 0;
    applyPlanNames(); hideGate(); rerender(); renderPresence();
    if (Sync.plan.writable) scheduleSync(); // uploads any sections a new plan doesn't have yet
    Sync.poller = setInterval(poll, 4000);
  }
  function updatePlanView(p) {
    if (!p) return;
    const was = Sync.plan && Sync.plan.writable;
    Sync.plan = p;
    const i = (Sync.plans || []).findIndex((x) => x.id === p.id); if (i >= 0) Sync.plans[i] = { ...Sync.plans[i], ...p };
    if (was !== p.writable) rerender();
  }

  // ---------- read-only mode ----------
  function applyReadonly() {
    const p = Sync.plan, ro = !!(p && !p.writable);
    document.body.classList.toggle('readonly', ro);
    const b = $('ro-banner');
    b.hidden = !ro;
    if (ro) b.textContent = T('roBanner')[p.access === 'expired' ? 'expired' : 'viewer'] + (p.access === 'expired' ? ' ' + T('payHow') + (ENV.contact ? ` (${ENV.contact})` : '') : '');
    if (!ro) { ['btn-reset', 'io-load', 'io-file', 'wd'].forEach((id) => { if ($(id)) $(id).disabled = false; }); return; }
    document.querySelectorAll('.tabpanel:not([data-panel="settings"]):not([data-panel="admin"]) :is(input, select, textarea, button)').forEach((n) => {
      if (n.classList.contains('note-pop') || n.closest('.tabs') || n.closest('#export-btns') || n.id === 'hist-more' || n.closest('.fold') || n.classList.contains('fold') || n.closest('.seg') || n.closest('.chipbtn') || n.classList.contains('chipbtn') || n.type === 'search' || n.closest('.searchrow')) return;
      n.disabled = true;
    });
    ['btn-reset', 'io-load', 'io-file', 'wd'].forEach((id) => { if ($(id)) $(id).disabled = true; });
  }

  // ---------- plan switcher & status chip ----------
  function renderPlanBar() {
    const box = $('plan-bar'); if (!box) return;
    box.innerHTML = '';
    if (!Sync.plan) return;
    if ((Sync.plans || []).length > 1) {
      const sel = el('select', { id: 'plan-switch', 'aria-label': T('planSwitch') }, Sync.plans.map((p) => el('option', { value: p.id, text: p.name })));
      sel.value = String(Sync.planId);
      sel.addEventListener('change', () => openPlan(Number(sel.value)));
      box.append(sel);
    }
    const p = Sync.plan;
    box.append(el('span', { class: 'chip ' + (p.access === 'expired' ? 'bad' : p.access === 'trial' ? 'plan' : 'good'), text: accessLabel(p) }));
    if (p.role === 'viewer') box.append(el('span', { class: 'chip', text: T('accViewer') }));
  }

  // ---------- settings tab ----------
  async function renderSettings() {
    const box = $('settings-body'); if (!box || !Sync.plan) return;
    const p = Sync.plan, owner = p.role === 'owner';
    box.innerHTML = '';
    const mr = await api('/plan/members');
    const members = mr.ok ? mr.data.members : [], invites = mr.ok ? mr.data.invites : [];

    // plan names
    const a = el('input', { id: 'set-a', value: p.partner_a || '', maxlength: 30, disabled: !owner });
    const b = el('input', { id: 'set-b', value: p.partner_b || '', maxlength: 30, disabled: !owner });
    a.value = p.partner_a || ''; b.value = p.partner_b || '';
    const saveNames = el('button', { type: 'button', class: 'primary', text: T('sSaveNames'), disabled: !owner });
    saveNames.addEventListener('click', async () => {
      const r = await api('/plan', { method: 'PATCH', body: { partner_a: a.value.trim(), partner_b: b.value.trim(), name: [a.value.trim(), b.value.trim()].filter(Boolean).join(' & ') } });
      if (!r.ok) return toast(errText(r));
      await refreshMe(); toast(T('saved'));
    });
    box.append(el('div', { class: 'panel' }, el('h3', { text: T('sPlan') }),
      el('div', { class: 'fields' }, el('label', { class: 'f', for: 'set-a' }, T('obA'), a), el('label', { class: 'f', for: 'set-b' }, T('obB'), b)),
      el('div', { class: 'row-btns' }, saveNames),
      el('div', { class: 'kvline' }, el('span', { text: T('sStatus') }), el('b', { text: accessLabel(p) })),
      el('div', { class: 'kvline' }, el('span', { text: T('sAI') }), el('b', { text: p.ai ? T('sAIon') : T('sAIoff') })),
      (p.access !== 'active' || !p.ai) ? el('p', { class: 'small', text: T('payHow') + (ENV.contact ? ` ${T('contact')}: ${ENV.contact}` : '') }) : null));

    // members
    const roleName = (r) => T({ owner: 'rOwner', editor: 'rEditor', viewer: 'rViewer' }[r]);
    const mt = el('table', {}, el('thead', {}, el('tr', {}, [T('gName'), T('gEmail'), T('sMembers'), ''].map((h, i) => el('th', { class: i < 2 ? 'l' : '', text: i === 2 ? '' : h })))));
    const tb = el('tbody');
    members.forEach((m) => {
      const self = m.id === Sync.me.id;
      let roleCell = el('span', { text: roleName(m.role) });
      if (owner && !self) {
        roleCell = el('select', { 'aria-label': T('sMembers') }, ['owner', 'editor', 'viewer'].map((r) => el('option', { value: r, text: roleName(r) })));
        roleCell.value = m.role;
        roleCell.addEventListener('change', async () => { const r = await api('/plan/members', { method: 'POST', body: { user_id: m.id, role: roleCell.value } }); if (!r.ok) { toast(errText(r)); roleCell.value = m.role; } else toast(T('saved')); });
      }
      const act = el('td', {});
      if (self) {
        const leave = el('button', { type: 'button', class: 'ghost', text: T('sLeave') });
        leave.addEventListener('click', async () => {
          if (!leave.dataset.arm) { leave.dataset.arm = 1; leave.textContent = T('del'); leave.classList.add('danger'); return; }
          const r = await api('/plan/members', { method: 'POST', body: { user_id: m.id, remove: true } });
          if (!r.ok) return toast(errText(r));
          S.planId = null; savePrefs(); resetSync(); await afterSignIn();
        });
        act.append(leave);
      } else if (owner) {
        act.append(delBtn(T('sRemove'), async () => { const r = await api('/plan/members', { method: 'POST', body: { user_id: m.id, remove: true } }); if (!r.ok) return toast(errText(r)); renderSettings(); }));
      }
      tb.append(el('tr', {}, el('td', { class: 'l vname', text: m.display + (self ? ` (${T('sYou')})` : '') }), el('td', { class: 'l', text: m.email || '—' }), el('td', { class: 'l' }, roleCell), act));
    });
    mt.append(tb);
    const memberPanel = el('div', { class: 'panel scroll' }, el('h3', { text: T('sMembers') }), mt);
    box.append(memberPanel);

    // invites
    if (owner) {
      const role = el('select', { id: 'inv-role' }, el('option', { value: 'editor', text: T('sRoleEditor') }), el('option', { value: 'viewer', text: T('sRoleViewer') }));
      const out = el('div', { class: 'invite-out', hidden: true });
      const make = el('button', { type: 'button', class: 'primary', text: T('sMakeInvite') });
      make.addEventListener('click', async () => {
        const r = await api('/plan/invites', { method: 'POST', body: { role: role.value } });
        if (!r.ok) return toast(errText(r));
        out.hidden = false; out.innerHTML = '';
        const copyBtn = (text) => { const c = el('button', { type: 'button', text: T('copy') }); c.addEventListener('click', () => { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast(T('copied2')), () => toast(text)); }); return c; };
        out.append(el('div', { class: 'invite-code mono', text: r.data.code }), copyBtn(r.data.code),
          el('input', { class: 'invite-link', readonly: true, value: r.data.link }), copyBtn(r.data.link),
          el('p', { class: 'small', text: T('sInviteHelp') }));
        out.querySelector('.invite-link').value = r.data.link;
      });
      const pend = invites.length ? el('div', { class: 'small' }, T('sOpenInvites')(invites.length) + ' ',
        ...invites.map((iv) => { const x = el('button', { type: 'button', class: 'ghost', text: `${roleName(iv.role)} · ${fmtDate(iv.expires_at)} ✕` }); x.addEventListener('click', async () => { await api('/plan/invites/revoke', { method: 'POST', body: { ref: iv.ref } }); renderSettings(); }); return x; })) : null;
      box.append(el('div', { class: 'panel' }, el('h3', { text: T('sInvite') }), el('div', { class: 'row-btns' }, role, make), out, pend));
    }

    // my account
    const disp = el('input', { id: 'acc-name', maxlength: 40 }); disp.value = Sync.me.display || '';
    const mail = el('input', { id: 'acc-email', type: 'email', maxlength: 254 }); mail.value = Sync.me.email || '';
    const saveAcc = el('button', { type: 'button', class: 'primary', text: T('sSave') });
    saveAcc.addEventListener('click', async () => {
      const r = await api('/account', { method: 'PATCH', body: { display: disp.value, email: mail.value } });
      if (!r.ok) return toast(errText(r)); await refreshMe(); toast(T('saved'));
    });
    const cur = el('input', { id: 'acc-cur', type: 'password', autocomplete: 'current-password' }), nw = el('input', { id: 'acc-new', type: 'password', autocomplete: 'new-password', minlength: 8 });
    const savePw = el('button', { type: 'button', text: T('sChangePass') });
    savePw.addEventListener('click', async () => {
      const r = await api('/account', { method: 'PATCH', body: { password: cur.value, newPassword: nw.value } });
      if (!r.ok) return toast(errText(r)); cur.value = ''; nw.value = ''; toast(T('saved'));
    });
    box.append(el('div', { class: 'panel' }, el('h3', { text: T('sAccount') }),
      !Sync.me.email ? el('p', { class: 'small warn-text', text: T('sEmailNeeded') }) : null,
      el('div', { class: 'fields' }, el('label', { class: 'f', for: 'acc-name' }, T('gName'), disp), el('label', { class: 'f', for: 'acc-email' }, T('gEmail'), mail)),
      el('div', { class: 'row-btns' }, saveAcc),
      el('div', { class: 'fields' }, el('label', { class: 'f', for: 'acc-cur' }, T('sCurPass'), cur), el('label', { class: 'f', for: 'acc-new' }, T('sNewPass'), nw)),
      el('div', { class: 'row-btns' }, savePw)));

    box.append(renderTwoStep());

    // another plan
    const np = el('button', { type: 'button', text: T('sNewPlan') });
    np.addEventListener('click', () => { $('ob-a').value = ''; $('ob-b').value = ''; showGate('onboard'); });
    box.append(el('div', { class: 'row-btns' }, np));

    // delete account
    const pw = el('input', { id: 'del-pw', type: 'password', autocomplete: 'current-password' });
    const del = el('button', { type: 'button', class: 'danger', text: T('sDeleteBtn') });
    del.addEventListener('click', async () => {
      if (!del.dataset.arm) { del.dataset.arm = 1; del.textContent = T('del') + ' ' + T('sDeleteBtn'); return; }
      const r = await api('/account', { method: 'DELETE', body: { password: pw.value } });
      if (!r.ok) { delete del.dataset.arm; del.textContent = T('sDeleteBtn'); return toast(errText(r)); }
      resetSync(); Sync.me = null; S = Object.assign(DEFAULTS(), {}); loadPrefs(); ensureShape(); renderAll(); showGate('login');
    });
    const takeBtn = el('button', { type: 'button', text: T('sExportFirst') });
    takeBtn.addEventListener('click', () => { location.href = '/api/export?plan=' + Sync.planId; });
    box.append(el('div', { class: 'panel danger-zone' }, el('h3', { text: T('sDanger') }), el('p', { class: 'small', text: T('sDeleteHelp') }),
      Sync.planId ? el('div', { class: 'row-btns' }, takeBtn) : null,
      el('div', { class: 'fields' }, el('label', { class: 'f', for: 'del-pw' }, T('sDeletePw'), pw)), el('div', { class: 'row-btns' }, del)));
  }
  async function refreshMe() {
    const me = await api('/me'); if (!me.ok) return;
    Sync.me = me.data.user; Sync.plans = me.data.plans;
    const p = Sync.plans.find((x) => x.id === Sync.planId); if (p) Sync.plan = p;
    applyPlanNames(); renderAll();
  }

  // ---------- admin tab ----------
  async function renderAdmin() {
    const box = $('admin-body'); if (!box || !Sync.me || !Sync.me.is_admin) return;
    const r = await api('/admin/plans');
    if (r.status === 403 && r.data && r.data.error === 'admin_2fa_required') {
      box.innerHTML = '';
      const go = el('button', { type: 'button', class: 'primary', text: T('adGoSettings') });
      go.addEventListener('click', () => { S.tab = 'settings'; save(); applyTab(); });
      box.append(el('div', { class: 'panel' }, el('h3', { text: T('adNeed2fa') }), el('p', { class: 'small', text: r.data.enrolled ? T('adNeed2faLogin') : T('adNeed2faSetup') }), r.data.enrolled ? null : go));
      return;
    }
    if (!r.ok) { box.textContent = errText(r); return; }
    box.innerHTML = '';
    await renderAdminSecurity(box);
    box.append(el('p', { class: 'small', text: T('adEmail')(r.data.emailConfigured) }));
    const tbl = el('table', {}, el('thead', {}, el('tr', {}, [['#', ''], [T('adPlan'), 'l'], [T('adMembers'), 'l'], [T('adAccess'), 'l'], [T('adUntil'), 'l'], [T('adActions'), 'l'], [T('adAI'), 'l'], [T('adIO'), 'l'], [T('adNote'), 'l'], [T('adLast'), 'l']].map(([t, c]) => el('th', { class: c, text: t })))));
    const tb = el('tbody');
    const patch = async (id, body) => { const x = await api('/admin/plans/' + id, { method: 'PATCH', body }); if (!x.ok) toast(errText(x)); else { toast(T('saved')); renderAdmin(); if (id === Sync.planId) refreshMe(); } };
    const resetBtn = (u) => {
      const b = el('button', { type: 'button', class: 'ghost', text: T('adReset') });
      const wrap = el('span', {}, b);
      b.addEventListener('click', async () => {
        const x = await api('/admin/reset-link', { method: 'POST', body: { user_id: u.id } });
        if (!x.ok) return toast(errText(x));
        const out = el('input', { class: 'invite-link', readonly: true, 'aria-label': T('adReset') }); out.value = x.data.link;
        wrap.querySelector('input')?.remove(); wrap.append(out); out.select();
        (navigator.clipboard ? navigator.clipboard.writeText(x.data.link) : Promise.reject()).then(() => toast(T('copied2') + ` · ${x.data.minutes} min`), () => {});
      });
      return wrap;
    };
    r.data.plans.forEach((p) => {
      const ai = el('input', { type: 'checkbox', id: 'ai-' + p.id }); ai.checked = !!p.ai_enabled;
      ai.addEventListener('change', () => patch(p.id, { ai_enabled: ai.checked }));
      const io = el('input', { type: 'checkbox', id: 'io-' + p.id, 'aria-label': T('adIO') }); io.checked = !!p.io_enabled;
      io.addEventListener('change', () => patch(p.id, { io_enabled: io.checked }));
      const note = el('input', { value: p.admin_note || '', maxlength: 500, style: 'min-width:10rem' }); note.value = p.admin_note || '';
      note.addEventListener('change', () => patch(p.id, { admin_note: note.value }));
      const btn = (label, body) => { const b = el('button', { type: 'button', text: label }); b.addEventListener('click', () => patch(p.id, body)); return b; };
      const until = p.paid_until ? fmtDate(p.paid_until) : p.status === 'active' ? '∞' : p.trial_ends ? `trial → ${fmtDate(p.trial_ends)}` : '—';
      tb.append(el('tr', {},
        el('td', { class: 'n', text: p.id }),
        el('td', { class: 'l vname', text: p.name }),
        el('td', { class: 'l wrap-cell' }, ...p.members.map((m) => el('div', {}, `${m.display} · ${m.email || '—'} · ${m.role} `, resetBtn(m)))),
        el('td', { class: 'l' }, el('span', { class: 'chip ' + (p.access === 'expired' ? 'bad' : p.access === 'trial' ? 'plan' : 'good'), text: p.access })),
        el('td', { class: 'l', text: until }),
        el('td', { class: 'l' }, el('div', { class: 'row-btns' }, btn(T('ad30'), { extendDays: 30 }), btn(T('ad365'), { extendDays: 365 }), btn(T('adExpire'), { status: 'expired', paid_until: null, trial_ends: null }))),
        el('td', { class: 'l' }, ai),
        el('td', { class: 'l' }, io),
        el('td', { class: 'l' }, note),
        el('td', { class: 'l small', text: p.last_edit ? fmtDate(new Date(p.last_edit).getTime()) : '—' })));
    });
    tbl.append(tb);
    box.append(el('div', { class: 'panel scroll' }, tbl));
    if (r.data.usersWithoutPlan.length) {
      box.append(el('div', { class: 'panel' }, el('h3', { text: T('adNoPlan') }),
        ...r.data.usersWithoutPlan.map((u) => el('div', { class: 'small' }, `${u.display} · ${u.email || '—'} · ${fmtDate(new Date(u.created_at).getTime())} `, resetBtn(u)))));
    }
  }

  // ---------- boot ----------
  function showEnv(name) {
    if (name !== 'staging') return;
    $('env-banner').hidden = false;
  }
  async function boot() {
    loadPrefs();
    if (!(await ensureLang(S.lang))) S.lang = 'en';
    ensureShape(); renderAll();
    const q = new URLSearchParams(location.search);
    if (q.get('join')) { try { sessionStorage.setItem('nadu-join', q.get('join')); } catch (e) {} history.replaceState(null, '', location.pathname); }
    const er = await api('/env'); if (er.ok) Object.assign(ENV, er.data);
    showEnv(ENV.env); applyPlanNames();
    if (q.get('reset')) { resetToken = q.get('reset'); showGate('reset'); return; }
    const r = await api('/me');
    if (r.ok) afterSignIn(); else showGate(q.get('join') ? 'signup' : 'login');
  }

  // ---------- history tab ----------
  let histRows = [], histDone = false;
  async function renderHistory(reset = true) {
    if (!Sync.me) return;
    if (reset) { histRows = []; histDone = false; }
    const before = histRows.length ? histRows[histRows.length - 1].id : 0;
    const r = await api('/history?limit=50' + (before ? '&before=' + before : ''));
    if (!r.ok) return;
    Sync.users = r.data.users || Sync.users;
    histRows = histRows.concat(r.data.rows); histDone = r.data.rows.length < 50;
    const tbl = $('hist-table'); tbl.innerHTML = '';
    thead(tbl, [[T('hWhen'), 'l'], [T('hWho'), 'l'], [T('hWhat'), 'l'], [T('hAct'), 'l'], [T('hVer')], ['']]);
    const tb = el('tbody');
    if (!histRows.length) emptyRow(tb, 6, T('histEmpty'));
    histRows.forEach((h) => {
      const b = el('button', { type: 'button', text: T('restoreL'), disabled: !(Sync.plan && Sync.plan.writable) });
      b.addEventListener('click', async () => {
        if (!b.dataset.arm) { b.dataset.arm = '1'; b.textContent = T('restoreQ'); b.classList.add('danger'); setTimeout(() => { if (b.isConnected) { delete b.dataset.arm; b.textContent = T('restoreL'); b.classList.remove('danger'); } }, 3000); return; }
        clearTimeout(Sync.timer); await flush();
        const rr = await api('/restore', { method: 'POST', body: { id: h.id } });
        if (rr.ok) { toast(T('restored')); await poll(); renderHistory(true); } else toast(T('stError'));
      });
      const d = new Date(h.at);
      tb.append(el('tr', {},
        el('td', { class: 'l mono', text: d.toLocaleString(locale(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), title: h.at }),
        el('td', { class: 'l', text: Sync.users[h.user_id] || '—' }),
        el('td', { class: 'l vname', text: T('keyLabels')[h.key] || h.key }),
        el('td', { class: 'l' }, el('span', { class: 'chip ' + (h.action === 'restore' ? 'plan' : h.action === 'import' ? 'rose' : ''), text: T({ edit: 'aEdit', restore: 'aRestore', import: 'aImport' }[h.action] || 'aEdit') })),
        el('td', { class: 'n', text: 'v' + h.version }),
        el('td', {}, el('div', { class: 'rowacts' }, b))));
    });
    tbl.append(tb);
    $('hist-more').hidden = histDone;
  }

  // ---------- exports ----------
  function download(name, text, type) {
    const blob = new Blob([text], { type }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = (head, rows) => '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n'); // BOM so Excel reads Korean
  const stamp = () => new Date().toISOString().slice(0, 10);
  const EXPORTS = {
    backup: () => { S.tab = 'admin'; save(); applyTab(); setTimeout(() => $('bk-reason') && $('bk-reason').scrollIntoView({ block: 'center' }), 300); },
    json: () => { location.href = '/api/export?plan=' + Sync.planId; },
    exp: () => download(`expenses-${stamp()}.csv`, csv([T('fCat'), T('fItem'), T('fAmt'), T('fStatus'), T('fPaidBy'), T('fMemo')],
      S.expenses.map((x) => [cname(x.cat), x.name, n(x.amount), x.status === 'paid' ? T('expPaid') : T('expPlanned'), pname(x.paidBy), x.memo || ''])), 'text/csv'),
    guests: () => download(`guests-${stamp()}.csv`, csv([T('fName'), T('fSide'), T('fGroup'), T('fCount'), T('fAttend'), T('fMemo')],
      S.guests.map((x) => [x.name, x.side === 'b' ? T('sideB') : T('sideG'), x.group || '', Math.max(1, n(x.count)), T({ yes: 'aYes', maybe: 'aMaybe', no: 'aNo' }[x.status] || 'aMaybe'), x.memo || ''])), 'text/csv'),
    gifts: () => download(`gift-money-${stamp()}.csv`, csv([T('fName'), T('fSide'), T('fAmt'), T('fMemo'), T('thanked')],
      S.giftLog.map((x) => [x.name, x.side === 'b' ? T('sideB') : T('sideG'), n(x.amount), x.memo || '', x.thanked ? 'Y' : ''])), 'text/csv'),
    vendors: () => download(`vendors-${stamp()}.csv`, csv([T('fCat'), T('fVendor'), T('fQuote'), T('fFinal'), T('fMemo'), T('pickedL')],
      S.vendors.map((v) => [cname(v.cat), v.name, n(v.quote), n(v.final), v.memo || '', v.picked ? 'Y' : ''])), 'text/csv'),
    hist: async () => {
      let rows = [], before = 0;
      for (let i = 0; i < 20; i++) { const r = await api('/history?limit=200' + (before ? '&before=' + before : '')); if (!r.ok || !r.data.rows.length) break; rows = rows.concat(r.data.rows); Sync.users = r.data.users || Sync.users; before = r.data.rows[r.data.rows.length - 1].id; if (r.data.rows.length < 200) break; }
      download(`history-${stamp()}.csv`, csv([T('hWhen'), T('hWho'), T('hWhat'), T('hAct'), T('hVer')],
        rows.map((h) => [h.at, Sync.users[h.user_id] || '', T('keyLabels')[h.key] || h.key, h.action, h.version])), 'text/csv');
    }
  };
  function renderExportButtons() {
    const box = $('export-btns'); if (!box) return; box.innerHTML = '';
    [['backup', 'exBackup'], ['json', 'exJson'], ['exp', 'exExp'], ['guests', 'exGuests'], ['gifts', 'exGifts'], ['vendors', 'exVendors'], ['hist', 'exHist']]
      .filter(([k]) => k !== 'backup' || (Sync.me && Sync.me.is_admin)).forEach(([k, lab]) => {
      const b = el('button', { type: 'button', text: T(lab) });
      // CSVs are built here from data the page already has; report them so the access log is complete.
      b.addEventListener('click', () => { if (!['backup', 'json'].includes(k)) api('/export/log', { method: 'POST', body: { what: k } }); EXPORTS[k](); });
      box.append(b);
    });
  }
  $('hist-more').addEventListener('click', () => renderHistory(false));

  // ---------- two-step sign-in (Settings) ----------
  function renderTwoStep() {
    const panel = el('div', { class: 'panel' }, el('h3', { text: T('tsTitle') + ' · ' + (Sync.me.two_step ? T('tsOn') : T('tsOff')) }), el('p', { class: 'small', text: T('tsHelp') }));
    const pw = el('input', { id: 'ts-pw', type: 'password', autocomplete: 'current-password' });
    const code = el('input', { id: 'ts-code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6 });
    if (!Sync.me.two_step) {
      const start = el('button', { type: 'button', class: 'primary', text: T('tsStart') });
      const area = el('div');
      start.addEventListener('click', async () => {
        const x = await api('/account/2fa/setup', { method: 'POST', body: { password: pw.value } });
        if (!x.ok) return toast(errText(x));
        pw.value = '';
        const confirm = el('button', { type: 'button', class: 'primary', text: T('tsConfirm') });
        confirm.addEventListener('click', async () => {
          const y = await api('/account/2fa/enable', { method: 'POST', body: { code: code.value } });
          if (!y.ok) return toast(errText(y));
          toast(T('tsDone')); await refreshMe();
        });
        area.innerHTML = '';
        area.append(el('p', { class: 'small', text: T('tsStep1') }), el('div', { class: 'totp-key', text: x.data.secret.replace(/(.{4})/g, '$1 ').trim() }),
          el('p', { class: 'small' }, el('a', { href: x.data.uri, text: T('tsLink') })), el('p', { class: 'small', text: T('tsStep2') }),
          el('div', { class: 'fields' }, el('label', { class: 'f', for: 'ts-code' }, T('tsCode'), code)), el('div', { class: 'row-btns' }, confirm));
      });
      panel.append(el('div', { class: 'fields' }, el('label', { class: 'f', for: 'ts-pw' }, T('tsPw'), pw)), el('div', { class: 'row-btns' }, start), area);
    } else {
      const stop = el('button', { type: 'button', text: T('tsStop') });
      stop.addEventListener('click', async () => {
        const x = await api('/account/2fa/disable', { method: 'POST', body: { password: pw.value, code: code.value } });
        if (!x.ok) return toast(errText(x));
        toast(T('tsOffDone')); await refreshMe();
      });
      panel.append(el('div', { class: 'fields' }, el('label', { class: 'f', for: 'ts-pw' }, T('tsPw'), pw), el('label', { class: 'f', for: 'ts-code' }, T('tsCode'), code)), el('div', { class: 'row-btns' }, stop));
    }
    return panel;
  }

  // ---------- admin: security & privacy ----------
  let auditKind = '';
  async function renderAdminSecurity(box) {
    const s = await api('/admin/security'); if (!s.ok) return;
    const d = s.data, plainLeft = Object.values(d.plaintext).reduce((a, b) => a + b, 0);
    const item = (label, value, state) => el('div', { class: 'sec-item ' + (state || '') }, el('b', { text: label }), el('span', { text: value }));
    const grid = el('div', { class: 'sec-grid' },
      item(T('secEnc'), d.encryption.on ? T('secEncOn')(d.encryption.id) + (plainLeft ? ' · ' + T('secPlain')(plainLeft) : '') : T('secEncOff'), d.encryption.on ? (plainLeft ? 'warn' : 'ok') : 'bad'),
      item(T('secEmail'), d.email ? T('secOn') : T('secOffS'), d.email ? 'ok' : 'warn'),
      item(T('secTurnstile'), d.turnstile ? T('secOn') : T('secOffS'), d.turnstile ? 'ok' : 'warn'),
      item(T('secLimit'), d.rateLimitBinding ? T('secOn') : T('secOn') + ' (per isolate)', d.rateLimitBinding ? 'ok' : 'warn'),
      item(T('secSignup'), d.signupOpen ? T('secOpen') : T('secClosed')),
      item(T('secOfficer'), d.privacyOfficer.name || d.privacyOfficer.email ? [d.privacyOfficer.name, d.privacyOfficer.email].filter(Boolean).join(' · ') : T('secUnset'), d.privacyOfficer.email ? 'ok' : 'warn'),
      item(T('secLegacy'), d.legacyTables.length ? d.legacyTables.join(', ') : T('secNone'), d.legacyTables.length ? 'warn' : 'ok'));
    const encBtn = el('button', { type: 'button', text: T('secEncNow') });
    encBtn.addEventListener('click', async () => {
      encBtn.disabled = true; let x;
      do { x = await api('/admin/reencrypt', { method: 'POST' }); } while (x.ok && x.data.done);
      if (!x.ok) toast(errText(x)); else toast(T('saved'));
      renderAdmin();
    });
    const ret = el('div', { class: 'small' }, el('b', { text: T('secRetention') + ': ' }), d.retention.length ? d.retention.map((x) => T('secRetRow')(x)).join(' · ') : T('secRetNone'));
    box.append(el('div', { class: 'panel' }, el('h3', { text: T('secTitle') }), grid, d.encryption.on && plainLeft ? el('div', { class: 'row-btns' }, encBtn) : null, ret));

    // encrypted backup
    const reason = el('input', { id: 'bk-reason', maxlength: 200 }), p1 = el('input', { id: 'bk-pass', type: 'password', autocomplete: 'new-password' }), p2 = el('input', { id: 'bk-pass2', type: 'password', autocomplete: 'new-password' });
    const go = el('button', { type: 'button', class: 'primary', text: T('bkGo') });
    go.addEventListener('click', async () => {
      if (p1.value !== p2.value) return toast(T('bkMismatch'));
      go.disabled = true;
      try {
        const res = await fetch('/api/admin/backup', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason: reason.value, passphrase: p1.value }) });
        if (!res.ok) { let e = {}; try { e = await res.json(); } catch (x) {} return toast(errText({ data: e })); }
        const name = (/filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '') || [])[1] || 'nadu-backup.nadubackup';
        const url = URL.createObjectURL(await res.blob()); const a = el('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
        p1.value = ''; p2.value = ''; toast(T('bkDone'));
      } finally { go.disabled = false; }
    });
    box.append(el('div', { class: 'panel' }, el('h3', { text: T('bkTitle') }), el('p', { class: 'small', text: T('bkHelp') }),
      el('div', { class: 'fields' }, el('label', { class: 'f', for: 'bk-reason' }, T('bkReason'), reason), el('label', { class: 'f', for: 'bk-pass' }, T('bkPass'), p1), el('label', { class: 'f', for: 'bk-pass2' }, T('bkPass2'), p2)),
      el('div', { class: 'row-btns' }, go)));

    // access log review
    const au = await api('/admin/audit?days=31' + (auditKind ? '&kind=' + auditKind : ''));
    const chips = el('div', { class: 'row-btns' }, ...[['', 'auAll'], ['downloads', 'auDownloads'], ['security', 'auSecurity'], ['admin', 'auAdmin'], ['members', 'auMembers']].map(([k, lab]) => {
      const b = el('button', { type: 'button', class: 'chipbtn', 'aria-pressed': String(auditKind === k), text: T(lab) });
      b.addEventListener('click', () => { auditKind = k; renderAdmin(); }); return b;
    }));
    const verifyOut = el('span', { class: 'small' });
    const vb = el('button', { type: 'button', text: T('auVerify') });
    vb.addEventListener('click', async () => { const v = await api('/admin/audit/verify'); if (!v.ok) return toast(errText(v)); verifyOut.textContent = v.data.ok ? T('auOk')(v.data.rows) : T('auBad')(v.data.tampered.length, v.data.missing.length); verifyOut.className = 'small ' + (v.data.ok ? '' : 'warn-text'); });
    chips.append(vb, verifyOut);
    const hl = new Set(['export', 'export_csv', 'import', 'admin_backup', 'admin_notify_list', 'read_lockout', 'login_fail']);
    const tbl = el('table', { class: 'audit-table' }, el('thead', {}, el('tr', {}, [T('auWhen'), T('auWho'), T('auIp'), T('auAct'), T('auDetail')].map((t) => el('th', { class: 'l', text: t })))));
    const tb = el('tbody');
    const rows = au.ok ? au.data.rows : [];
    if (!rows.length) tb.append(el('tr', {}, el('td', { class: 'empty-row', colspan: 5, text: T('auEmpty') })));
    rows.slice(0, 200).forEach((x) => tb.append(el('tr', {},
      el('td', { class: 'l', text: new Date(x.at).toLocaleString(locale()) }), el('td', { class: 'l', text: x.email || (x.user_id ? '#' + x.user_id : '—') }),
      el('td', { class: 'l mono', text: x.ip || '' }), el('td', { class: 'l' + (hl.has(x.action) ? ' hl' : ''), text: x.action + (x.plan_id ? ` · #${x.plan_id}` : '') }),
      el('td', { class: 'l', text: [x.target, x.detail].filter(Boolean).join(' · ') }))));
    tbl.append(tb);
    box.append(el('div', { class: 'panel' }, el('h3', { text: T('auTitle') }), el('p', { class: 'small', text: T('auHelp') }), chips, el('div', { class: 'scroll' }, tbl)));

    // breach notice list
    const nb = el('button', { type: 'button', text: T('ntGo') });
    nb.addEventListener('click', async () => {
      const x = await api('/admin/notify-list?plan=all'); if (!x.ok) return toast(errText(x));
      const list = x.data.emails.map((e) => e.email).join(', ');
      try { await navigator.clipboard.writeText(list); toast(T('ntDone')(x.data.emails.length)); } catch (e) { toast(list.slice(0, 200)); }
    });
    box.append(el('div', { class: 'panel' }, el('h3', { text: T('ntTitle') }), el('p', { class: 'small', text: T('ntHelp') }), el('div', { class: 'row-btns' }, nb)));
  }

  // ---------- quote & offer parser (AI add-on, see parse.js) ----------
  Object.assign(L.ko, {
    parse: '견적 붙여넣기', psTitle: '견적·혜택 붙여넣기',
    psHelp: '업체 견적서, 카페 혜택 글, 카톡 안내를 글로 붙여넣거나 캡처 화면을 붙여넣으세요(Ctrl/⌘+V). AI가 읽고 스드메·예식장·업체 비교·대출·혼수 중 맞는 곳에 넣을 항목을 보여 줘요. 확인한 항목만 추가돼요.',
    psLocked: 'AI 견적 읽기는 유료 부가 서비스(AI)예요. 관리자에게 문의하세요.', psReadOnly: '보기 전용 멤버는 항목을 추가할 수 없어요.',
    psPh: '여기에 견적이나 혜택 글을 붙여넣으세요. 캡처 화면도 여기서 Ctrl/⌘+V 하면 돼요.',
    psDrop: '캡처 이미지를 여기로 끌어다 놓거나 눌러서 고르세요', psDropHint: 'PNG, JPG, WEBP', psImage: '붙여넣은 이미지', psRemoveImage: '이미지 빼기', psBadImage: '이미지를 열 수 없어요.',
    psPrivacy: '읽는 동안에만 Cloudflare AI로 보내고 저장하지 않아요. 연락처나 주민등록번호가 보이면 가리고 붙여넣어 주세요.',
    psRead: 'AI로 읽기', psReading: '읽는 중…', psClear: '지우기', psEmpty: '글이나 이미지를 먼저 넣어 주세요.', psNothing: '견적이나 혜택을 찾지 못했어요. 더 선명한 캡처나 글로 다시 해 보세요.',
    psFound: (n) => `${n}개 항목을 찾았어요`, psCheck: '이름, 가격, 넣을 곳을 확인하고 필요 없는 항목은 체크를 빼세요. 가격은 할인 적용 금액이에요.',
    psName: '이름', psPrice: '가격 (원)', psWhere: '넣을 곳', psKind: '분류', psKeep: '추가하기', psCond: '조건',
    psUpTo: (x) => `옵션 포함 최대 ₩${x}`, psList: (x) => `정가 ₩${x}`, psMeal: (x) => `식대 1인 ₩${x}`,
    psAdd: '선택한 항목 추가', psNoneChosen: '추가할 항목을 골라 주세요.', psAdded: (list) => `추가했어요: ${list}`,
    psDest: { sdm: '스드메 업체 목록', venue: '예식장 옵션', vendor: '업체 비교', loan: '대출 옵션', honsu: '혼수' },
    psSdmCat: { studios: '스튜디오', dresses: '드레스', tux: '턱시도', makeup: '헤어·메이크업', hair: '헤어변형' },
    psErrGeneric: 'AI가 지금 응답하지 않아요. 잠시 후 다시 해 주세요.',
    psErr: { addon_required: 'AI 부가 서비스가 필요해요.', id_number: '주민등록번호 같은 고유식별번호가 있어요. 지우고 다시 해 주세요.', bad_image: 'PNG, JPG, WEBP 이미지만 읽을 수 있어요.', image_too_large: '이미지가 너무 커요. 화면 일부만 캡처해 주세요.', nothing_to_read: '글이나 이미지를 먼저 넣어 주세요.', ai_daily_limit: '오늘 쓸 수 있는 AI 읽기 횟수를 다 썼어요. 내일 다시 해 주세요.', ai_quota: '오늘 사이트 전체 AI 사용량이 다 찼어요. 내일 다시 해 주세요.', ai_busy: 'AI가 바빠요. 잠시 후 다시 해 주세요.', ai_unavailable: 'AI가 읽지 못했어요. 다시 해 보거나 글로 붙여넣어 주세요.', ai_not_configured: 'AI 연결이 아직 설정되지 않았어요. 관리자에게 알려 주세요.', read_only: '보기 전용이라 추가할 수 없어요.', plan_expired: '이용 기간이 끝나 추가할 수 없어요.' }
  });
  Object.assign(L.en, {
    parse: 'Paste a quote', psTitle: 'Paste a quote or offer',
    psHelp: 'Paste a vendor quote, a cafe promo post or a KakaoTalk message as text, or paste a screenshot (Ctrl/⌘+V). AI reads it and shows items for the right place: 스드메, venues, vendor comparison, loans or 혼수. Only the items you confirm are added.',
    psLocked: 'Reading quotes with AI is part of the paid AI add-on. Ask the site admin.', psReadOnly: 'View-only members cannot add items.',
    psPh: 'Paste a quote or offer here. Screenshots can be pasted here too with Ctrl/⌘+V.',
    psDrop: 'Drop a screenshot here, or click to choose one', psDropHint: 'PNG, JPG, WEBP', psImage: 'Pasted image', psRemoveImage: 'Remove image', psBadImage: 'That image could not be opened.',
    psPrivacy: 'Sent to Cloudflare AI only while it is read, and not stored. Cover phone numbers or ID numbers before pasting.',
    psRead: 'Read with AI', psReading: 'Reading…', psClear: 'Clear', psEmpty: 'Add some text or an image first.', psNothing: 'No quote or offer found. Try a sharper screenshot, or paste the text.',
    psFound: (n) => `Found ${n} item${n === 1 ? '' : 's'}`, psCheck: 'Check the name, price and where each goes, and untick anything you don’t want. Prices are the offer price.',
    psName: 'Name', psPrice: 'Price (₩)', psWhere: 'Add to', psKind: 'Category', psKeep: 'Add this', psCond: 'Conditions',
    psUpTo: (x) => `up to ₩${x} with options`, psList: (x) => `regular price ₩${x}`, psMeal: (x) => `meals ₩${x} per guest`,
    psAdd: 'Add selected items', psNoneChosen: 'Choose at least one item to add.', psAdded: (list) => `Added: ${list}`,
    psDest: { sdm: '스드메 listings', venue: 'Venue options', vendor: 'Vendor comparison', loan: 'Loan options', honsu: '혼수 (home items)' },
    psSdmCat: { studios: 'Studio', dresses: 'Dress', tux: 'Tuxedo', makeup: 'Hair & makeup', hair: 'Hair change' },
    psErrGeneric: 'The AI is not responding right now. Try again in a moment.',
    psErr: { addon_required: 'This needs the AI add-on.', id_number: 'There is an ID number in the text. Remove it and try again.', bad_image: 'Only PNG, JPG or WEBP images can be read.', image_too_large: 'That image is too large. Capture a smaller part of the screen.', nothing_to_read: 'Add some text or an image first.', ai_daily_limit: 'You have used today’s AI reads for this plan. Try again tomorrow.', ai_quota: 'The site’s AI allowance for today is used up. Try again tomorrow.', ai_busy: 'The AI is busy. Try again in a moment.', ai_unavailable: 'The AI could not read that. Try again, or paste the text instead.', ai_not_configured: 'AI is not set up on this site yet. Let the admin know.', read_only: 'View-only, so nothing can be added.', plan_expired: 'Your plan has ended, so nothing can be added.' }
  });
  function renderParse() {
    const host = $('parse'); if (!host || host.hidden) return;
    const writable = !!(Sync.plan && Sync.plan.writable);
    window.NaduParse.render(host, {
      T, lang: S.lang, allowed: !!(Sync.plan && Sync.plan.ai), writable, api, toast,
      catOpts: BCATS.map((c) => [c[0], cname(c[0])]), sdmCatLabel: (k) => T('psSdmCat')[k], destLabel: (k) => T('psDest')[k],
      apply: (items) => {
        const r = window.NaduParse.applyItems({ sdmCatalog: S.sdmCatalog, venues: S.venues, vendors: S.vendors, loans: S.loans, honsu: S.honsu }, items, S.lang);
        Object.assign(S, r.state); save(); renderAll(); renderHonsu(); renderVendors(); prepSums(); if (S.tab === 'sdm') renderSdm();
        return r.counts;
      }
    });
  }
  $('btn-parse').addEventListener('click', () => { const p = $('parse'); p.hidden = !p.hidden; if (!p.hidden) { renderParse(); p.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });

  function renderAll() { ensurePrep(); applyLang(); renderTabs(); renderIoLock(); setupFolds(); renderBudget(); renderExtras(); renderVenues(); renderShared(); renderLoans(); if (forms.lang !== S.lang) renderPrepForms(); renderSearchRows(); renderRatio(); renderExportButtons(); compute(); renderHeader(); renderPresence(); renderPlanBar(); applyTab(); applyReadonly(); const pk = [S.lang, Sync.planId, Sync.plan && Sync.plan.ai, Sync.plan && Sync.plan.writable].join('|'); if (parseKey !== pk) { parseKey = pk; renderParse(); } }
  // The parse panel only redraws when language or access changes, so a partner's edit never wipes what's being typed.
  let parseKey = '';
  boot();
})();
