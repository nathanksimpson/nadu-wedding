# Internal management plan (내부관리계획, one page)

Optional under 10,000 people (안전성 확보조치 기준 제4조), kept anyway: it is how the safeguards are actually run,
and it counts in our favour if anything goes wrong. Review once a year and after any big change.

| | |
|---|---|
| **Privacy officer (보호책임자)** | Nathan (site admin). Contact set as `PRIVACY_OFFICER` / `PRIVACY_EMAIL` on the Workers. |
| **Who can reach personal data** | Site admin only, through the Admin tab (plan names, members, emails, access log — never plan contents) and Cloudflare/GitHub accounts. No shared accounts. |
| **Admin access** | Two-step sign-in required for the Admin tab; admin sessions end after 30 minutes idle. Cloudflare and GitHub accounts use two-step login. API token limited to Workers + D1. |
| **Encryption** | HTTPS everywhere; plan sections, history, photos and two-step keys encrypted with `DATA_KEY` (AES-256-GCM); passwords one-way (PBKDF2-SHA256). Key kept only as a Worker secret and in a password manager. Rotate yearly or after any suspected exposure. |
| **Access log** | Kept 1 year (permission changes 3 years), HMAC-signed. **Monthly**: Admin → Access log review → Downloads and Security, then *Check for tampering*. Every download must have a known reason; ask the user if not. |
| **Backups** | Admin → Full backup (encrypted, reason logged) before every release to live. Store in one folder on an encrypted disk, passphrase in the password manager, **delete after 90 days**. Cloudflare Time Travel keeps 30 days of history. |
| **Retention** | Expired plans deleted 1 year after they end (warning email 30 days before; needs Resend). Daily job at 03:17 KST. |
| **ID numbers** | The app refuses resident registration numbers; warns on card numbers. |
| **Bots** | robots.txt and no-AI headers, AI/scraper user agents blocked, read rate limits, Turnstile on sign-up/sign-in/reset. |
| **Processors / abroad** | Cloudflare (hosting, storage), Resend (email). Listed in the privacy policy. Check their terms yearly. |
| **Incidents** | docs/incident-response.md — notify within 72 hours, including suspected leaks. |
| **Staging** | Closed to new sign-ups. Real data on staging is treated exactly like production data. |

## Yearly check (1회 이상)
- [ ] Admin accounts and Cloudflare/GitHub members still correct
- [ ] Access log reviews done every month; tamper check OK
- [ ] Encryption status OK (Admin → Security), key rotated if due
- [ ] Old backups deleted (> 90 days)
- [ ] Privacy policy still matches what the app does
- [ ] Liability insurance threshold (revenue ≥ 10억원 and ≥ 10,000 people) not reached, or insurance in place

## Incident log
| Date | What | Notified | Reported | Fix |
|---|---|---|---|---|
| | | | | |
