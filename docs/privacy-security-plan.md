# Privacy, security & import add-on plan

Status: **built on `staging`** (2026-10-22) — test there, then release to production.
Owner: Nathan · Not legal advice: a Korean lawyer reviews the privacy policy before it goes live (release blocker).

Legend: `[ ]` to do · `[x]` done · **(you)** needs Nathan · **(decide)** waiting on a decision

---

## 0. Decisions

- [x] **Export is free** for every member, any time (개인정보보호법 제35조; 제38조 allows only actual-cost fees) — decided 2026-10-22
- [x] Paid add-on is **import only** (loading a file into a plan), its own switch next to AI — default, change if you like
- [x] Print report stays free
- [x] Expired-plan retention: **delete 1 year after expiry, warning email 30 days before** — decided 2026-10-22
- [x] Policy reviewed by **a Korean lawyer** before production — decided 2026-10-22 (reminder set for 2026-10-29)
- [x] Staging: **closed to new sign-ups** (`SIGNUP_OPEN=false`); existing accounts keep working — default
- [x] Admins need **two-step sign-in** (authenticator app) for the Admin tab — default
- [ ] **(decide)** Custom domain (needed for Cloudflare's own bot blocking, §2)
- [ ] **(you)** Privacy officer name and contact email → set `PRIVACY_OFFICER` and `PRIVACY_EMAIL` on both Workers

## 1. Import add-on (export free)

- [x] Migration `0004`: `plans.io_enabled`; `schema.sql`; backup test covers it
- [x] Server: imports (`action: import`) and photos from an import file need the add-on (admins always have it) → 402
- [x] Export (JSON) free for every member, also for expired plans; CSV downloads reported to the access log
- [x] 가져오기·내보내기 panel: import area locked with a note when the plan has no add-on; copying the JSON stays free
- [x] Admin tab: Import checkbox next to AI
- [x] Settings → delete account: "download my data first" button
- [x] README updated
- [x] Tests: import refused without add-on, allowed with it; export works for members and expired plans

## 2. Anti-scraping and bots

- [x] `robots.txt`: disallow all, AI crawlers named (GPTBot, ClaudeBot, CCBot, Google-Extended, PerplexityBot, Bytespider, Applebot-Extended, Meta-ExternalAgent, Amazonbot and more)
- [x] `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai` on every response; meta tag on the policy page
- [x] Worker blocks AI/scraper user agents (403) on every page, and API calls without a browser user agent
- [x] Turnstile wired into sign-up, sign-in and reset (server + page)
- [ ] **(you)** Create the Turnstile widget; set `TURNSTILE_SITEKEY` / `TURNSTILE_SECRET` on staging, then production
- [x] Read limits per account and per IP (Cloudflare rate-limit bindings, fallback counter); 3 trips in 10 min → 15-min read lock; logged
- [ ] **(if custom domain)** Cloudflare: Block AI bots, Bot Fight Mode, AI Crawl Control
- [x] Tests: AI user agents 403, robots.txt readable by bots, rate limit and lockout, headers present

## 3. Korean privacy law (개인정보보호법)

### Collecting
- [x] Sign-up shows a notice (what, why, where, how long) instead of an "I agree" checkbox (제15조①4)
- [x] No optional consents needed today (no marketing)
- [x] Only email, display name, password collected (제16조)
- [x] "I am 14 or older" confirmation; age not stored (제22조의2)
- [x] Guest form hint: names only, no contact details
- [x] Resident/foreigner registration numbers refused on save; card numbers warned (제24조의2)

### Privacy policy (제30조)
- [x] `/privacy.html`, Korean and English, linked at sign-up and in every page footer, version shown
- [x] Purposes, items and legal basis, retention (incl. 30-day recovery copies, 90-day admin backups), processors, transfer abroad, third-party data notice, rights, security measures, cookies, children, complaint bodies, changes
- [ ] **(you)** Confirm Resend's legal entity and contact for §6–7 of the policy
- [ ] **Release blocker (you):** Korean lawyer reviews the policy, sign-up notice and terms; then set `DRAFT = false` and the effective date in `public/privacy.js`

### Users' rights
- [x] Viewing: free export any time; written requests answered within 10 days (policy)
- [x] Correcting and deleting: editing; account deletion removes data immediately (tested)
- [x] Stopping processing: by email to the privacy officer (policy)

### Retention and deletion (제21조)
- [x] Plan/account deletion purges sections, history, photos, invites (tested)
- [x] Daily job: plans expired 1 year are deleted after a warning email 30 days before; without email nothing is deleted (tested)
- [ ] **(you)** Set up Resend (`RESEND_API_KEY`, `MAIL_FROM`) so warnings (and password resets) can go out
- [x] Migration `0005` drops the old pre-plans `docs`/`history` copies
- [ ] **(you)** Run `0005` on live after a backup (shown under Admin → Security as "old copy tables")
- [x] Admin backups: keep at most 90 days (internal plan)

### Before future features
- [ ] Before any AI feature sends plan data to a provider: update the policy (processor + transfer abroad), then launch
- [ ] Payments: card data stays with the payment company
- [ ] Marketing email only with opt-in consent (정보통신망법 제50조)

## 4. Storing data safely (안전성 확보조치 기준)

### Encryption (제7조)
- [x] AES-256-GCM encryption of every plan section, history entry, photo and two-step key when `DATA_KEY` is set
- [x] Key id stored with each value; rotation with `DATA_KEY_PREV` + Admin → *Encrypt now* (tested)
- [ ] **(you)** Create `DATA_KEY` for staging, then production (README → Encryption), keep a copy in a password manager, press *Encrypt now*
- [x] Full backup is encrypted with a passphrase; `scripts/decrypt-backup.mjs` to restore (tested)
- [x] Passwords one-way (PBKDF2-SHA256, 100k, per-user salt); common passwords and passwords containing the email refused
- [x] HTTPS only (HSTS); cookies `Secure; HttpOnly; SameSite=Lax`

### Access control (제5–6조)
- [x] 5 failed sign-ins lock the account for 15 minutes; users told how long and how many tries are left
- [x] Two-step sign-in (TOTP) for everyone, required for the Admin tab
- [x] Admin sessions end after 30 minutes idle
- [x] Admins see plan names and members only, never plan data (tested)
- [x] Staging closed to new sign-ups
- [ ] **(you)** Two-step login on your Cloudflare and GitHub accounts; API token limited to Workers + D1

### Access logs (제8조)
- [x] `audit_log`: user, time, IP, plan, action, target, detail — sign-ins (and failures), exports, CSV downloads, imports, backups, membership, admin actions, 2FA, password changes, lockouts, retention
- [x] Each row HMAC-signed; edits and deleted rows are detected (*Check for tampering*, tested)
- [x] Kept 1 year, permission changes 3 years; daily purge recorded so it isn't mistaken for tampering
- [x] Admin tab review screen with filters (downloads, security, admin, accounts)
- [x] Backup asks for a reason, which is logged
- [ ] **(you)** Review the log monthly (internal plan)

### Web hardening
- [x] HSTS, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`, `nosniff`, COOP
- [x] Strict Content-Security-Policy (inline script moved to `public/app.js`)
- [x] Origin check on writes (tested)

## 5. Incident response (제34조)
- [x] `docs/incident-response.md`: contain, preserve, notify within 72 hours (also suspected), report when required
- [x] Notice templates (Korean, English)
- [x] Admin tab: copy all emails for a notice
- [x] Follow-up / correction notices covered

## 6. Paperwork
- [x] `docs/internal-management-plan.md` (one page) with yearly check and incident log
- [ ] **(you)** Yearly self-check
- [ ] Liability insurance (제39조의7): only at revenue ≥ 10억원 **and** 10,000+ people; re-check yearly

## 7. Testing on staging
- [x] `npm test`: import gating, free export, bots, rate limits, ID numbers, encryption + rotation, encrypted backup restore, audit tamper detection, admin can't read plans, idle sign-out, two-step sign-in, retention job, closed sign-up, migrations 0004/0005
- [x] Browser check (local copy): sign-up notice, 14+, 2FA setup and sign-in, admin security panel, encrypted backup download, access log, ID-number refusal, CSV, privacy page KO/EN at 390px, import lock for a couple without the add-on
- [ ] **(you)** Try it on staging: set up two-step sign-in, open the Admin tab, download a backup
- [ ] Release to production: back up live → `0004` → fast-forward `main` → set `DATA_KEY` and press *Encrypt now* → `0005` after checking

---

### Sources
- [개인정보의 안전성 확보조치 기준 (조문)](https://wikidocs.net/264634)
- [개인정보 안전조치: 권한·접근통제·암호화·접속기록 점검](https://thecheck.co.kr/personal-data-safeguards-access-logs/)
- [해외 클라우드 보관 시 동의 필요 여부](https://www.nepla.ai/wiki/it-정보-방송통신/개인정보-위치정보-신용정보/-일문일답-해외-클라우드-aws-등-에서-개인정보를-보관-처리할-때-정보주체의-동의를-받아야-하는가-54gnvzpe81pr)
- [개인정보위, 필수동의 관행 개선](https://newsseoul.co.kr/news/view/1065588011287541)
- [개인정보 손해배상 책임보험 기준](https://itwiki.kr/w/개인정보_손해배상_책임보험)
- [반복·중대 유출 시 매출 10% 과징금 (데일리안, 2026-09)](https://www.dailian.co.kr/news/view/1688680)
- [유출 '의심'만 돼도 72시간 내 고지 (머니투데이방송, 2026-06)](https://news.mtn.co.kr/news-detail/2026060210061182263)
