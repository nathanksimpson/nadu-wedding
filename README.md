# 나단 & 두연 웨딩 — Cloudflare deploy

One Cloudflare Worker serves the page and a small API. All shared data lives in the D1 database
`nadu-wedding-db`, which is already created in your Cloudflare account with its tables set up.

## Deploy (about 5 minutes, once)

You need Node.js 20 or newer to deploy. `npm test` needs Node.js 22.5 or newer.

```bash
cd nadu-wedding
npm install
npx wrangler login                    # opens the browser to authorize your Cloudflare account
npx wrangler secret put INVITE_CODE   # type a code you'll share with 두연, e.g. a long random phrase
npm run deploy
```

Wrangler prints the address, e.g. `https://nadu-wedding.<your-subdomain>.workers.dev`.

## First sign-in

1. Open the address, choose **처음이세요? 초대 코드로 가입하기**, and create your account with the invite code.
2. Send 두연 the address and the invite code so she can create hers.
3. Up to 4 accounts can be created (`MAX_USERS` in `wrangler.jsonc`). Once you both have accounts you can
   change the invite code with `npx wrangler secret put INVITE_CODE` so nobody else can sign up.

To bring over what you entered in the Claude version: open it, press **가져오기·내보내기**, copy the JSON,
then paste it into the same box in the deployed app and press **불러오기**.

## How editing by two people works

- The plan is stored as separate sections (budget, venues, expenses, guests, gift money, checklist…),
  each with a version number.
- A save only lands if it was made against the latest version. If the other person saved first, the
  server returns their copy, the app merges both edits record by record and field by field, and saves
  again. Different records and different fields never overwrite each other. If you both change the very
  same field at the same moment, the later save wins and the other value stays in the history.
- Each browser checks for the other person's changes every 4 seconds while the tab is open, and saves
  immediately when you switch away from the tab.

## History and export

- **변경 기록 · History** tab: every saved version of every section, who saved it and when. Any version
  can be restored; restoring adds a new version, so nothing is lost. The last 300 versions per section are kept.
- Exports: all data as JSON (re-importable), CSV for expenses, guests, gift money, vendors and the history
  (CSV files include a BOM so Excel shows Korean correctly), plus the printable report.

## Files

- `public/index.html` — the app
- `src/worker.js` — API: sign-in, sections with version checks, history, restore, export
- `schema.sql` — database tables (already applied; `npm run schema` re-applies safely)
- `test/worker.test.mjs` — API tests against an in-memory SQLite (`npm test`)

## Staging (test copy)

A separate Worker, `nadu-wedding-staging`, with its own empty database `nadu-wedding-staging-db`
(already created, tables set up). Nothing done there can touch the real app's data. Every page in
staging shows a yellow **STAGING** bar and the tab title starts with `[STAGING]`.

- **Deploy:** push to the `staging` branch (GitHub Actions deploys it), or run `npm run deploy:staging`.
- **Go live:** merge `staging` into `main`; pushing `main` deploys the real app.
- **Once, before first use:** `npm run secret:staging` to set a staging invite code, then sign up there
  with test accounts.
- **Test with real-looking data:** export JSON from the live app (History tab → 전체 데이터) and load it
  in staging via 가져오기·내보내기 → 불러오기.
- **Local:** `npm run dev` runs everything on your PC with a local database.
