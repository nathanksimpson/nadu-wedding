# Nadu Wedding Planner · 나두 웨딩 플래너

A wedding & first-home budget planner for couples: budget plan with venue comparison, checklist,
spending & family split, guests, gift money, vendor quotes, version history and exports.
One Cloudflare Worker serves the page (`public/`) and the API (`src/worker.js`); data lives in D1.

## Accounts and plans

- **Public sign-up** with email + password (no invite code). Sign-ups are rate-limited per IP; set
  `TURNSTILE_SITEKEY` (var) and `TURNSTILE_SECRET` (secret) to add Cloudflare Turnstile bot protection.
- Each couple works in a **plan**. Members: **owner** (names, invites, members), **editor**, **viewer**
  (read-only, e.g. parents). Owners invite with a single-use code/link valid for 7 days.
- Every data request names its plan (`X-Plan-Id`) and is checked against membership on the server;
  the tests include attempts to read, write, export or restore across plans.
- **Access:** new plans get a free trial (`TRIAL_DAYS`, default 14). After that the plan is read-only
  until an admin records a payment in the **Admin** tab (+30 days / +1 year).
- **Export is always free** for every member (JSON and CSV), whatever the plan's status: people have the right to
  their own data (개인정보보호법 제35조). **Paid add-ons** per plan, switched on in the Admin tab: **AI features** and
  **Import** (loading a file into a plan). Admins always have both.
- **Admin:** the first account on an empty site, or the original owner after migration. The Admin tab needs
  **two-step sign-in** (Settings → 두 단계 인증, any authenticator app); admin sessions end after 30 minutes idle.
- **Password reset** by email via [Resend](https://resend.com): set secrets `RESEND_API_KEY` and
  `MAIL_FROM` (e.g. `Nadu Wedding Planner <noreply@yourdomain>`). Without them, the admin can create a
  reset link in the Admin tab and pass it on.
- Optional var `CONTACT_EMAIL` is shown to couples whose access has ended.
- Users can delete their account in Settings; a plan whose last member leaves is deleted with its data.

## Languages

Korean and English are built in. Vietnamese, Chinese (Simplified), Thai and Japanese load from `public/i18n/<code>.js`
only when someone picks them (language menu in the header and on the sign-in screen); anything missing falls back to
English. `npm run i18n` lists gaps. Text people type themselves is never translated. The privacy policy is Korean and
English (the Korean version governs).

## Privacy and security

See `docs/privacy-security-plan.md` (checklist), `docs/internal-management-plan.md` and `docs/incident-response.md`.

- **Privacy policy** at `/privacy.html` (Korean and English). It shows as a draft until a Korean lawyer has reviewed it;
  then set `DRAFT = false` and the effective date in `public/privacy.js`.
- **Settings** (Worker variables or secrets; keep personal contacts out of this public repo):
  `PRIVACY_OFFICER`, `PRIVACY_EMAIL` (shown in the policy), `CONTACT_EMAIL`, `TURNSTILE_SITEKEY` + `TURNSTILE_SECRET`,
  `RESEND_API_KEY` + `MAIL_FROM` (password reset and retention warnings), `SIGNUP_OPEN` (`false` on staging).
- **Encryption at rest:** plan sections, history, photos and two-step keys are AES-256-GCM encrypted when the
  `DATA_KEY` secret is set. Create and set it once per environment (keep a copy in a password manager — without it the
  data can't be read):
  ```bash
  node -e "console.log('k1:'+require('crypto').randomBytes(32).toString('base64'))"   # copy the output
  npx wrangler secret put DATA_KEY --env staging    # paste it; for live: npx wrangler secret put DATA_KEY
  ```
  Then Admin → Security & privacy → **Encrypt now** encrypts the existing rows.
  **Rotating the key:** set the old value as `DATA_KEY_PREV`, a new `k2:…` value as `DATA_KEY`, press *Encrypt now*
  until nothing is left, then delete `DATA_KEY_PREV`.
- **Access log** (Admin tab): sign-ins, exports, imports, backups, membership and admin actions; HMAC-signed,
  kept 1 year (permission changes 3 years). Review monthly; *Check for tampering* verifies it.
- **Retention:** a daily job (03:17 KST) deletes plans 1 year after they expired, after a warning email 30 days before
  (no email set up → nothing is deleted). It also trims the access log and old sessions.
- **Bots:** `robots.txt` and `noai` headers, AI/scraper user agents get 403, read rate limits per account and IP
  (`READ_LIMITER` / `FILE_LIMITER` bindings), Turnstile on sign-up, sign-in and reset when configured.
- **Headers:** strict Content-Security-Policy (no inline scripts — page code lives in `public/app.js`), HSTS,
  no framing, no-referrer leaks.
- **ID numbers:** saving a resident/foreigner registration number is refused; card numbers get a warning.

## Quote & offer parser (AI add-on)

The **견적 붙여넣기 / Paste a quote** button opens a panel where a couple pastes a vendor quote or promo as text,
pastes a screenshot (Ctrl/⌘+V), or drops an image. `POST /api/ai/parse` sends it to **Cloudflare Workers AI**
(`AI` binding in `wrangler.jsonc`, model `@cf/google/gemma-4-26b-a4b-it`: vision, Korean, tool calling, available on
the free plan) and returns items for 스드메 listings, venues, vendor comparison, loans or 혼수. The couple checks
them and only the ticked ones are added (merged: nothing already in the plan is changed). Code: `src/ai.js`
(prompt, schema, cleaning) and `public/parse.js` (panel, image shrinking, `applyItems`).

- Needs the plan's **AI add-on** (admins always have it) and edit access. ID numbers in pasted text are refused.
- Nothing from the request is stored; the access log records `ai_parse` with the item count only.
- Cost: about 70 Neurons per parse, so the free 10,000 Neurons/day covers roughly 140 parses a day across the site.
  `AI_DAILY_LIMIT` (var, default 30) caps parses per plan per day; `AI_MODEL` swaps the model.
- The GitHub Actions `CLOUDFLARE_API_TOKEN` needs the **Workers AI** permission (Account → Workers AI → Read)
  to deploy a Worker with an `AI` binding.

## Environments

| | Worker | Database | Deployed by |
|---|---|---|---|
| Live | `nadu-wedding` | `nadu-wedding-db` | push to `main` |
| Staging | `nadu-wedding-staging` | `nadu-wedding-staging-db` | push to `staging` |

GitHub Actions deploys with the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
Staging pages show a yellow **STAGING** bar.

## Database changes

`schema.sql` is the full schema for a brand-new database. Existing databases are upgraded with the
files in `migrations/`, run once, **before** deploying code that needs them:

```bash
npm run migrate:staging   # staging database
npm run migrate           # live database
```

`0004_security.sql` adds the import add-on flag, two-step sign-in, the admin idle timer and the access log.
`0005_drop_legacy.sql` removes the pre-plans `docs`/`history` copies — run it only after a backup.

`0002_plans.sql` is additive: it moves the original shared plan into plan #1 (its first account becomes
owner and admin) and leaves the old `docs`/`history` tables untouched for rollback.

## Release checklist (staging → live)

1. Test on staging.
2. Back up live: Admin → **Full backup (encrypted)**, with a reason and a passphrase. The command-line equivalent is
   `npx wrangler d1 export nadu-wedding-db --remote --output backup.sql`.
3. Run pending migrations on live (`npm run migrate`).
4. Merge `staging` into `main` and push; GitHub Actions deploys.

## Backups and restore

The in-app **Full backup** (Admin tab) downloads `nadu-wedding-<env>-backup-<date>.nadubackup`, encrypted with the
passphrase you type: every account (password hashes, not passwords), plan, member, invite, section, history entry,
photo and access-log row. Sign-in sessions and rate-limit counters are left out, so after a restore everyone just
signs in again. The reason you give is recorded in the access log. Restore:

```bash
node scripts/decrypt-backup.mjs nadu-wedding-production-backup-YYYYMMDD-HHMM.nadubackup > backup.sql
npx wrangler d1 execute nadu-wedding-db --remote --file backup.sql
rm backup.sql
```

When encryption at rest is on, the plan data inside stays encrypted with `DATA_KEY`, so restore into a Worker that
has the same key. Keep backups for at most 90 days.

The file recreates any missing tables and overwrites rows with the same ids, so it works on an empty
database or on top of the current one. D1 Time Travel (`npx wrangler d1 time-travel restore`) can also
roll the database back to any minute in the last 30 days.

## Develop

```bash
npm install
npm test          # API + migration tests (Node 22.5+)
npm run dev       # local Worker with a local database
```
