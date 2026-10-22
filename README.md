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
  (viewing and export still work) until an admin records a payment in the **Admin** tab
  (+30 days / +1 year). **AI features** are a separate paid switch per plan; admins always have them.
- **Admin:** the first account on an empty site, or the original owner after migration.
- **Password reset** by email via [Resend](https://resend.com): set secrets `RESEND_API_KEY` and
  `MAIL_FROM` (e.g. `Nadu Wedding Planner <noreply@yourdomain>`). Without them, the admin can create a
  reset link in the Admin tab and pass it on.
- Optional var `CONTACT_EMAIL` is shown to couples whose access has ended.
- Users can delete their account in Settings; a plan whose last member leaves is deleted with its data.

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

`0002_plans.sql` is additive: it moves the original shared plan into plan #1 (its first account becomes
owner and admin) and leaves the old `docs`/`history` tables untouched for rollback.

## Release checklist (staging → live)

1. Test on staging.
2. Back up live: sign in on the live site and click **Full backup (.sql)** (Admin tab, or History →
   Export on the original two-person version). The command-line equivalent is
   `npx wrangler d1 export nadu-wedding-db --remote --output backup.sql`.
3. Run pending migrations on live (`npm run migrate`).
4. Merge `staging` into `main` and push; GitHub Actions deploys.

## Backups and restore

The in-app **Full backup** downloads `nadu-wedding-<env>-backup-<date>.sql`: every account (password
hashes, not passwords), plan, member, invite, section and history entry. Sign-in sessions and rate-limit
counters are left out, so after a restore everyone just signs in again. Restore into either database:

```bash
npx wrangler d1 execute nadu-wedding-db --remote --file nadu-wedding-production-backup-YYYYMMDD-HHMM.sql
```

The file recreates any missing tables and overwrites rows with the same ids, so it works on an empty
database or on top of the current one. D1 Time Travel (`npx wrangler d1 time-travel restore`) can also
roll the database back to any minute in the last 30 days.

## Develop

```bash
npm install
npm test          # API + migration tests (Node 22.5+)
npm run dev       # local Worker with a local database
```
