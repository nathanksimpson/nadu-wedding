# Personal data incident response (개인정보 유출 등 대응)

Applies to any leak, loss, unauthorised access, alteration or destruction of personal data, **including suspected cases**
(개인정보보호법 제34조; 2026 amendments: notify users within 72 hours even when a leak is only suspected,
e.g. signs of unauthorised access, or member data offered for sale; ransomware tampering is reportable too).

## The first hour
1. **Contain.** Rotate what may be exposed:
   - Cloudflare API token (dashboard → My Profile → API Tokens), GitHub token, `RESEND_API_KEY`, `TURNSTILE_SECRET`.
   - If the database or a backup may be exposed: rotate `DATA_KEY` (README → Encryption → Rotating the key).
   - Sign everyone out: `npx wrangler d1 execute nadu-wedding-db --remote --command "DELETE FROM sessions"`.
   - If needed, take the site offline: Cloudflare dashboard → Workers → nadu-wedding → Deployments → roll back, or disable the route.
2. **Preserve evidence.** Admin → Security & privacy → Access log review: export what you see (screenshots), run
   *Check for tampering*, and download an encrypted backup with reason "incident evidence".
3. **Write down** what happened, when it was found, by whom, what data and whose (time-stamped notes).

## Within 72 hours of finding it (or suspecting it)
4. **Who is affected?** Use the access log (plan ids, users, IPs, times). If unclear, treat everyone as affected.
5. **Notify the people affected** (Admin → *Emails for a breach notice* copies the addresses). Use the template below.
6. **Report** to the 개인정보보호위원회 / KISA (privacy.kisa.or.kr · 118) when required — at least when
   1,000 or more people are affected, sensitive or unique identifying data is involved, or it came from a hack /
   unauthorised access. When in doubt, report.
7. If a suspected leak is later **confirmed**, send a follow-up notice; if it turns out **not** to be a leak, send a correction notice.

## Afterwards
8. Fix the cause, add a test, and record it in the internal management plan's incident log.
9. Re-check the access log daily for two weeks.

---

## Notice template (Korean)

**제목: [Nadu Wedding Planner] 개인정보 유출(의심) 안내**

안녕하세요, Nadu Wedding Planner입니다. 고객님의 개인정보와 관련해 다음과 같은 사고(의심 포함)가 있어 알려 드립니다.

- 유출(의심) 항목: (예: 이메일, 이름, 플랜에 입력한 하객 이름)
- 시점과 경위: (언제, 어떻게 알게 되었는지)
- 저희가 한 조치: (예: 모든 로그인 해제, 암호화 키 교체, 접근 차단)
- 고객님께 권하는 조치: (예: 비밀번호 변경, 2단계 인증 켜기, 의심스러운 메일 주의)
- 피해 구제: 문의 (보호책임자 이메일), 개인정보분쟁조정위원회 1833-6972, 개인정보침해신고센터 118
- 담당: 개인정보 보호책임자 (이름, 이메일)

확인되는 내용이 생기면 추가로 알려 드리겠습니다. 불편을 드려 죄송합니다.

## Notice template (English)

**Subject: [Nadu Wedding Planner] Notice of a (suspected) personal data incident**

We are writing to tell you about an incident (or suspected incident) involving your personal data.

- Data that may be affected: (e.g. email, name, guest names entered in your plan)
- When and how it happened: (what we know so far)
- What we have done: (e.g. signed everyone out, rotated encryption keys, blocked access)
- What we recommend: (e.g. change your password, turn on two-step sign-in, watch for suspicious emails)
- Help: contact (privacy officer email), Personal Information Dispute Mediation Committee 1833-6972, Infringement Report Center 118
- Contact: privacy officer (name, email)

We will send another notice as soon as we know more. We are sorry for the trouble.
