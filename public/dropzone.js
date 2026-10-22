// Turns an <input type="file"> into a drop area: click (or Enter/Space) opens the file browser,
// dropping a file fills the input and fires its normal "change" event, so existing handlers work as-is.
//   NaduDrop(input, { text, hint })   → returns the drop area element
(function () {
  'use strict';
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `
.dz{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;
  min-height:84px;padding:14px 16px;border:1.5px dashed var(--line);border-radius:12px;background:var(--surface);color:var(--muted);
  cursor:pointer;transition:border-color .15s,background .15s;font-size:13.5px;line-height:1.4;min-width:0}
.dz:hover,.dz:focus-visible{border-color:var(--accent);color:var(--ink)}
.dz:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.dz.over{border-color:var(--accent);background:var(--accent-soft);color:var(--ink)}
.dz.bad{border-color:var(--bad);background:var(--bad-soft)}
.dz.off{cursor:not-allowed;opacity:.55}
.dz .dz-icon{font-size:20px;line-height:1}
.dz .dz-text{font-weight:600}
.dz .dz-hint{font-size:12px;color:var(--muted)}
.dz .dz-file{font-family:var(--mono);font-size:12px;color:var(--ink);overflow-wrap:anywhere}
.dz input[type=file]{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}`;
    document.head.append(s);
  }
  // Does a dropped file match the input's accept list (".json", "image/*", "image/png")?
  function accepts(input, file) {
    const list = (input.accept || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (!list.length) return true;
    const name = file.name.toLowerCase(), type = (file.type || '').toLowerCase();
    return list.some((a) => a.startsWith('.') ? name.endsWith(a) : a.endsWith('/*') ? type.startsWith(a.slice(0, -1)) : type === a);
  }
  function NaduDrop(input, opts) {
    css();
    opts = opts || {};
    const zone = document.createElement('div');
    zone.className = 'dz' + (opts.className ? ' ' + opts.className : '');
    zone.tabIndex = 0;
    zone.setAttribute('role', 'button');
    const icon = document.createElement('span'); icon.className = 'dz-icon'; icon.textContent = opts.icon || '⇪'; icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span'); text.className = 'dz-text'; text.textContent = opts.text || '';
    const hint = document.createElement('span'); hint.className = 'dz-hint'; hint.textContent = opts.hint || '';
    // Pages with their own translation pass i18n keys instead of fixed text.
    if (opts.textKey) text.dataset.t = opts.textKey;
    if (opts.hintKey) hint.dataset.t = opts.hintKey;
    const fileName = document.createElement('span'); fileName.className = 'dz-file';
    zone.setAttribute('aria-label', [opts.text, opts.hint].filter(Boolean).join('. '));
    input.replaceWith(zone);
    zone.append(icon, text, hint, fileName, input);
    input.tabIndex = -1;
    const disabled = () => input.disabled;
    const sync = () => { zone.classList.toggle('off', disabled()); zone.setAttribute('aria-disabled', String(disabled())); };
    new MutationObserver(sync).observe(input, { attributes: true, attributeFilter: ['disabled'] }); sync();
    const open = () => { if (!disabled()) input.click(); };
    zone.addEventListener('click', (e) => { if (e.target !== input) open(); });
    zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    input.addEventListener('change', () => { const f = input.files && input.files[0]; fileName.textContent = f ? f.name : ''; });
    let depth = 0;
    zone.addEventListener('dragenter', (e) => { if (disabled()) return; e.preventDefault(); depth++; zone.classList.add('over'); });
    zone.addEventListener('dragover', (e) => { if (disabled()) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    zone.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) zone.classList.remove('over'); });
    zone.addEventListener('drop', (e) => {
      e.preventDefault(); depth = 0; zone.classList.remove('over');
      if (disabled()) return;
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      if (!accepts(input, f)) { zone.classList.add('bad'); setTimeout(() => zone.classList.remove('bad'), 1200); if (opts.onReject) opts.onReject(f); return; }
      const dt = new DataTransfer(); dt.items.add(f);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    return zone;
  }
  // A file dropped next to a drop area should do nothing, not navigate away and lose unsaved typing.
  ['dragover', 'drop'].forEach((ev) => window.addEventListener(ev, (e) => {
    if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files') && !e.target.closest?.('.dz')) e.preventDefault();
  }));
  window.NaduDrop = NaduDrop;
})();
