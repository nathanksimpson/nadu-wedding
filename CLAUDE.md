# Working on Nadu Wedding Planner

See README.md for architecture, environments, release and backup steps.

## Design standards

- **File uploads are always drop areas.** Every file picker is wrapped with `NaduDrop(input, { textKey | text, hintKey | hint, icon, onReject })`
  from `public/dropzone.js`: a dashed area you can click (or press Enter/Space) to browse, or drop a file onto.
  Never show a bare `<input type="file">`. Set `accept` on the input; the drop area refuses other types.
  Keep the input's normal `change` handler — a drop fills the input and fires `change`, so no separate drop code is needed.
  Clear `input.value` after handling so the same file can be picked again.
- Every user-facing string exists in Korean and English (`L.ko` / `L.en` in public/app.js, `STR` in sdm.js) **and** in each
  file in `public/i18n/` (vi, zh, th, ja: the most common partner nationalities in Korean international marriages).
  `npm test` runs `scripts/i18n-check.mjs`, which fails on anything missing. Built-in content (checklist tasks,
  categories, tips) is translated through each file's `data` map, keyed by the English text. Admin-only screens stay KO/EN.
- Listings and choices are the plan's own data (synced sections), never hard-coded defaults; the repo is public.
- Layouts must work at phone width (390px) with no horizontal scroll.
- No inline scripts or inline event handlers (strict Content-Security-Policy): page code goes in `public/*.js`.
- Export is always free for plan members (Korean privacy law); only import and AI are paid add-ons.
- Personal data stays encrypted at rest (`sealText`/`openText` in `src/security.js`) — new stored fields too.
- Log new data downloads and admin/permission actions with `audit()`; never store ID numbers.

## Rules

- Staging first (`staging` branch), then production (fast-forward `main`).
- Back up live (Admin → Full backup, or `wrangler d1 export`) before any database change on live.
- New database tables or columns go in `schema.sql` **and** a new `migrations/000N_*.sql`, and are added to the backup test.
