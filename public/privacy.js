// Privacy policy page: language switch, and the privacy officer's contact from the site settings
// (PRIVACY_OFFICER / PRIVACY_EMAIL), so personal contact details are not written into the public code.
(function () {
  'use strict';
  // Flip DRAFT to false and set EFFECTIVE once a Korean lawyer has reviewed this policy (docs/privacy-security-plan.md).
  const DRAFT = true, VERSION = '1.0', EFFECTIVE = '검토 후 지정 · set after review';
  const $$ = (s) => [...document.querySelectorAll(s)];
  let lang = 'ko';
  try { const p = JSON.parse(localStorage.getItem('nadu-wedding-prefs-v1') || '{}'); if (p.lang === 'en') lang = 'en'; } catch (e) {}
  function setLang(l) {
    lang = l; document.documentElement.lang = l;
    $$('article[data-lang]').forEach((a) => { a.hidden = a.dataset.lang !== l; });
    $$('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.l === l)));
  }
  $$('.lang button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.l)));
  $$('.draft-note').forEach((n) => { n.hidden = !DRAFT; });
  $$('.ver').forEach((n) => { n.textContent = VERSION; });
  $$('.eff').forEach((n) => { n.textContent = EFFECTIVE; });
  setLang(lang);
  fetch('/api/env', { credentials: 'same-origin' }).then((r) => r.json()).then((env) => {
    const p = env.privacy || {};
    $$('.officer').forEach((n) => { n.textContent = p.officer || '(설정 필요 · not set yet)'; });
    $$('.officer-email').forEach((n) => {
      if (!p.email) { n.textContent = '(설정 필요 · not set yet)'; return; }
      const a = document.createElement('a'); a.href = 'mailto:' + p.email; a.textContent = p.email; n.replaceChildren(a);
    });
  }).catch(() => {});
})();
