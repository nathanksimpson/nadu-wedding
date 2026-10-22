# Privacy, security & paid export plan

Status: **planned** — build on `staging` first, test, then release to production.
Owner: Nathan · Drafted 2026-10-22 · Not legal advice: have the privacy policy reviewed before it goes live.

Legend: `[ ]` to do · `[x]` done · **(decide)** waiting on a decision

---

## 0. Decisions needed

- [ ] **(decide)** Which features are paid: JSON export, CSV exports, import, print report (suggest: print report stays free)
- [ ] **(decide)** Export/import as its own paid switch, or bundled with AI as one "premium" add-on
- [ ] **(decide)** Keep a free plain data download on plan expiry and before account deletion (recommended for viewing rights, 제35조)
- [ ] **(decide)** Custom domain (needed for Cloudflare's own bot blocking)
- [ ] **(decide)** Privacy officer (개인정보 보호책임자): name and contact email
- [ ] **(decide)** Who reviews the privacy policy: a lawyer, or the 개인정보보호위원회's free policy-writing guide and checker
- [ ] **(decide)** Staging data: replace with fake sample data, or lock staging behind Cloudflare Access
- [ ] **(decide)** Require two-step login (authenticator app) for admins
- [ ] **(decide)** Expired-plan retention: delete after 1 year, with an email warning 30 days before (needs Resend set up)

---

## 1. Paid export / import add-on

- [ ] Migration `0004`: add an `io_enabled` column to `plans`, update `schema.sql`, and add it to the backup test
- [ ] Server refuses `/api/export`, imports (`action: import`) and photos carried in an import file unless the plan has the add-on (admins always have it)
- [ ] Free plain data download stays available for expired plans and from the delete-account screen
- [ ] 가져오기·내보내기 panel and History → Export: locked state with a "paid add-on" note in Korean and English
- [ ] Admin tab: Export/import checkbox next to AI
- [ ] README: update "expired plans can still export" to match
- [ ] Tests: refused without the add-on, refused for viewers, allowed for admins, switching it on and off, and the free download still works

## 2. Anti-scraping and bots

- [ ] `robots.txt`: disallow all, and name the AI crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended, PerplexityBot, Bytespider, Applebot-Extended, Meta-ExternalAgent, Amazonbot)
- [ ] `X-Robots-Tag: noindex, nofollow, noai, noimageai` on every response, plus a matching meta tag
- [ ] Worker blocks self-identified AI or scraper user agents (403), and API calls with no browser user agent
- [ ] Turnstile on sign-up, login and password reset (create the widget; set `TURNSTILE_SITEKEY` / `TURNSTILE_SECRET` on staging, then production)
- [ ] Read rate limits per account and per IP on state, history items, photos and the change feed
- [ ] Temporary lockout when limits are exceeded, with an Admin-tab list of who triggered it
- [ ] **(if custom domain)** Cloudflare: Block AI bots, Bot Fight Mode, AI Crawl Control
- [ ] Tests: AI user agents get 403, rate limits trigger and reset, a normal browser session is unaffected

## 3. Korean privacy law (개인정보보호법)

### Collecting
- [ ] Sign-up shows a notice of what's collected, why and for how long, instead of an "I agree" checkbox, since contract data needs no consent (제15조①4)
- [ ] Separate, unticked opt-ins only for non-essential items (none today; marketing would be one)
- [ ] Collect only email, display name and password (제16조); no phone or birth date
- [ ] Sign-up confirms the user is 14 or older; the age itself isn't stored (제22조의2)
- [ ] Guest form hint: names only, no contact details
- [ ] Free-text fields refuse resident registration numbers and warn on card or bank account numbers (제24조의2)

### Privacy policy (제30조)
- [ ] Full Korean 개인정보처리방침 page, plus English
- [ ] Linked on every page and at sign-up, labelled "개인정보처리방침", with a version history
- [ ] What is collected, the purpose, and the legal basis (contract vs. consent)
- [ ] Retention and deletion periods, including backups (30 days) and Cloudflare Time Travel (30 days)
- [ ] Processors (위탁, 제26조): Cloudflare (hosting, database, storage) and Resend (password-reset email)
- [ ] Storage abroad (제28조의8): data items, countries, timing and method, recipient and contact, purpose and retention, how to refuse and what refusing means
- [ ] Third-party data notice: guest and gift data is entered by users for their own wedding planning, and deleted with the plan
- [ ] Users' rights and how to exercise them, including through a representative (제35–38조)
- [ ] Privacy officer contact (제31조)
- [ ] Security measures summary (제29조)
- [ ] Access logs and IP addresses: what's kept and for how long

### Users' rights
- [ ] Viewing (제35조): free data download, and a reply to written requests within 10 days
- [ ] Correcting and deleting (제36조): editing, and account deletion that removes the data immediately
- [ ] Stopping processing (제37조): request by email; documented process
- [ ] Contact email for requests shown in Settings and the policy

### Retention and deletion (제21조)
- [ ] Account or plan deletion purges sections, history, files and invites (verify with a test)
- [ ] Expired-plan retention, per the decision in §0, with a warning email
- [ ] After a backup, drop the old pre-upgrade `docs` / `history` tables on live (duplicate personal data)
- [ ] Admin backup files: keep in one place, delete after a set period (record it in the internal plan)

### Before future features
- [ ] Before any AI feature sends plan data to a provider: update the policy (processor plus transfer abroad), then launch
- [ ] Payments: card data stays with the payment company; never store card numbers
- [ ] Marketing email only with opt-in consent (정보통신망법 제50조)

## 4. Storing data safely (안전성 확보조치 기준)

### Encryption (제7조)
- [ ] App-level AES-GCM encryption of sensitive sections (guests, giftLog, expenses, budget/loans, vendors, sdm) and plan photos; key held as a Worker secret
- [ ] Each record notes its key version; key rotation script plus test
- [ ] Backups contain only encrypted values; restore test with the key
- [ ] Full-backup download protected with a passphrase you choose
- [ ] Passwords stay one-way (PBKDF2-SHA256, 100k iterations, per-user salt); block very common passwords
- [ ] HTTPS only: HSTS header; cookies `Secure; HttpOnly; SameSite`

### Access control (제5–6조)
- [ ] Failed-login limit checked against the standard; tell users when they're locked out
- [ ] Two-step login (authenticator app) for admins **(decide)**
- [ ] Admin sessions end after 30 minutes idle
- [ ] Admins can see plan names and members only, never plan data (add a test)
- [ ] Staging: fake data or Cloudflare Access **(decide)**
- [ ] Cloudflare and GitHub accounts: two-step login on; API token scoped to Workers and D1 only

### Access logs (제8조)
- [ ] `audit_log` table: user, time, IP, plan, action, target (sign-ins, exports, imports, photo downloads, backups, admin actions, role changes)
- [ ] Append-only and chained (each row stores a hash of the one before) so tampering shows
- [ ] Retention: 1 year; permission changes 3 years (제5조③); a cleanup job deletes older rows
- [ ] Admin tab: monthly review screen that highlights downloads, bulk reads and lockouts
- [ ] Full-backup download asks for a reason, which is logged
- [ ] Add the table to `schema.sql`, a migration, and the backup test

### Web hardening
- [ ] Headers: HSTS, `X-Frame-Options: DENY` / `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Content-Type-Options: nosniff`
- [ ] Strict Content-Security-Policy: move the inline script from `index.html` into a file first
- [ ] Origin check on every write (exists; keep the test)

## 5. Incident response (제34조)

- [ ] README runbook: contain, assess, notify users **within 72 hours, including for suspected leaks**, and report to the 개인정보보호위원회 / KISA when required (e.g. 1,000+ people, or a hack)
- [ ] Notice template (Korean and English): what data, when, how it happened, what we did, what users should do, contact and remedies
- [ ] Admin tab: list of affected accounts' emails for notification
- [ ] Follow-up notice when a suspected leak is confirmed, or a correction notice when it isn't

## 6. Paperwork

- [ ] One-page internal management plan in `docs/` (optional under 10,000 people; it helps if anything goes wrong): who has access, log reviews, backups, key handling, incident steps
- [ ] Yearly self-check: access rights, logs, encryption
- [ ] Liability insurance (제39조의7): not required until revenue ≥ 10억원 **and** 10,000+ people; re-check yearly

## 7. Testing on staging (before production)

- [ ] `npm test` covers: paid gating, bot blocking, rate limits, resident-number refusal, encryption round trip and key rotation, backup restore with encrypted data, audit-log tamper check, admins can't read plan data, idle logout, two-step login
- [ ] Browser checks in Korean and English and at 390px phone width: locked and unlocked export panels, sign-up notice and 14+ confirmation, privacy policy page, Admin review screen
- [ ] External checks: requests as GPTBot and ClaudeBot get 403; security headers present; Turnstile works with Cloudflare's test keys
- [ ] Release: back up live → run migrations → fast-forward `main` → verify → set the production secrets (encryption key, Turnstile)

---

### Sources
- [개인정보의 안전성 확보조치 기준 (조문)](https://wikidocs.net/264634)
- [개인정보 안전조치: 권한·접근통제·암호화·접속기록 점검](https://thecheck.co.kr/personal-data-safeguards-access-logs/)
- [해외 클라우드 보관 시 동의 필요 여부](https://www.nepla.ai/wiki/it-정보-방송통신/개인정보-위치정보-신용정보/-일문일답-해외-클라우드-aws-등-에서-개인정보를-보관-처리할-때-정보주체의-동의를-받아야-하는가-54gnvzpe81pr)
- [개인정보위, 필수동의 관행 개선](https://newsseoul.co.kr/news/view/1065588011287541)
- [개인정보 손해배상 책임보험 기준](https://itwiki.kr/w/개인정보_손해배상_책임보험)
- [반복·중대 유출 시 매출 10% 과징금 (데일리안, 2026-09)](https://www.dailian.co.kr/news/view/1688680)
- [유출 '의심'만 돼도 72시간 내 고지 (머니투데이방송, 2026-06)](https://news.mtn.co.kr/news-detail/2026060210061182263)
