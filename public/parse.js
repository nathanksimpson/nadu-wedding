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
  function applyItems(state, items, lang) {
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
        const lo = man(it.priceLow), hi = Math.max(lo, man(it.priceHigh));
        const card = { id: SDM_PREFIX[cat] + '-' + uid(), ko: ko(it), en: en(it), lo, hi, tier: GARMENT.has(cat) ? '' : 'm',
          link: it.link || '', linkLabel: '', lineKo: (it.summaryKo || '').slice(0, 140), lineEn: (it.summaryEn || '').slice(0, 140), photo: '' };
        if (cat === 'tux') card.kind = ['rtw', 'rent', 'custom'].includes(it.tuxKind) ? it.tuxKind : 'custom';
        add[cat].push(card);
      } else if (it.dest === 'venue') {
        const lines = (it.lines || []).map((l) => ({ id: uid(), ko: l.nameKo || l.nameEn, en: l.nameEn || l.nameKo, amount: num(l.amount) }));
        if (!lines.length && it.priceLow) lines.push({ id: uid(), ko: '대관', en: 'Hall', amount: num(it.priceLow) });
        out.venues.push({ id: 'v' + uid(), ko: ko(it), en: en(it), food: num(it.foodPerPerson), minGuests: num(it.minGuests),
          capMin: num(it.capMin), capMax: num(it.capMax), include: true, notes: note(it), lines });
      } else if (it.dest === 'loan') {
        out.loans.push({ id: 'l' + uid(), ko: ko(it), en: en(it), rate: num(it.ratePct), limit: num(it.limit), eligible: true, note: note(it) });
      } else if (it.dest === 'honsu') {
        out.honsu.push({ id: uid(), ko: ko(it), en: en(it), amount: num(it.priceLow), provided: false });
      } else {
        out.vendors.push({ id: uid(), cat: it.vendorCat || 'etc', name: lang === 'ko' ? ko(it) : en(it), quote: num(it.priceLow), final: 0, memo: note(it) });
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

  function results(host, ctx) {
    const T = ctx.T, ko = ctx.lang === 'ko';
    const wrap = h('div', { class: 'ps-results' }, h('h4', { text: T('psFound')(view.items.length) }), h('p', { class: 'small', text: T('psCheck') }));
    const sel = (opts, val, on, label) => { const s = h('select', { 'aria-label': label }, ...opts.map(([v, t]) => h('option', { value: v, text: t }))); s.value = val; s.addEventListener('change', () => on(s.value)); return s; };
    view.items.forEach((it) => {
      const nameKey = ko ? 'nameKo' : 'nameEn';
      const name = h('input', { type: 'text', value: it[nameKey] || it.nameKo || it.nameEn, maxlength: 60, 'aria-label': T('psName') });
      name.addEventListener('input', () => { it[nameKey] = name.value; });
      const price = h('input', { type: 'text', inputmode: 'numeric', value: it.priceLow ? Number(it.priceLow).toLocaleString('en-US') : '', 'aria-label': T('psPrice') });
      price.addEventListener('input', () => { it.priceLow = num(price.value); if (it.priceHigh < it.priceLow) it.priceHigh = it.priceLow; });
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
      if (it.dest === 'venue' && it.foodPerPerson) extra.push(T('psMeal')(Number(it.foodPerPerson).toLocaleString('en-US')));
      if (it.dest === 'loan' && it.ratePct) extra.push(it.ratePct + '%');
      const card = h('div', { class: 'ps-item' + (it.keep ? '' : ' off') },
        h('label', { class: 'ps-keep' }, keep),
        h('div', { class: 'ps-fields' },
          h('div', { class: 'ps-line' }, name, h('span', { class: 'ps-won' }, '₩', price)),
          h('div', { class: 'ps-line' }, h('span', { class: 'small', text: T('psWhere') }), dest, sub),
          summary ? h('p', { class: 'small', text: summary }) : null,
          extra.length ? h('p', { class: 'small ps-extra', text: extra.join(' · ') }) : null,
          it.conditions ? h('p', { class: 'small ps-extra', text: T('psCond') + ': ' + it.conditions }) : null));
      wrap.append(card);
    });
    const addBtn = h('button', { type: 'button', class: 'primary', text: T('psAdd') });
    addBtn.addEventListener('click', () => {
      const chosen = view.items.filter((x) => x.keep);
      if (!chosen.length) { ctx.toast(T('psNoneChosen')); return; }
      const counts = ctx.apply(chosen);
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
.ps-extra{color:var(--muted)}`;
    document.head.append(s);
  }
  const renderPanel = (host, ctx) => { css(); render(host, ctx); };
  window.NaduParse = { render: renderPanel, applyItems };
})();
