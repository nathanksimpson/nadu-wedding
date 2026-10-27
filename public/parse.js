// 견적·혜택 붙여넣기 — paste a vendor's quote or offer (text, a screenshot from the clipboard, or an image file),
// let the AI add-on read it, check the items, and add them to the right part of the plan.
// app.js calls NaduParse.render(host, ctx). Every string comes from ctx.T (L.ko / L.en / public/i18n).
// Applying items is pure (applyItems) so it can be tested without a browser.
(function () {
  'use strict';
  const DESTS = ['sdm', 'venue', 'vendor', 'loan', 'honsu'];
  const SDM_CATS = ['studios', 'dresses', 'tux', 'makeup', 'hair'];
  const SDM_PREFIX = { studios: 's', dresses: 'd', tux: 't', makeup: 'm', hair: 'h' };
  const GARMENT = new Set(['dresses', 'tux']);
  const MAX_SIDE = 1800; // screenshots are scaled down to this before upload; text stays readable
  const uid = () => Math.random().toString(36).slice(2, 8);
  const num = (v) => { const x = Number(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(x) ? x : 0; };
  const man = (won) => Math.round(num(won) / 1e4); // 스드메 cards are priced in 만원

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

  // ---------- applying items to a plan (pure) ----------
  // state: { sdmCatalog, venues, vendors, loans, honsu }. Returns { state, counts }. Nothing already in the plan
  // is removed or changed; 스드메 cards go through NaduSdm.mergeCatalog like a listings file.
  const fmt = (n) => '₩' + Math.round(num(n)).toLocaleString('en-US');
  const DEFAULT_LABELS = { extras: '추가금', incl: '포함', perks: '특전', opts: '선택 옵션', perUse: '사용량 결제', deposit: '예약금', date: '예식 시기', cond: '조건' };
  // Venue notes keep everything the quote said that isn't a number in the planner: what's free, perks, extras
  // not in the deal, pay-per-use prices, deposit, date and conditions. One fact group per line.
  function venueNotes(it, lang, L) {
    const nm = (x) => (lang === 'ko' ? (x.nameKo || x.nameEn) : (x.nameEn || x.nameKo));
    const priced = (list) => (list || []).map((x) => `${nm(x)} ${fmt(x.amount)}`).join(', ');
    return [
      lang === 'ko' ? (it.summaryKo || it.summaryEn) : (it.summaryEn || it.summaryKo),
      it.included && it.included.length ? `${L.incl}: ${it.included.join(', ')}` : '',
      it.perks && it.perks.length ? `${L.perks}: ${it.perks.join(', ')}` : '',
      it.options && it.options.length ? `${L.opts}: ${priced(it.options)}` : '',
      it.perUse && it.perUse.length ? `${L.perUse}: ${priced(it.perUse)}` : '',
      it.deposit ? `${L.deposit}: ${it.deposit}` : '', it.eventDate ? `${L.date}: ${it.eventDate}` : '',
      it.conditions ? `${L.cond}: ${it.conditions}` : ''
    ].filter(Boolean).join('\n');
  }
  function applyItems(state, items, lang, labels) {
    const L = { ...DEFAULT_LABELS, ...(labels || {}) };
    const out = {
      sdmCatalog: state.sdmCatalog, venues: (state.venues || []).slice(), vendors: (state.vendors || []).slice(),
      loans: (state.loans || []).slice(), honsu: (state.honsu || []).slice()
    };
    const counts = { sdm: 0, venue: 0, vendor: 0, loan: 0, honsu: 0 };
    const add = { studios: [], dresses: [], tux: [], makeup: [], hair: [] };
    const ko = (it) => it.nameKo || it.nameEn, en = (it) => it.nameEn || it.nameKo;
    const note = (it) => [lang === 'ko' ? (it.summaryKo || it.summaryEn) : (it.summaryEn || it.summaryKo), it.conditions].filter(Boolean).join(' · ');
    for (const it of items) {
      if (!it || !DESTS.includes(it.dest)) continue;
      if (it.dest === 'sdm') {
        const cat = SDM_CATS.includes(it.sdmCat) ? it.sdmCat : 'studios';
        // The upper price includes the likely 추가금, so the combo total shows what couples actually end up paying.
        const lo = man(it.priceLow), hi = Math.max(lo, man(it.priceHigh), man(it.withExtras));
        const ex = (it.extras || []), exKo = ex.map((x) => `${x.nameKo || x.nameEn} ${man(x.amount)}만`).join('·'), exEn = ex.map((x) => `${x.nameEn || x.nameKo} ₩${man(x.amount)}0k`).join(', ');
        const line = (sum, label, list) => [sum, list ? `${label} ${list}` : ''].filter(Boolean).join(' · ').slice(0, 140);
        const card = { id: SDM_PREFIX[cat] + '-' + uid(), ko: ko(it), en: en(it), lo, hi, tier: GARMENT.has(cat) ? '' : 'm',
          link: it.link || '', linkLabel: '', lineKo: line(it.summaryKo, '추가금', exKo), lineEn: line(it.summaryEn, 'Extras', exEn), photo: '' };
        if (cat === 'tux') card.kind = ['rtw', 'rent', 'custom'].includes(it.tuxKind) ? it.tuxKind : 'custom';
        if (cat === 'studios' && it.pkg) card.total = true;
        if (cat === 'dresses') { if (it.bonLow) { card.blo = man(it.bonLow); card.bhi = Math.max(card.blo, man(it.bonHigh)); } if (it.dressTags && it.dressTags.length) card.tags = it.dressTags.slice(); }
        if ((cat === 'makeup' || cat === 'hair') && it.priceLabel) card.label = it.priceLabel;
        add[cat].push(card);
      } else if (it.dest === 'venue') {
        const lines = (it.lines || []).map((l) => ({ id: uid(), ko: l.nameKo || l.nameEn, en: l.nameEn || l.nameKo, amount: num(l.amount) }));
        if (!lines.length && it.priceLow) lines.push({ id: uid(), ko: '대관', en: 'Hall', amount: num(it.priceLow) });
        out.venues.push({ id: 'v' + uid(), ko: ko(it), en: en(it), food: num(it.foodPerPerson), minGuests: num(it.minGuests),
          capMin: num(it.capMin), capMax: num(it.capMax), include: true, notes: venueNotes(it, lang, L), lines });
      } else if (it.dest === 'loan') {
        out.loans.push({ id: 'l' + uid(), ko: ko(it), en: en(it), rate: num(it.ratePct), limit: num(it.limit), eligible: true, note: note(it) });
      } else if (it.dest === 'honsu') {
        out.honsu.push({ id: uid(), ko: ko(it), en: en(it), amount: num(it.priceLow), provided: false });
      } else {
        const exList = (it.extras || []).map((x) => `${lang === 'ko' ? (x.nameKo || x.nameEn) : (x.nameEn || x.nameKo)} ${fmt(x.amount)}`).join(', ');
        out.vendors.push({ id: uid(), cat: it.vendorCat || 'etc', name: lang === 'ko' ? ko(it) : en(it), quote: num(it.priceLow), final: 0,
          memo: [note(it), exList ? `${L.extras}: ${exList}` : ''].filter(Boolean).join('\n') });
      }
      counts[it.dest]++;
    }
    if (counts.sdm) out.sdmCatalog = window.NaduSdm.mergeCatalog(state.sdmCatalog, add).catalog;
    return { state: out, counts };
  }

  // ---------- image: clipboard / file → scaled JPEG base64 ----------
  function shrink(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const dataUrl = c.toDataURL('image/jpeg', 0.88);
        resolve({ mime: 'image/jpeg', data: dataUrl.split(',')[1], preview: dataUrl });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  // ---------- panel ----------
  // ctx: { T, lang, allowed, writable, api, apply(items) → counts, toast, catOpts: [[key,label]], sdmCatLabel(k), destLabel(k) }
  const view = { text: '', image: null, items: null, busy: false, error: '' };
  function render(host, ctx) {
    const T = ctx.T;
    host.innerHTML = '';
    host.append(h('h3', { text: T('psTitle') }), h('p', { class: 'small', text: T('psHelp') }));
    if (!ctx.allowed) { host.append(h('p', { class: 'small addon-note', text: T('psLocked') })); return; }
    if (!ctx.writable) { host.append(h('p', { class: 'small addon-note', text: T('psReadOnly') })); return; }

    const ta = h('textarea', { class: 'ps-text', rows: 5, placeholder: T('psPh'), 'aria-label': T('psTitle'), value: view.text, maxlength: 12000 });
    ta.value = view.text;
    ta.addEventListener('input', () => { view.text = ta.value; });
    const takeImage = async (file) => {
      if (!file || !/^image\//.test(file.type)) return;
      try { view.image = await shrink(file); view.error = ''; } catch (e) { view.error = T('psBadImage'); }
      render(host, ctx);
    };
    // Ctrl/⌘+V with a screenshot on the clipboard: take the image instead of pasting nothing.
    ta.addEventListener('paste', (e) => {
      const f = [...((e.clipboardData && e.clipboardData.files) || [])].find((x) => /^image\//.test(x.type));
      if (f) { e.preventDefault(); takeImage(f); }
    });
    host.append(ta);

    const imgRow = h('div', { class: 'ps-imgrow' });
    if (view.image) {
      imgRow.append(h('img', { class: 'ps-thumb', src: view.image.preview, alt: T('psImage') }),
        h('button', { type: 'button', class: 'danger', text: T('psRemoveImage'), onclick: () => { view.image = null; render(host, ctx); } }));
    } else {
      const fi = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif' });
      fi.addEventListener('change', () => { const f = fi.files[0]; fi.value = ''; takeImage(f); });
      const holder = h('div', { class: 'ps-drop' }, fi);
      imgRow.append(holder);
      window.NaduDrop(fi, { text: T('psDrop'), hint: T('psDropHint'), icon: '🖼' });
    }
    host.append(imgRow, h('p', { class: 'small', text: T('psPrivacy') }));

    const go = h('button', { type: 'button', class: 'primary', disabled: view.busy, text: view.busy ? T('psReading') : T('psRead') });
    go.addEventListener('click', async () => {
      if (!view.text.trim() && !view.image) { view.error = T('psEmpty'); render(host, ctx); return; }
      view.busy = true; view.error = ''; view.items = null; render(host, ctx);
      const r = await ctx.api('/ai/parse', { method: 'POST', body: { text: view.text, image: view.image ? { mime: view.image.mime, data: view.image.data } : undefined } });
      view.busy = false;
      if (!r.ok) {
        const e = r.data && r.data.error;
        view.error = (T('psErr') || {})[e] || T('psErrGeneric');
      } else if (!r.data.items.length) view.error = T('psNothing');
      else view.items = r.data.items.map((it) => ({ ...it, keep: true }));
      render(host, ctx);
    });
    const clear = h('button', { type: 'button', text: T('psClear'), onclick: () => { Object.assign(view, { text: '', image: null, items: null, error: '' }); render(host, ctx); } });
    host.append(h('div', { class: 'row-btns' }, go, clear));
    if (view.error) host.append(h('p', { class: 'small ps-err', role: 'alert', text: view.error }));
    if (view.items) host.append(results(host, ctx));
  }

  function detailLines(it, T, ko) {
    const nm = (x) => (ko ? (x.nameKo || x.nameEn) : (x.nameEn || x.nameKo));
    const priced = (list) => list.map((x) => `${nm(x)} ${fmt(x.amount)}`).join(', ');
    const rows = [[T('psIncl'), (it.included || []).join(', ')], [T('psPerks'), (it.perks || []).join(', ')],
      [T('psOpts'), priced(it.options || [])], [T('psPerUse'), priced(it.perUse || [])], [T('psDeposit'), it.deposit], [T('psDate'), it.eventDate]];
    return rows.filter((r) => r[1]).map(([k, v]) => h('p', { class: 'small ps-extra', text: `${k}: ${v}` }));
  }
  function results(host, ctx) {
    const T = ctx.T, ko = ctx.lang === 'ko';
    const wrap = h('div', { class: 'ps-results' }, h('h4', { text: T('psFound')(view.items.length) }), h('p', { class: 'small', text: T('psCheck') }));
    const sel = (opts, val, on, label) => { const s = h('select', { 'aria-label': label }, ...opts.map(([v, t]) => h('option', { value: v, text: t }))); s.value = val; s.addEventListener('change', () => on(s.value)); return s; };
    view.items.forEach((it) => {
      const nameKey = ko ? 'nameKo' : 'nameEn';
      const name = h('input', { type: 'text', value: it[nameKey] || it.nameKo || it.nameEn, maxlength: 60, 'aria-label': T('psName') });
      name.addEventListener('input', () => { it[nameKey] = name.value; });
      const money = (val, label, on) => { const i = h('input', { type: 'text', inputmode: 'numeric', value: val ? Number(val).toLocaleString('en-US') : '', 'aria-label': label }); i.addEventListener('input', () => on(num(i.value))); return i; };
      const price = money(it.priceLow, T('psPrice'), (v) => { it.priceLow = v; if (it.priceHigh < it.priceLow) it.priceHigh = it.priceLow; });
      // Venues: the planner works from meal price × guaranteed guests + fixed costs, so those are what gets edited,
      // with a live check against the quote's own total.
      const check = h('p', { class: 'small ps-check' });
      const drawCheck = () => {
        const fixed = (it.lines || []).reduce((a, l) => a + num(l.amount), 0), computed = num(it.foodPerPerson) * num(it.minGuests) + fixed;
        const total = num(it.quoteTotal), good = total && Math.abs(computed - total) <= total * 0.01;
        check.textContent = total ? (good ? T('psTotalOk') : T('psTotalOff'))(fmt(it.foodPerPerson), num(it.minGuests), fmt(fixed), fmt(computed), fmt(total))
          : T('psTotalOk')(fmt(it.foodPerPerson), num(it.minGuests), fmt(fixed), fmt(computed), '');
        check.classList.toggle('bad', !!total && !good);
      };
      const venueRow = it.dest === 'venue' ? h('div', { class: 'ps-line' },
        h('label', { class: 'ps-won' }, h('span', { class: 'small', text: T('psFood') }), money(it.foodPerPerson, T('psFood'), (v) => { it.foodPerPerson = v; drawCheck(); })),
        h('label', { class: 'ps-won' }, h('span', { class: 'small', text: T('psGuests') }), money(it.minGuests, T('psGuests'), (v) => { it.minGuests = v; drawCheck(); }))) : null;
      if (it.dest === 'venue') drawCheck();
      const sub = h('span', { class: 'ps-sub' });
      const drawSub = () => {
        sub.innerHTML = '';
        if (it.dest === 'sdm') sub.append(sel(SDM_CATS.map((k) => [k, ctx.sdmCatLabel(k)]), it.sdmCat || 'studios', (v) => { it.sdmCat = v; }, T('psKind')));
        if (it.dest === 'vendor') sub.append(sel(ctx.catOpts, it.vendorCat || 'etc', (v) => { it.vendorCat = v; }, T('psKind')));
      };
      const dest = sel(DESTS.map((k) => [k, ctx.destLabel(k)]), it.dest, (v) => { it.dest = v; drawSub(); }, T('psWhere'));
      drawSub();
      const keep = h('input', { type: 'checkbox', checked: it.keep, 'aria-label': T('psKeep') });
      keep.addEventListener('change', () => { it.keep = keep.checked; card.classList.toggle('off', !it.keep); });
      const summary = ko ? (it.summaryKo || it.summaryEn) : (it.summaryEn || it.summaryKo);
      const extra = [];
      if (it.dest === 'sdm' && it.priceHigh > it.priceLow) extra.push(T('psUpTo')(Number(it.priceHigh).toLocaleString('en-US')));
      if (it.listPrice) extra.push(T('psList')(Number(it.listPrice).toLocaleString('en-US')));
      if (it.bonLow) extra.push(T('psBon')(Number(it.bonLow).toLocaleString('en-US')));
      if (it.pkg) extra.push(T('psPkg'));

      if (it.dest === 'loan' && it.ratePct) extra.push(it.ratePct + '%');
      const card = h('div', { class: 'ps-item' + (it.keep ? '' : ' off') },
        h('label', { class: 'ps-keep' }, keep),
        h('div', { class: 'ps-fields' },
          it.dest === 'venue' ? h('div', { class: 'ps-line' }, name) : h('div', { class: 'ps-line' }, name, h('span', { class: 'ps-won' }, '₩', price)),
          venueRow, it.dest === 'venue' && it.lines && it.lines.length ? h('p', { class: 'small', text: T('psFixed') + ': ' + it.lines.map((l) => `${ko ? (l.nameKo || l.nameEn) : (l.nameEn || l.nameKo)} ${fmt(l.amount)}`).join(', ') }) : null,
          it.dest === 'venue' ? check : null,
          h('div', { class: 'ps-line' }, h('span', { class: 'small', text: T('psWhere') }), dest, sub),
          summary ? h('p', { class: 'small', text: summary }) : null,
          extra.length ? h('p', { class: 'small ps-extra', text: extra.join(' · ') }) : null,
          it.conditions ? h('p', { class: 'small ps-extra', text: T('psCond') + ': ' + it.conditions }) : null,
          it.dest === 'venue' ? detailLines(it, T, ko) : null,
          it.extras && it.extras.length ? h('p', { class: 'small ps-extra', text: T('psExtras') + ': ' + it.extras.map((x) => `${ko ? (x.nameKo || x.nameEn) : (x.nameEn || x.nameKo)} ${fmt(x.amount)}${x.likely ? ' (' + T('psLikely') + ')' : ''}`).join(', ') }) : null,
          it.withExtras ? h('p', { class: 'small ps-check', text: T('psReal')(fmt(it.withExtras)) }) : null,
          it.howRead ? h('p', { class: 'small ps-how', text: T('psHow') + ': ' + it.howRead }) : null));
      wrap.append(card);
    });
    const addBtn = h('button', { type: 'button', class: 'primary', text: T('psAdd') });
    addBtn.addEventListener('click', () => {
      const chosen = view.items.filter((x) => x.keep);
      if (!chosen.length) { ctx.toast(T('psNoneChosen')); return; }
      const counts = ctx.apply(chosen, { extras: T('psExtras'), incl: T('psIncl'), perks: T('psPerks'), opts: T('psOpts'), perUse: T('psPerUse'), deposit: T('psDeposit'), date: T('psDate'), cond: T('psCond') });
      ctx.toast(T('psAdded')(DESTS.filter((k) => counts[k]).map((k) => `${ctx.destLabel(k)} ${counts[k]}`).join(', ')));
      Object.assign(view, { text: '', image: null, items: null, error: '' });
      render(host, ctx);
    });
    wrap.append(h('div', { class: 'row-btns' }, addBtn));
    return wrap;
  }

  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `
.ps-text{width:100%;min-height:110px;resize:vertical;font:inherit;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);box-sizing:border-box}
.ps-imgrow{display:flex;gap:12px;align-items:center;flex-wrap:wrap;min-width:0}
.ps-drop{flex:1 1 240px;min-width:0}
.ps-thumb{max-width:min(220px,100%);max-height:180px;border-radius:8px;border:1px solid var(--line);object-fit:contain;background:#fff}
.ps-err{color:var(--bad)}
.ps-results{display:flex;flex-direction:column;gap:10px;min-width:0}
.ps-results h4{margin:4px 0 0}
.ps-item{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface);min-width:0}
.ps-item.off{opacity:.5}
.ps-keep input{width:20px;height:20px;margin-top:6px}
.ps-fields{display:flex;flex-direction:column;gap:6px;flex:1;min-width:0}
.ps-fields p{margin:0}
.ps-line{display:flex;gap:8px;flex-wrap:wrap;align-items:center;min-width:0}
.ps-line input[type=text]{flex:1 1 180px;min-width:0}
.ps-won{display:inline-flex;align-items:center;gap:4px;flex:0 1 150px;min-width:0}
.ps-won input{width:100%;min-width:0;text-align:right}
.ps-line select{max-width:100%}
.ps-sub{display:contents}
.ps-extra{color:var(--muted)}
.ps-won>.small{white-space:nowrap}
.ps-check{font-variant-numeric:tabular-nums;color:var(--ok,var(--ink))}
.ps-check.bad{color:var(--bad);font-weight:600}
.ps-how{font-style:italic;color:var(--muted);border-left:3px solid var(--line);padding-left:8px}`;
    document.head.append(s);
  }
  const renderPanel = (host, ctx) => { css(); render(host, ctx); };
  window.NaduParse = { render: renderPanel, applyItems };
})();
