// 스드메 조합 — studio, dress, makeup and hair-change picker for Nadu Wedding Planner.
// The listings are the plan's own data (section `sdmCatalog`), the picks are section `sdm`, and
// photos are plan files. Nothing about any couple's choices lives in this file.
// index.html calls NaduSdm.render(host, ctx) whenever the tab is shown or the data changes.
(function () {
  'use strict';
  const CATS = ['studios', 'dresses', 'tux', 'makeup', 'hair'];
  const SLOT_OF = { studios: 'studio', dresses: 'dress', tux: 'tux', makeup: 'makeup', hair: 'hair' };
  const GARMENT = new Set(['dresses', 'tux']); // photo cards with shoot/ceremony prices
  const NO_INCL = new Set(['hair', 'tux']); // never covered by a studio package
  const PREFIX = { studios: 's', dresses: 'd', tux: 't', makeup: 'm', hair: 'h' };
  const DEFAULT_BUDGET = 3000000;
  const MOODS = [['w', '우드·한옥', 'Wood & hanok'], ['g', '그리너리', 'Greenery'], ['wh', '흰배경 인물', 'White studio'], ['bk', '블랙·흑백', 'Black & mono'], ['set', '화려한 세트', 'Grand sets']];
  const TIERS = [['c', '가성비', 'Value'], ['m', '중간', 'Mid'], ['h', '고가', 'Premium'], ['r', '지방 토탈', 'Out of town']];
  const REGS = [['s', '서울', 'Seoul'], ['g', '경기', 'Gyeonggi'], ['d', '대구', 'Daegu'], ['o', '기타', 'Elsewhere']];
  const FOCUS = [['p', '인물중심', 'Faces first'], ['b', '배경중심', 'Backdrops first'], ['x', '균형', 'Balanced']];
  const FLAGN = [['야외', 'Outdoor'], ['통창', 'Big windows'], ['대문', 'Front door'], ['야간', 'Night']];
  const MKMOODS = [['sh', '고급 음영', 'Sculpted shading', '가을·겨울 톤 추천', 'Suits autumn and winter tones'], ['id', '아이돌 뽀용', 'Idol dewy', '봄 브라이트·트루 추천', 'Suits bright spring tones'], ['pu', '청순 맑음', 'Clear & pure', '봄 브라이트·여름 라이트 추천', 'Suits bright spring and light summer']];
  const TKINDS = [['rtw', '기성복', 'Ready-to-wear'], ['rent', '대여+맞춤', 'Rental + tailored'], ['custom', '맞춤', 'Fully tailored']];
  // price bands (만원) for the price filter on garment cards
  const BANDS = { dresses: [100, 170], tux: [50, 100] };
  const bandOf = (k, x) => !x.lo ? '' : x.lo < BANDS[k][0] ? 'c' : x.lo <= BANDS[k][1] ? 'm' : 'h';
  const DTAGS = [['si', '실크', 'Silk'], ['bz', '비즈', 'Beading'], ['la', '레이스', 'Lace'], ['im', '수입', 'Imported'], ['dm', '국내', 'Korean-made'], ['pu', '청순', 'Pure'], ['lv', '러블리', 'Lovely'], ['ht', '호텔 예식', 'Hotel weddings'], ['cl', '깔끔·심플', 'Clean & simple'], ['gl', '화려·고급', 'Glamorous'], ['un', '개성', 'Distinctive'], ['mk', '제작', 'Made to order']];

  const STR = {
    ko: {
      title: '스드메 조합', hint: '아래 카드를 칸으로 끌어다 놓거나 카드의 ‘조합에 넣기’를 누르세요.', budget: '스드메 예산', budgetHint: '조합 합계를 이 금액과 비교해요',
      budgetFrom: (b) => `예산 계획의 스드메 항목 ${b}을 쓰고 있어요`, budgetDefault: '예산이 없어서 300만원으로 계산했어요',
      slot: { studio: '스튜디오', dress: '드레스', tux: '턱시도', makeup: '헤어·메이크업', hair: '헤어변형' }, slotEmpty: { studio: '스튜디오 카드를 여기로', dress: '드레스 카드를 끌어오거나 직접 적어요', tux: '턱시도 카드를 끌어오거나 직접 적어요', makeup: '헤메 카드를 끌어오거나 직접 적어요', hair: '선택 사항이에요. 끌어오거나 직접 적어요' },
      name: '샵 이름', price: '금액', quote: '우리 견적', incl: '스튜디오 토탈에 포함', remove: '빼기',
      total: '조합 합계', ofBudget: (b) => `예산 ${b}`, left: '남는 돈', over: '예산 초과', clear: '조합 비우기', toVendor: '업체 비교에 넣기', vendorDone: (k) => `업체 비교에 ${k}곳을 넣었어요`, vendorNone: '넣을 새 업체가 없어요',
      short: '후보 스튜디오', shortHint: '♡를 누르거나 카드를 여기로 끌어오면 후보에 담겨요', shortEmpty: '아직 후보가 없어요',
      browse: '둘러보기', cat: { studios: '스튜디오', dresses: '드레스', tux: '턱시도', makeup: '헤어·메이크업', hair: '헤어변형' }, fKind: '종류', count: (k) => `${k}곳`,
      all: '전체', fMood: '무드', fTier: '가격', fReg: '지역', fStyle: '스타일', fShort: '후보만', fPop: '인기샵만', sort: '정렬', sortPrice: '가격 낮은 순', sortName: '이름 순',
      use: '조합에 넣기', inUse: '조합에 있음', shortAdd: '후보 담기', shortDel: '후보 빼기', pkg: '토탈', pkgLong: '토탈 (드레스·헤메 포함)', ask: '가격 상담', both: '촬영+본식', bon: '본식만', pop: '인기샵', artist: '유명 선생님',
      flagP: '추가금', noPhoto: '사진 없음', man: '만',
      add: '업체 추가', edit: '수정', del: '삭제', delSure: '정말 삭제?', save: '저장', cancel: '취소', photo: '사진', photoPick: '사진 고르기', dzPhoto: '사진을 끌어다 놓거나 눌러서 고르세요', dzPhotoHint: 'JPG · PNG · WebP, 큰 사진은 자동으로 줄여요', dzPhotoBad: 'JPG, PNG, WebP 사진만 올릴 수 있어요', photoDel: '사진 빼기', uploading: '사진 올리는 중…', upFail: '사진을 올리지 못했어요',
      fKo: '이름 (한국어)', fEn: '이름 (영어)', fLo: '최저가 (만원)', fHi: '최고가 (만원)', fBlo: '본식만 최저 (만원)', fBhi: '본식만 최고 (만원)', fLabel: '가격 표기', fArtist: '대표 선생님', fLink: '링크', fLinkLabel: '링크 이름', fLineKo: '한 줄 소개 (한국어)', fLineEn: '한 줄 소개 (영어)', fNote: '짧은 메모', fTotal: '토탈 상품 (드레스·헤메 포함)', fFocus: '촬영 스타일', fPopular: '인기샵', fFlags: '촬영 가능',
      flagOpt: [['-', '모름'], ['O', '가능'], ['+', '추가금'], ['X', '없음']], needName: '이름을 적어주세요',
      emptyTitle: '아직 업체 목록이 없어요', emptyHelp: '‘업체 추가’로 직접 넣거나, 업체 목록 파일이 있다면 내보내기·가져오기 메뉴의 ‘파일 열기’로 불러오세요.',
      ro: '보기 전용이에요', source: '가격은 바뀔 수 있으니 계약 전에 꼭 다시 확인하세요.'
    },
    en: {
      title: 'Studio, dress & makeup', hint: 'Drag cards into the slots, or tap “Use in combo” on a card.', budget: 'Package budget', budgetHint: 'The combo total is compared with this',
      budgetFrom: (b) => `Using the studio/dress/makeup line from the budget plan (${b})`, budgetDefault: 'No budget set, so this uses ₩3,000,000',
      slot: { studio: 'Studio', dress: 'Dress', tux: 'Tuxedo', makeup: 'Hair & makeup', hair: 'Hair changes' }, slotEmpty: { studio: 'Drag a studio card here', dress: 'Drag a dress card here or type one in', tux: 'Drag a tuxedo card here or type one in', makeup: 'Drag a makeup card here or type one in', hair: 'Optional. Drag one here or type one in' },
      name: 'Shop name', price: 'Price', quote: 'Our quote', incl: 'Included in the studio package', remove: 'Remove',
      total: 'Combo total', ofBudget: (b) => `Budget ${b}`, left: 'Left over', over: 'Over budget', clear: 'Clear combo', toVendor: 'Add to vendor list', vendorDone: (k) => `Added ${k} to the vendor list`, vendorNone: 'No new vendors to add',
      short: 'Shortlisted studios', shortHint: 'Tap ♡ or drag a card here to shortlist it', shortEmpty: 'Nothing shortlisted yet',
      browse: 'Browse', cat: { studios: 'Studios', dresses: 'Dresses', tux: 'Tuxedos', makeup: 'Hair & makeup', hair: 'Hair changes' }, fKind: 'Type', count: (k) => `${k} listed`,
      all: 'All', fMood: 'Look', fTier: 'Price', fReg: 'Area', fStyle: 'Style', fShort: 'Shortlist only', fPop: 'Popular only', sort: 'Sort', sortPrice: 'Lowest price', sortName: 'Name',
      use: 'Use in combo', inUse: 'In combo', shortAdd: 'Shortlist', shortDel: 'Unshortlist', pkg: 'Package', pkgLong: 'Package (dress & makeup included)', ask: 'Price on request', both: 'Shoot + ceremony', bon: 'Ceremony only', pop: 'Popular', artist: 'Known artist',
      flagP: 'extra fee', noPhoto: 'No photo', man: '',
      add: 'Add a listing', edit: 'Edit', del: 'Delete', delSure: 'Delete it?', save: 'Save', cancel: 'Cancel', photo: 'Photo', photoPick: 'Choose photo', dzPhoto: 'Drop a photo here, or click to choose one', dzPhotoHint: 'JPG · PNG · WebP, large photos are resized', dzPhotoBad: 'Only JPG, PNG or WebP photos', photoDel: 'Remove photo', uploading: 'Uploading photo…', upFail: 'Couldn’t upload the photo',
      fKo: 'Name (Korean)', fEn: 'Name (English)', fLo: 'Lowest price (₩10k)', fHi: 'Highest price (₩10k)', fBlo: 'Ceremony only, lowest (₩10k)', fBhi: 'Ceremony only, highest (₩10k)', fLabel: 'Price as listed', fArtist: 'Known artist', fLink: 'Link', fLinkLabel: 'Link label', fLineKo: 'One-line note (Korean)', fLineEn: 'One-line note (English)', fNote: 'Short tag', fTotal: 'Package (dress & makeup included)', fFocus: 'Shooting style', fPopular: 'Popular', fFlags: 'Available scenes',
      flagOpt: [['-', 'Unknown'], ['O', 'Yes'], ['+', 'Extra fee'], ['X', 'No']], needName: 'Add a name',
      emptyTitle: 'No listings yet', emptyHelp: 'Add shops with “Add a listing”, or if you have a listings file, open it with “Open file” in the export/import menu.',
      ro: 'View only', source: 'Prices change, so confirm before signing.'
    }
  };

  // ---------- helpers ----------
  const num = (v) => { const n = parseFloat(String(v ?? '').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };
  const won = (lang, n) => lang === 'ko' ? Math.round(n || 0).toLocaleString('ko-KR') + '원' : '₩' + Math.round(n || 0).toLocaleString('en-US');
  // Labels below are Korean/English pairs; other languages translate the English side (ctx.tx, from the language file).
  let tr = (s) => s;
  const pick = (arr, k, lang) => { const r = arr.find((x) => x[0] === k); return r ? (lang === 'ko' ? r[1] : tr(r[2])) : ''; };
  const strCache = {};
  const deepMerge = (base, over) => { const out = { ...base }; for (const [k, v] of Object.entries(over || {})) out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) ? deepMerge(base[k], v) : v; return out; };
  function strings(lg) {
    if (lg === 'ko' || lg === 'en') return STR[lg];
    const pack = window.NaduI18n && window.NaduI18n[lg];
    if (!pack) return STR.en;
    return strCache[lg] || (strCache[lg] = deepMerge(STR.en, pack.sdm || {}));
  }
  const uid = () => Math.random().toString(36).slice(2, 8);
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'value') e.value = v; else if (k === 'checked') e.checked = !!v; else if (k === 'disabled') e.disabled = !!v; else e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach((c) => { if (c != null && c !== false) e.append(c); });
    return e;
  }
  const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const emptyPicks = () => ({ studio: '', price: 0, dress: { id: '', name: '', price: 0 }, tux: { id: '', name: '', price: 0 }, makeup: { id: '', name: '', price: 0 }, hair: { id: '', name: '', price: 0 }, incl: true, short: [], budget: 0 });
  function normCatalog(c) {
    c = c && typeof c === 'object' ? c : {};
    const out = {};
    CATS.forEach((k) => { out[k] = Array.isArray(c[k]) ? c[k].filter((x) => x && x.id) : []; });
    return out;
  }
  function normPicks(p, cat) {
    p = p && typeof p === 'object' ? p : {};
    const slot = (o, list) => ({ id: list.some((x) => x.id === o?.id) ? o.id : '', name: String(o?.name || ''), price: num(o?.price) });
    return {
      studio: cat.studios.some((x) => x.id === p.studio) ? p.studio : '', price: num(p.price),
      dress: slot(p.dress, cat.dresses), tux: slot(p.tux, cat.tux), makeup: slot(p.makeup, cat.makeup), hair: slot(p.hair, cat.hair),
      incl: p.incl !== false, short: Array.isArray(p.short) ? p.short.filter((id) => cat.studios.some((x) => x.id === id)) : [], budget: num(p.budget)
    };
  }

  // ---------- view state (per device) ----------
  let F = Object.assign({ tk: '', tt: '', cat: 'studios', mood: '', tier: '', reg: '', short: false, sort: 'price', mm: '', mt: '', dt: '', dg: '', ht: '', hp: false }, lsGet('nadu-sdm-filters', {}));
  let editing = null; // { cat, item } while the add/edit form is open
  let busy = '';

  function render(host, ctx) {
    if (!host) return;
    injectCss();
    // lang picks the Korean or English side of built-in data; L holds the interface text in the chosen language.
    const L = strings(ctx.lang || 'ko'), lang = ctx.lang === 'ko' || !ctx.lang ? 'ko' : 'en';
    tr = ctx.tx || ((x) => x);
    const cat = normCatalog(ctx.catalog), P = normPicks(ctx.picks, cat), W = !!ctx.writable;
    const byId = (k, id) => cat[k].find((x) => x.id === id);
    const nm = (x) => (lang === 'en' && x.en ? x.en : x.ko) || x.en || '';
    const setP = (np) => ctx.setPicks(np);
    const setC = (nc) => ctx.setCatalog(nc);
    const priceTxt = (x) => {
      if (!x.lo) return L.ask;
      if (lang === 'ko') { if (x.label) return x.label; return (x.lo === x.hi || !x.hi ? x.lo : x.lo + '~' + x.hi) + '만'; }
      const f = (v) => v >= 100 ? '₩' + (v / 100).toFixed(v % 100 === 0 ? 0 : 2) + 'M' : '₩' + Math.round(v * 10) + 'k';
      return x.lo === x.hi || !x.hi ? f(x.lo) : f(x.lo) + '–' + f(x.hi).slice(1);
    };
    const photoEl = (x, cls, label) => {
      const ph = () => h('div', { class: 'sdm-ph ' + (cls || '') }, label || nm(x));
      if (!x.photo) return ph();
      const im = h('img', { class: cls || '', src: ctx.fileUrl(x.photo), alt: nm(x), loading: 'lazy', draggable: 'false' });
      im.addEventListener('error', () => im.replaceWith(ph()), { once: true });
      return im;
    };
    const drag = (node, k, id) => {
      if (!W) return;
      node.draggable = true;
      node.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', 'sdm:' + k + ':' + id); e.dataTransfer.effectAllowed = 'copyMove'; node.classList.add('sdm-dragging'); });
      node.addEventListener('dragend', () => node.classList.remove('sdm-dragging'));
    };
    const drop = (node, accept, fn) => {
      node.addEventListener('dragover', (e) => { if (!W) return; e.preventDefault(); node.classList.add('sdm-over'); });
      node.addEventListener('dragleave', (e) => { if (!node.contains(e.relatedTarget)) node.classList.remove('sdm-over'); });
      node.addEventListener('drop', (e) => { e.preventDefault(); node.classList.remove('sdm-over'); const d = (e.dataTransfer.getData('text/plain') || '').split(':'); if (d[0] === 'sdm' && accept.includes(d[1])) fn(d[1], d[2]); });
    };
    const useItem = (k, id) => {
      const x = byId(k, id); if (!x || !W) return;
      if (k === 'studios') setP({ ...P, studio: id, price: 0, short: P.short.includes(id) ? P.short : [...P.short, id] });
      else setP({ ...P, [SLOT_OF[k]]: { id, name: x.ko || x.en, price: Math.round(num(x.lo) * 10000) } });
    };
    const toggleShort = (id) => { if (!W) return; setP({ ...P, short: P.short.includes(id) ? P.short.filter((y) => y !== id) : [...P.short, id] }); };

    host.innerHTML = '';
    const root = h('div', { class: 'sdm' });
    host.append(root);

    // ---------- header + budget ----------
    const budgetLine = num(ctx.budgetFallback);
    const B = P.budget || budgetLine || DEFAULT_BUDGET;
    const bIn = h('input', { class: 'sdm-inp sdm-money', id: 'sdm-budget', inputmode: 'numeric', value: P.budget ? P.budget.toLocaleString('en-US') : '', placeholder: (budgetLine || DEFAULT_BUDGET).toLocaleString('en-US'), disabled: !W, 'aria-label': L.budget });
    bIn.addEventListener('change', () => setP({ ...P, budget: Math.round(num(bIn.value)) }));
    root.append(h('div', { class: 'sdm-head' },
      h('div', {}, h('h2', { text: L.title }), h('p', { class: 'sdm-hint', text: L.hint })),
      h('label', { class: 'sdm-field' }, h('span', { text: L.budget }), bIn,
        h('span', { class: 'sdm-hint', text: P.budget ? L.budgetHint : budgetLine ? L.budgetFrom(won(lang, budgetLine)) : L.budgetDefault }))));

    const empty = CATS.every((k) => !cat[k].length);
    if (empty && !editing) {
      root.append(h('div', { class: 'sdm-empty' }, h('h3', { text: L.emptyTitle }), h('p', { text: L.emptyHelp }),
        W ? h('button', { type: 'button', class: 'sdm-btn', text: L.add, onclick: () => { editing = { cat: F.cat, item: null }; ctx.rerender(); } }) : null));
      return;
    }

    // ---------- combo slots ----------
    const studio = byId('studios', P.studio);
    const inclOn = !!(studio && studio.total && P.incl);
    const combo = h('div', { class: 'sdm-combo' });
    const priceField = (id, label, value, onSet, disabled) => {
      const i = h('input', { class: 'sdm-inp sdm-money', id, inputmode: 'numeric', value: value ? Math.round(value).toLocaleString('en-US') : '', disabled: !W || disabled });
      i.addEventListener('change', () => onSet(Math.round(num(i.value))));
      return h('label', { class: 'sdm-lab' }, h('span', { text: label }), i);
    };
    // studio
    const ss = h('div', { class: 'sdm-slot' + (studio ? ' filled' : '') }, h('h3', {}, h('span', { text: L.slot.studio }),
      studio && W ? h('button', { type: 'button', class: 'sdm-del', text: L.remove, onclick: () => setP({ ...P, studio: '', price: 0 }) }) : null));
    if (!studio) ss.append(h('div', { class: 'sdm-empty-note', text: L.slotEmpty.studio }));
    else {
      ss.append(h('div', { class: 'sdm-pick' }, photoEl(studio), h('div', {}, h('div', { class: 'sdm-nm', text: nm(studio) }),
        h('div', { class: 'sdm-mt', text: [pick(MOODS, studio.mood, lang), pick(REGS, studio.reg, lang), priceTxt(studio)].filter(Boolean).join(' · ') }),
        studio.total ? h('span', { class: 'sdm-st plan', text: L.pkgLong }) : null)));
      ss.append(priceField('sdm-sp', L.quote, P.price || num(studio.lo) * 10000, (v) => setP({ ...P, price: v })));
    }
    drop(ss, ['studios'], useItem);
    combo.append(ss);
    // dress, makeup, hair
    [['dresses', 'dress'], ['tux', 'tux'], ['makeup', 'makeup'], ['hair', 'hair']].forEach(([k, s]) => {
      const cur = P[s], x = cur.id ? byId(k, cur.id) : null, inc = !NO_INCL.has(k) && inclOn;
      const box = h('div', { class: 'sdm-slot' + (x || cur.name || inc ? ' filled' : '') }, h('h3', {}, h('span', { text: L.slot[s] }),
        x && !inc && W ? h('button', { type: 'button', class: 'sdm-del', text: L.remove, onclick: () => setP({ ...P, [s]: { id: '', name: '', price: 0 } }) }) : null));
      if (studio && studio.total && !NO_INCL.has(k)) {
        box.append(h('label', { class: 'sdm-incl' }, h('input', { type: 'checkbox', id: 'sdm-incl-' + s, checked: P.incl, disabled: !W, onchange: (e) => setP({ ...P, incl: e.target.checked }) }), h('span', { text: L.incl })));
      }
      if (x && !inc) {
        box.append(h('div', { class: 'sdm-pick' }, photoEl(x, '', GARMENT.has(k) ? null : L.slot[s]), h('div', {}, h('div', { class: 'sdm-nm', text: nm(x) }), h('div', { class: 'sdm-mt', text: priceTxt(x) + (x.artist ? ' · ' + x.artist : '') }))));
        box.append(priceField('sdm-' + s + '-p', L.quote, cur.price, (v) => setP({ ...P, [s]: { ...P[s], price: v } })));
      } else {
        if (!inc) box.append(h('div', { class: 'sdm-hint', text: L.slotEmpty[s] }));
        const ni = h('input', { class: 'sdm-inp', id: 'sdm-' + s + '-n', value: cur.name, maxlength: 60, disabled: !W || inc });
        ni.addEventListener('change', () => setP({ ...P, [s]: { ...P[s], id: '', name: ni.value.trim() } }));
        box.append(h('label', { class: 'sdm-lab' }, h('span', { text: L.name }), ni));
        box.append(priceField('sdm-' + s + '-p', L.price, inc ? 0 : cur.price, (v) => setP({ ...P, [s]: { ...P[s], price: v } }), inc));
      }
      drop(box, [k], useItem);
      combo.append(box);
    });
    root.append(combo);

    // ---------- summary ----------
    const sP = studio ? (P.price || num(studio.lo) * 10000) : 0;
    const tot = sP + (inclOn ? 0 : P.dress.price + P.makeup.price) + P.tux.price + P.hair.price, left = B - tot, pc = B > 0 ? Math.round(tot / B * 100) : 0;
    const acts = h('div', { class: 'sdm-acts' });
    if (W) {
      acts.append(h('button', { type: 'button', class: 'sdm-btn ghost', text: L.toVendor, onclick: () => {
        const rows = [];
        if (studio) rows.push({ name: nm(studio), price: sP, ref: 'studios:' + studio.id });
        if (!inclOn) [['dresses', 'dress'], ['makeup', 'makeup']].forEach(([k, s]) => { if (P[s].name || P[s].id) rows.push({ name: P[s].id ? nm(byId(k, P[s].id)) : P[s].name, price: P[s].price, ref: k + ':' + (P[s].id || P[s].name) }); });
        if (P.tux.name || P.tux.id) rows.push({ name: P.tux.id ? nm(byId('tux', P.tux.id)) : P.tux.name, price: P.tux.price, ref: 'tux:' + (P.tux.id || P.tux.name), cat: 'attire' });
        if (P.hair.name || P.hair.id) rows.push({ name: P.hair.id ? nm(byId('hair', P.hair.id)) : P.hair.name, price: P.hair.price, ref: 'hair:' + (P.hair.id || P.hair.name) });
        const k = ctx.addVendors(rows); ctx.toast(k ? L.vendorDone(k) : L.vendorNone);
      } }));
      acts.append(h('button', { type: 'button', class: 'sdm-btn ghost', text: L.clear, onclick: () => setP({ ...emptyPicks(), short: P.short, budget: P.budget }) }));
    }
    root.append(h('div', { class: 'sdm-sum' },
      h('div', {}, h('div', { class: 'sdm-hint', text: L.total }), h('div', { class: 'sdm-big' + (left < 0 ? ' neg' : ''), text: won(lang, tot) })),
      h('div', { class: 'sdm-summid' }, h('div', { class: 'sdm-bar' + (pc > 100 ? ' over' : pc >= 90 ? ' warn' : '') }, h('i', { style: `width:${Math.min(100, pc)}%` })),
        h('div', { class: 'sdm-hint', text: L.ofBudget(won(lang, B)) + ' · ' + (left >= 0 ? L.left + ' ' + won(lang, left) : L.over + ' ' + won(lang, -left)) })),
      acts));

    // ---------- shortlist ----------
    const lane = h('div', { class: 'sdm-lane' });
    const shorts = P.short.map((id) => byId('studios', id)).filter(Boolean);
    if (!shorts.length) lane.append(h('div', { class: 'sdm-empty-note', text: W ? L.shortHint : L.shortEmpty }));
    shorts.forEach((x) => {
      const m = h('div', { class: 'sdm-mini' + (x.id === P.studio ? ' is-pick' : ''), title: L.use, ondblclick: () => useItem('studios', x.id) },
        photoEl(x), h('span', { class: 'sdm-nm', text: nm(x) }), h('span', { class: 'sdm-pr', text: priceTxt(x) }),
        W ? h('button', { type: 'button', class: 'sdm-x', 'aria-label': L.shortDel + ' ' + nm(x), text: '×', onclick: (e) => { e.stopPropagation(); toggleShort(x.id); } }) : null);
      drag(m, 'studios', x.id); lane.append(m);
    });
    drop(lane, ['studios'], (k, id) => { if (!P.short.includes(id)) toggleShort(id); });
    root.append(h('section', { class: 'sdm-sec' }, h('div', { class: 'sdm-sechead' }, h('h3', { text: L.short })), lane));

    // ---------- browse ----------
    const setF = (o) => { F = { ...F, ...o }; lsSet('nadu-sdm-filters', F); ctx.rerender(); };
    const seg = h('div', { class: 'sdm-seg', role: 'tablist' }, ...CATS.map((k) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(F.cat === k), class: F.cat === k ? 'on' : '', onclick: () => setF({ cat: k }) }, L.cat[k], h('span', { class: 'n', text: String(cat[k].length) }))));
    const chipRow = (label, key, opts) => h('div', { class: 'sdm-filters' }, h('span', { class: 'sdm-lbl', text: label }),
      ...[['', L.all], ...opts].map(([v, t]) => h('button', { type: 'button', class: 'chipbtn', 'aria-pressed': String(F[key] === v), text: t, onclick: () => setF({ [key]: v }) })));
    const toggleChip = (label, key) => h('button', { type: 'button', class: 'chipbtn', 'aria-pressed': String(!!F[key]), text: label, onclick: () => setF({ [key]: !F[key] }) });
    const filters = h('div', { class: 'sdm-sfilters' });
    const k = F.cat;
    let list = cat[k].slice();
    if (k === 'studios') {
      filters.append(chipRow(L.fMood, 'mood', MOODS.map((m) => [m[0], lang === 'ko' ? m[1] : tr(m[2])])), chipRow(L.fTier, 'tier', TIERS.map((m) => [m[0], lang === 'ko' ? m[1] : tr(m[2])])));
      const regsUsed = REGS.filter((r) => cat.studios.some((x) => x.reg === r[0]));
      const r3 = chipRow(L.fReg, 'reg', regsUsed.map((m) => [m[0], lang === 'ko' ? m[1] : tr(m[2])])); r3.append(toggleChip(L.fShort, 'short'));
      const so = h('select', { class: 'sdm-inp sdm-sort', 'aria-label': L.sort, onchange: (e) => setF({ sort: e.target.value }) }, h('option', { value: 'price', text: L.sortPrice }), h('option', { value: 'name', text: L.sortName }));
      so.value = F.sort; r3.append(so); filters.append(r3);
      list = list.filter((x) => (!F.mood || x.mood === F.mood) && (!F.tier || x.tier === F.tier) && (!F.reg || x.reg === F.reg) && (!F.short || P.short.includes(x.id)));
    } else if (k === 'dresses') {
      filters.append(chipRow(L.fTier, 'dt', [['c', lang === 'ko' ? '100만 미만' : 'Under ₩1M'], ['m', lang === 'ko' ? '100~170만' : '₩1M–1.7M'], ['h', lang === 'ko' ? '170만 초과' : 'Over ₩1.7M']]));
      filters.append(chipRow(L.fStyle, 'dg', DTAGS.filter((t) => cat.dresses.some((d) => (d.tags || []).includes(t[0]))).map((t) => [t[0], lang === 'ko' ? t[1] : tr(t[2])])));
      list = list.filter((d) => (!F.dt || bandOf('dresses', d) === F.dt) && (!F.dg || (d.tags || []).includes(F.dg)));
    } else if (k === 'tux') {
      filters.append(chipRow(L.fKind, 'tk', TKINDS.map((t) => [t[0], lang === 'ko' ? t[1] : tr(t[2])])));
      filters.append(chipRow(L.fTier, 'tt', [['c', lang === 'ko' ? '50만 미만' : 'Under ₩500k'], ['m', lang === 'ko' ? '50~100만' : '₩500k–1M'], ['h', lang === 'ko' ? '100만 초과' : 'Over ₩1M']]));
      list = list.filter((x) => (!F.tk || x.kind === F.tk) && (!F.tt || bandOf('tux', x) === F.tt));
    } else if (k === 'makeup') {
      filters.append(chipRow(L.fMood, 'mm', MKMOODS.map((m) => [m[0], lang === 'ko' ? m[1] : tr(m[2])])), chipRow(L.fTier, 'mt', TIERS.filter((x) => x[0] !== 'r').map((m) => [m[0], lang === 'ko' ? m[1] : tr(m[2])])));
      list = list.filter((m) => (!F.mm || m.mood === F.mm) && (!F.mt || m.tier === F.mt));
    } else {
      const r = chipRow(L.fTier, 'ht', TIERS.filter((x) => x[0] !== 'r').map((m) => [m[0], lang === 'ko' ? m[1] : tr(m[2])])); r.append(toggleChip(L.fPop, 'hp')); filters.append(r);
      list = list.filter((x) => (!F.ht || x.tier === F.ht) && (!F.hp || x.pop));
    }
    list.sort(k === 'studios' && F.sort === 'name' ? (a, b) => nm(a).localeCompare(nm(b), lang) : (a, b) => (num(a.lo) || 9999) - (num(b.lo) || 9999) || num(a.hi) - num(b.hi));

    const grid = h('div', { class: 'sdm-grid' + (k === 'makeup' || k === 'hair' ? ' sdm-grid-sm' : '') });
    const slotKey = SLOT_OF[k], curId = k === 'studios' ? P.studio : P[slotKey].id;
    list.forEach((x) => {
      const card = h('article', { class: 'sdm-card' + (x.id === curId ? ' is-pick' : '') });
      if (k === 'studios' || GARMENT.has(k)) {
        const pw = h('div', { class: 'sdm-phwrap' }, photoEl(x));
        if (k === 'studios' && x.mood) pw.append(h('span', { class: 'sdm-mood', text: pick(MOODS, x.mood, lang) }));
        if (k === 'studios' && W) pw.append(h('button', { type: 'button', class: 'sdm-heart', 'aria-pressed': String(P.short.includes(x.id)), 'aria-label': (P.short.includes(x.id) ? L.shortDel : L.shortAdd) + ' ' + nm(x), text: P.short.includes(x.id) ? '♥' : '♡', onclick: () => toggleShort(x.id) }));
        card.append(pw);
      } else {
        const mm = MKMOODS.find((m) => m[0] === x.mood);
        card.append(h('div', { class: 'sdm-band ' + (k === 'hair' ? 'mood-hr' : 'mood-' + (x.mood || 'pu')) },
          h('span', { class: 'ml', text: k === 'hair' ? pick(TIERS, x.tier, lang) : mm ? (lang === 'ko' ? mm[1] : tr(mm[2])) : '' }),
          h('span', { class: 'tone', text: k === 'hair' ? (x.pop ? L.pop : L.slot.hair) : mm ? (lang === 'ko' ? mm[3] : tr(mm[4])) : '' })));
      }
      const bd = h('div', { class: 'sdm-bd' }, h('div', { class: 'sdm-nm', text: nm(x) }));
      if (k === 'studios') bd.append(h('div', { class: 'sdm-mt', text: [pick(REGS, x.reg, lang), pick(FOCUS, x.focus, lang)].filter(Boolean).join(' · ') }));
      if (k === 'makeup' && x.artist) bd.append(h('div', { class: 'sdm-mt', text: L.artist + ' ' + x.artist }));
      const pr = h('div', { class: 'sdm-price' }, h('b', { text: priceTxt(x) }));
      const tierK = GARMENT.has(k) ? bandOf(k, x) : x.tier;
      if (k === 'tux' && x.kind) pr.append(h('span', { class: 'sdm-st plan', text: pick(TKINDS, x.kind, lang) }));
      if (tierK) pr.append(h('span', { class: 'sdm-st t-' + tierK, text: pick(TIERS, tierK, lang) }));
      if (k === 'studios' && x.total) pr.append(h('span', { class: 'sdm-st plan', text: L.pkg }));
      if (k === 'hair' && x.pop) pr.append(h('span', { class: 'sdm-st t-h', text: L.pop }));
      if (x.note) pr.append(h('span', { class: 'sdm-st mute', text: x.note }));
      bd.append(pr);
      if (k === 'dresses' && (x.lo || x.blo)) {
        const bon = x.blo ? ' · ' + L.bon + ' ' + priceTxt({ lo: x.blo, hi: x.bhi }) : '';
        bd.append(h('div', { class: 'sdm-mt', text: (x.lo ? L.both : '') + bon }));
      }
      const line = lang === 'ko' ? x.lineKo : (x.lineEn || x.lineKo);
      if (line) bd.append(h('div', { class: 'sdm-line', text: line }));
      if (k === 'studios' && x.flags) {
        const fl = h('div', { class: 'sdm-flags' });
        [...String(x.flags)].slice(0, 4).forEach((f, i) => { if (f === '-') return; fl.append(h('span', { class: 'sdm-flag ' + (f === 'O' ? 'y' : f === '+' ? 'p' : 'n'), text: (lang === 'ko' ? FLAGN[i][0] : tr(FLAGN[i][1])) + (f === '+' ? ' ' + L.flagP : '') })); });
        bd.append(fl);
      }
      if (k === 'dresses' && (x.tags || []).length) bd.append(h('div', { class: 'sdm-flags' }, ...x.tags.map((t) => h('span', { class: 'sdm-flag y', text: pick(DTAGS, t, lang) || t }))));
      const ft = h('div', { class: 'sdm-foot' });
      const href = /^https?:\/\//i.test(x.link || '') ? x.link : '';
      ft.append(href ? h('a', { href, target: '_blank', rel: 'noopener noreferrer', text: x.linkLabel === 'sinbuya' ? (lang === 'ko' ? '신부야에서 보기' : 'View on Sinbuya') : (x.linkLabel || (lang === 'ko' ? '링크' : 'Link')) }) : h('span'));
      const btns = h('div', { class: 'sdm-cardbtns' });
      if (W) {
        btns.append(h('button', { type: 'button', class: 'sdm-del', text: L.edit, onclick: () => { editing = { cat: k, item: x }; ctx.rerender(); setTimeout(() => document.getElementById('sdm-form')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0); } }));
        btns.append(h('button', { type: 'button', class: 'sdm-btn sm' + (x.id === curId ? '' : ' ghost'), text: x.id === curId ? L.inUse : L.use, onclick: () => useItem(k, x.id) }));
      }
      ft.append(btns); bd.append(ft); card.append(bd);
      drag(card, k, x.id);
      grid.append(card);
    });

    const browse = h('section', { class: 'sdm-sec' },
      h('div', { class: 'sdm-sechead' }, h('h3', { text: L.browse }), h('span', { class: 'sdm-hint', text: L.count(list.length) }),
        W ? h('button', { type: 'button', class: 'sdm-btn sm', style: 'margin-left:auto', text: L.add, onclick: () => { editing = { cat: k, item: null }; ctx.rerender(); } }) : null),
      seg);
    if (editing && W) browse.append(form(editing.cat, editing.item));
    browse.append(filters, grid, h('p', { class: 'sdm-credit', text: L.source }));
    root.append(browse);

    // ---------- add / edit form ----------
    function form(fk, item) {
      // The draft lives in `editing` so a re-render (e.g. the partner's edit arriving) keeps what was typed.
      const x = editing.draft || (editing.draft = item ? { ...item } : { id: PREFIX[fk] + '-' + uid(), ko: '', en: '', lo: 0, hi: 0, tier: GARMENT.has(fk) ? '' : 'm', kind: fk === 'tux' ? 'rent' : undefined, link: '', linkLabel: '', lineKo: '', lineEn: '', photo: '' });
      const f = h('form', { class: 'sdm-form', id: 'sdm-form' });
      const fld = (label, input, wide) => h('label', { class: 'sdm-lab' + (wide ? ' wide' : '') }, h('span', { text: label }), input);
      const inp = (key, attrs = {}) => { const i = h('input', { class: 'sdm-inp', value: x[key] ?? '', ...attrs }); i.addEventListener('input', () => { x[key] = attrs.inputmode ? num(i.value) : i.value; }); return i; };
      const sel = (key, opts) => { const s = h('select', { class: 'sdm-inp' }, ...opts.map(([v, a, b]) => h('option', { value: v, text: lang === 'ko' ? a : tr(b || a) }))); s.value = x[key] ?? ''; s.addEventListener('change', () => { x[key] = s.value; }); return s; };
      const chk = (key, label) => { const c = h('input', { type: 'checkbox', checked: !!x[key] }); c.addEventListener('change', () => { x[key] = c.checked; }); return h('label', { class: 'sdm-incl' }, c, h('span', { text: label })); };
      f.append(h('h3', { class: 'wide', text: (item ? L.edit : L.add) + ' · ' + L.cat[fk] }));
      f.append(fld(L.fKo, inp('ko', { maxlength: 60, required: true })), fld(L.fEn, inp('en', { maxlength: 60 })));
      f.append(fld(L.fLo, inp('lo', { inputmode: 'decimal' })), fld(L.fHi, inp('hi', { inputmode: 'decimal' })));
      if (fk === 'tux') f.append(fld(L.fKind, sel('kind', TKINDS)));
      if (!GARMENT.has(fk)) f.append(fld(L.fTier, sel('tier', fk === 'studios' ? TIERS : TIERS.filter((t) => t[0] !== 'r'))));
      if (fk === 'studios') {
        f.append(fld(L.fMood, sel('mood', [['', '—'], ...MOODS])), fld(L.fReg, sel('reg', [['', '—'], ...REGS])), fld(L.fFocus, sel('focus', [['', '—'], ...FOCUS])), chk('total', L.fTotal));
        const flags = [...String(x.flags || '----').padEnd(4, '-')].slice(0, 4);
        f.append(h('div', { class: 'sdm-lab wide' }, h('span', { text: L.fFlags }), h('div', { class: 'sdm-flagedit' }, ...FLAGN.map((fn, i) => {
          const fl = lang === 'ko' ? fn[0] : tr(fn[1]);
          const s = h('select', { class: 'sdm-inp', 'aria-label': fl }, ...L.flagOpt.map(([v, t]) => h('option', { value: v, text: t }))); s.value = flags[i];
          s.addEventListener('change', () => { flags[i] = s.value; x.flags = flags.join(''); });
          return h('label', {}, h('span', { text: fl }), s);
        }))));
        f.append(fld(L.fNote, inp('note', { maxlength: 20 })));
      }
      if (fk === 'dresses') {
        f.append(fld(L.fBlo, inp('blo', { inputmode: 'decimal' })), fld(L.fBhi, inp('bhi', { inputmode: 'decimal' })));
        const tags = new Set(x.tags || []);
        f.append(h('div', { class: 'sdm-lab wide' }, h('span', { text: L.fStyle }), h('div', { class: 'sdm-filters' }, ...DTAGS.map((t) => {
          const b = h('button', { type: 'button', class: 'chipbtn', 'aria-pressed': String(tags.has(t[0])), text: lang === 'ko' ? t[1] : tr(t[2]) });
          b.addEventListener('click', () => { tags.has(t[0]) ? tags.delete(t[0]) : tags.add(t[0]); b.setAttribute('aria-pressed', String(tags.has(t[0]))); x.tags = [...tags]; });
          return b;
        }))));
      }
      if (fk === 'makeup') f.append(fld(L.fMood, sel('mood', MKMOODS)), fld(L.fArtist, inp('artist', { maxlength: 40 })));
      if (fk === 'makeup' || fk === 'hair') f.append(fld(L.fLabel, inp('label', { maxlength: 40 })));
      if (fk === 'hair') f.append(chk('pop', L.fPopular));
      f.append(fld(L.fLink, inp('link', { type: 'url', maxlength: 300, placeholder: 'https://' }), true), fld(L.fLinkLabel, inp('linkLabel', { maxlength: 60 })));
      f.append(fld(L.fLineKo, inp('lineKo', { maxlength: 140 }), true), fld(L.fLineEn, inp('lineEn', { maxlength: 140 }), true));
      if (fk === 'studios' || GARMENT.has(fk)) {
        const prev = h('div', { class: 'sdm-formphoto' });
        const showPrev = () => { prev.innerHTML = ''; prev.append(x.photo ? photoEl(x) : h('div', { class: 'sdm-ph', text: L.noPhoto })); };
        showPrev();
        const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', class: 'sdm-file' });
        file.addEventListener('change', async () => {
          const fl = file.files[0]; if (!fl) return;
          busy = L.uploading; ctx.toast(L.uploading);
          const name = 'sdm-' + x.id.replace(/[^a-z0-9-]/gi, '').toLowerCase() + '-' + uid() + '.' + (fl.type === 'image/png' ? 'png' : fl.type === 'image/webp' ? 'webp' : 'jpg');
          const blob = await shrink(fl);
          const ok = await ctx.uploadFile(name, blob);
          busy = '';
          if (!ok) { ctx.toast(L.upFail); return; }
          x.photo = name; showPrev(); file.value = '';
        });
        const row = h('div', { class: 'sdm-photorow' }, prev, file,
          h('button', { type: 'button', class: 'sdm-del', text: L.photoDel, onclick: () => { x.photo = ''; showPrev(); } }));
        f.append(h('div', { class: 'sdm-lab wide' }, h('span', { text: L.photo }), row));
        if (window.NaduDrop) window.NaduDrop(file, { text: L.dzPhoto, hint: L.dzPhotoHint, icon: '🖼', onReject: () => ctx.toast(L.dzPhotoBad) });
      }
      const delB = item ? h('button', { type: 'button', class: 'sdm-del', text: L.del }) : null;
      if (delB) delB.addEventListener('click', () => {
        if (!delB.classList.contains('arm')) { delB.classList.add('arm'); delB.textContent = L.delSure; setTimeout(() => { delB.classList.remove('arm'); delB.textContent = L.del; }, 3000); return; }
        const nc = { ...cat, [fk]: cat[fk].filter((y) => y.id !== item.id) };
        editing = null; setC(nc);
        if (fk === 'studios' && (P.studio === item.id || P.short.includes(item.id))) setP({ ...P, studio: P.studio === item.id ? '' : P.studio, short: P.short.filter((y) => y !== item.id) });
        else if (fk !== 'studios' && P[SLOT_OF[fk]].id === item.id) setP({ ...P, [SLOT_OF[fk]]: { ...P[SLOT_OF[fk]], id: '' } });
      });
      f.append(h('div', { class: 'sdm-formacts wide' }, h('button', { type: 'submit', class: 'sdm-btn', text: L.save }),
        h('button', { type: 'button', class: 'sdm-btn ghost', text: L.cancel, onclick: () => { editing = null; ctx.rerender(); } }), delB));
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        if (busy) { ctx.toast(busy); return; }
        x.ko = String(x.ko || '').trim(); x.en = String(x.en || '').trim();
        if (!x.ko && !x.en) { ctx.toast(L.needName); return; }
        x.lo = num(x.lo); x.hi = num(x.hi) || x.lo; if (x.blo != null) { x.blo = num(x.blo); x.bhi = num(x.bhi) || x.blo; }
        const list2 = cat[fk].slice(), i = list2.findIndex((y) => y.id === x.id);
        if (i >= 0) list2[i] = x; else list2.push(x);
        editing = null; setC({ ...cat, [fk]: list2 });
      });
      return f;
    }
  }

  // Resize photos before upload so plan storage stays small (long side 900px, JPEG).
  async function shrink(file) {
    try {
      const bmp = await createImageBitmap(file);
      const sc = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
      if (sc === 1 && file.size < 400000) return file;
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return await new Promise((res) => c.toBlob((b) => res(b || file), 'image/jpeg', 0.82));
    } catch (e) { return file; }
  }

  let cssDone = false;
  function injectCss() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `
.sdm{display:flex;flex-direction:column;gap:22px}
.sdm-head{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-end}
.sdm-head h2{margin:0;font-family:var(--display);font-size:22px}
.sdm-hint{font-size:12.5px;color:var(--muted);margin:2px 0 0}
.sdm-field{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);max-width:260px}
.sdm-inp{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm,8px);padding:7px 10px;font:inherit;font-size:14px;color:var(--ink);min-width:0;width:100%}
.sdm-money{font-family:var(--mono);text-align:right;font-variant-numeric:tabular-nums}
.sdm-btn{border:1px solid var(--ink);background:var(--ink);color:var(--bg);border-radius:8px;padding:7px 16px;font-size:13.5px;cursor:pointer}
.sdm-btn.ghost{background:none;color:var(--ink);border-color:var(--line)}
.sdm-btn.sm{padding:3px 10px;font-size:12.5px}
.sdm-del{border:0;background:none;color:var(--muted);cursor:pointer;font-size:12.5px;padding:3px 6px;border-radius:4px}
.sdm-del:hover,.sdm-del.arm{color:var(--bad)}.sdm-del.arm{background:var(--bad-soft)}
.sdm-combo{display:grid;grid-template-columns:1.2fr repeat(4,minmax(0,1fr));gap:12px}
.sdm-slot{background:var(--surface);border:1.5px dashed var(--line);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:10px;min-width:0;transition:border-color .15s,background .15s}
.sdm-slot.filled{border-style:solid}
.sdm-over{border-color:var(--accent)!important;background:var(--accent-soft)!important}
.sdm-slot h3,.sdm-sec h3{margin:0;font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);display:flex;justify-content:space-between;align-items:center;gap:8px}
.sdm-empty-note{font-size:13px;color:var(--faint);padding:18px 4px;text-align:center;margin:auto}
.sdm-lab{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);min-width:0}
.sdm-incl{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--muted)}
.sdm-incl input{width:auto;flex:none;margin:0}
.sdm-pick{display:grid;grid-template-columns:64px 1fr;gap:10px;align-items:center}
.sdm-pick img,.sdm-pick .sdm-ph{width:64px;height:80px;object-fit:cover;border-radius:8px;display:block}
.sdm-ph{display:grid;place-content:center;text-align:center;color:var(--muted);font-family:var(--display);font-size:13px;padding:6px;background:linear-gradient(160deg,var(--sunk),var(--accent-soft));overflow:hidden}
.sdm-nm{font-family:var(--display);font-weight:700;font-size:16px;line-height:1.25;overflow-wrap:anywhere}
.sdm-mt{font-size:12px;color:var(--muted)}
.sdm-sum{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.sdm-big{font-family:var(--display);font-size:28px;color:var(--accent);font-variant-numeric:tabular-nums;line-height:1.1}
.sdm-big.neg{color:var(--bad)}
.sdm-summid{display:flex;flex-direction:column;gap:6px;min-width:0}
.sdm-bar{height:6px;background:var(--sunk);border-radius:999px;overflow:hidden}
.sdm-bar i{display:block;height:100%;background:var(--accent);border-radius:999px}
.sdm-bar.warn i{background:var(--warn)}.sdm-bar.over i{background:var(--bad)}
.sdm-acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.sdm-sec{display:flex;flex-direction:column;gap:12px}
.sdm-sechead{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.sdm-lane{display:flex;gap:10px;overflow-x:auto;padding:10px;min-height:118px;border:1.5px dashed var(--line);border-radius:14px;background:var(--surface);align-items:stretch}
.sdm-mini{flex:none;width:96px;display:flex;flex-direction:column;gap:4px;position:relative;cursor:grab}
.sdm-mini img,.sdm-mini .sdm-ph{width:96px;height:120px;object-fit:cover;border-radius:8px}
.sdm-mini .sdm-nm{font-family:inherit;font-size:12px;font-weight:600}
.sdm-pr{font-family:var(--mono);font-size:11px;color:var(--muted)}
.sdm-mini.is-pick img,.sdm-mini.is-pick .sdm-ph{outline:2px solid var(--accent);outline-offset:1px}
.sdm-x{position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;border:0;background:var(--surface);color:var(--ink);font-size:13px;line-height:22px;padding:0;cursor:pointer}
.sdm-seg{display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--line)}
.sdm-seg button{border:0;background:none;padding:8px 12px;font:inherit;font-size:14px;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
.sdm-seg button.on{color:var(--ink);font-weight:600;border-bottom-color:var(--accent)}
.sdm-seg .n{margin-left:6px;font-size:11.5px;color:var(--faint)}
.sdm-sfilters{display:flex;flex-direction:column;gap:8px}
.sdm-filters{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.sdm-lbl{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);min-width:44px}
.sdm-sort{width:auto;margin-left:auto;padding:4px 8px;font-size:13px}
.sdm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
.sdm-grid-sm{grid-template-columns:repeat(auto-fill,minmax(190px,1fr))}
.sdm-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;min-width:0}
.sdm-card.is-pick{border-color:var(--accent)}
.sdm-dragging{opacity:.45}
.sdm-phwrap{position:relative;aspect-ratio:4/5;background:var(--sunk)}
.sdm-phwrap img,.sdm-phwrap .sdm-ph{width:100%;height:100%;object-fit:cover;display:block}
.sdm-phwrap .sdm-ph{font-size:15px}
.sdm-mood{position:absolute;left:8px;top:8px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--surface);color:var(--ink)}
.sdm-heart{position:absolute;right:8px;top:8px;width:32px;height:32px;border-radius:50%;border:0;background:var(--surface);color:var(--faint);font-size:16px;cursor:pointer;line-height:32px;padding:0}
.sdm-heart[aria-pressed="true"]{color:var(--accent)}
.sdm-band{padding:12px 14px 10px;display:flex;flex-direction:column;gap:2px;border-bottom:1px solid var(--line)}
.sdm-band.mood-hr{background:var(--good-soft)}.sdm-band.mood-sh{background:var(--gold-soft)}.sdm-band.mood-id{background:var(--accent-soft)}.sdm-band.mood-pu{background:var(--sunk)}
.sdm-band .ml{font-size:11px;font-weight:600;letter-spacing:.06em}.sdm-band .tone{font-size:11px;color:var(--muted)}
.sdm-bd{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px;flex:1}
.sdm-price{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
.sdm-price b{font-family:var(--mono);font-weight:500;font-size:15px;font-variant-numeric:tabular-nums}
.sdm-st{display:inline-block;font-size:11px;font-weight:600;padding:1px 8px;border-radius:999px;white-space:nowrap}
.sdm-st.plan{background:var(--gold-soft);color:var(--gold)}.sdm-st.mute{background:var(--sunk);color:var(--muted)}
.sdm-st.t-c{background:var(--good-soft);color:var(--good)}.sdm-st.t-m{background:var(--gold-soft);color:var(--gold)}.sdm-st.t-h{background:var(--accent-soft);color:var(--accent)}.sdm-st.t-r{background:var(--sunk);color:var(--muted)}
.sdm-line{font-size:13px;line-height:1.5}
.sdm-flags{display:flex;flex-wrap:wrap;gap:4px}
.sdm-flag{font-size:10.5px;padding:1px 7px;border-radius:999px;background:var(--sunk);color:var(--faint)}
.sdm-flag.y{background:var(--good-soft);color:var(--good)}.sdm-flag.p{background:var(--warn-soft);color:var(--warn)}.sdm-flag.n{text-decoration:line-through}
.sdm-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:auto;padding-top:6px}
.sdm-foot a{font-size:12px;color:var(--muted);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sdm-cardbtns{display:flex;gap:4px;align-items:center;flex:none}
.sdm-credit{font-size:12px;color:var(--muted);margin:0}
.sdm-empty{background:var(--surface);border:1px dashed var(--line);border-radius:14px;padding:28px;text-align:center;display:flex;flex-direction:column;gap:8px;align-items:center}
.sdm-empty h3{margin:0;font-family:var(--display)}.sdm-empty p{margin:0;color:var(--muted);font-size:14px;max-width:520px}
.sdm-form{background:var(--surface);border:1px solid var(--accent);border-radius:12px;padding:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px 12px;align-items:end}
.sdm-form .wide{grid-column:1/-1}
.sdm-form h3{margin:0}
.sdm-flagedit{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.sdm-flagedit label{display:flex;flex-direction:column;gap:2px}
.sdm-photorow{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.sdm-photorow .dz{flex:1 1 240px}
.sdm-formphoto img,.sdm-formphoto .sdm-ph{width:64px;height:80px;object-fit:cover;border-radius:8px}
.sdm-file{font-size:12.5px;max-width:100%}
.sdm-formacts{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
body.readonly .sdm .sdm-btn,body.readonly .sdm .sdm-del{display:none}
@media (max-width:1100px){.sdm-combo{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:900px){.sdm-combo{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:760px){.sdm-combo{grid-template-columns:1fr}.sdm-sum{grid-template-columns:1fr}.sdm-acts{justify-content:flex-start}.sdm-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.sdm-bd{padding:10px}.sdm-flagedit{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
    document.head.append(s);
  }

  window.NaduSdm = { render, normCatalog, normPicks, emptyPicks };
})();
