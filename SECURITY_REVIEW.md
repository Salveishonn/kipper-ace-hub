# Security review — Kipper Seguros (ASVS 5.0.0 Level 2 baseline)

Review date: 2026-11-03 · Branch: `security/asvs-l2-hardening` (from `master` @ 1a3c5b45)

**Deployment status (2026-11-03):** migration `20261103131256_security_review_hardening` **applied to production** and verified (grants, policies, trigger, advisor). Edge Functions and frontend **not yet deployed**.

This is a hardening exercise against OWASP ASVS 5.0.0 L2, not a certification. Nothing was
deployed and no production data was changed. Production was only **read** for schema metadata
(policies, grants, function ACLs), aggregate counts and the Supabase security advisor.

## 1. Architecture

| Layer | What | Trust notes |
|---|---|---|
| Frontend | React 18 + Vite SPA on Vercel (`vercel.json` headers/CSP) | Public; uses the Supabase publishable (anon) key. UI route guards are convenience only. |
| Data/API | Supabase Postgres via PostgREST + Realtime, RLS on every `public` table | **The real authorization boundary.** Roles: `anon`, `authenticated`, `service_role`. |
| App roles | `user_roles` (`admin`, `productor`, `cliente`), `profiles.account_status` (`pending/active/suspended`) | Admin “MFA” = 6-digit email code → `admin_mfa_verifications(user_id, session_id)`; `is_admin_session()` checks it, `is_admin()` does not. |
| Storage | 7 private buckets (avatars, design-resources, pas-resources, academy-files, consulta-attachments, payment-proofs, quote-uploads) with size/MIME limits | Policies on `storage.objects` by bucket + folder. |
| Edge Functions (Deno) | `register-pas-application` (public), `process-support-notifications` (public), `google-reviews` (public read / cron or admin refresh), `admin-mfa`, `approve/create/delete/invite-pas-producer`, `fedpat-sync` (admin) | Hold the service-role key; must authorize callers themselves. |
| Async | `notification_outbox` → pg_net → `process-support-notifications` → Resend; pg_cron retry every 5 min | Triggers are `SECURITY DEFINER`. |
| Integrations | Resend (email), Google Places, Federación Patronal (OAuth, tokens in `integration_tokens`), Botmaker webchat, GA | Secrets in Supabase function env, not in Vite. |

Tenancy: single organization. Isolation boundaries are **per user** (producer ↔ producer) and
**role** (applicant → producer → admin).

### Threat model (prioritized attack paths)

1. **Privilege escalation by a signed-in account** (pending applicant, suspended producer, producer) to productor/admin via RPCs or RLS gaps. → SR-01, SR-02, SR-04
2. **Horizontal data access** between producers (profiles with DNI/address, consultas, attachments). → SR-03, SR-05, SR-07
3. **Admin password compromise** (phishing/reuse): MFA must protect admin power and PII. → SR-02, SR-11
4. **Anonymous abuse of public endpoints** (Sumate registration, notifications, public inserts). → SR-06, SR-10, SR-13
5. **Stored XSS through admin-managed content** shown to every producer. → SR-09
6. **Secret exposure** in repo/history/bundle. → §3 Secrets

## 2. Findings

Severity reflects impact × exploitability **in this deployment**. Status: Fixed (code in this branch, pending deploy), Open, Accepted.

| ID | Sev. | Conf. | Title | Status |
|---|---|---|---|---|
| SR-01 | High (latent) | Confirmed | `approve_pas_application` executable by any signed-in user with a caller-supplied admin id | Fixed |
| SR-02 | High | Confirmed | Admin MFA bypass: every admin write and PII read needed only the password | Fixed |
| SR-03 | High | Confirmed | Producer can read any user's profile by inserting a CRM `policies` row | Fixed |
| SR-10 | Medium | Confirmed | Sumate registration attaches a solicitud to any existing account without proof of ownership | Fixed |
| SR-11 | Medium | Confirmed | Admin email-code brute-force budget unbounded across codes; biased code generation | Fixed |
| SR-04 | Medium | Confirmed | Users can change `profiles.email` and self-insert an `active` profile | Fixed |
| SR-05 | Low | Confirmed | Consultas mass assignment (pre-resolved cases, foreign attachment paths) | Fixed |
| SR-06 | Low | Confirmed | Anonymous inserts can pre-assign leads/quotes to producers; clients can forge audit rows; no length limits | Fixed |
| SR-07 | Low | Confirmed | Any signed-in account can list every user id via the avatars bucket | Fixed |
| SR-09 | Low | Confirmed | Admin-entered URLs accept `javascript:`/`data:` (opened/embedded for all producers) | Fixed |
| SR-08 | Low | Confirmed | `has_role()` callable by anon (role oracle); TRUNCATE/TRIGGER/REFERENCES granted to API roles | Fixed |
| SR-12 | Low | Confirmed | Edge Function CORS trusts any `*.vercel.app` / `*.lovable.app` origin | Fixed |
| SR-13 | Low | Confirmed | `process-support-notifications` is unauthenticated and returned outbox row ids | Partly fixed / Accepted |
| SR-14 | Info | Confirmed | `google-reviews` compared `CRON_SECRET` with `===` | Fixed |

### SR-01 — Self-approval through `approve_pas_application` (High, latent)
- **Where:** `supabase/migrations/20260803022422_producer_self_registration_approval.sql` (function), grants in `…20260908120000…sql:150`.
- **Cause:** `REVOKE ALL … FROM PUBLIC` does not remove Supabase's *direct* grant to `authenticated`; production ACL confirmed `authenticated=X`. The function trusts `p_admin_user_id` from the caller. The existing test asserted only the `REVOKE … FROM anon` text.
- **Attack:** a signed-in account calls `POST /rest/v1/rpc/approve_pas_application {application_id, admin_id}` → gets `productor` role, bypassing admin review and MFA. Admin ids were discoverable (SR-07 avatar folder listing; message authors in consultas).
- **Why latent:** for `pending`/`suspended` profiles the RPC is rolled back *incidentally* by the `account_status` trigger. It succeeds for any account whose profile is already `active` without the productor role (column default, or a role removed by hand). Production currently has **0** such accounts (aggregate check); proven against all migrations in `src/test/db/rlsSecurityReview.test.ts` (“before the fix”).
- **Fix:** revoke from `authenticated`; in-function guard (an end-user caller must be `p_admin_user_id` *and* `is_admin_session()`). ASVS V8 (Authorization), V15 (least privilege).

### SR-02 — Admin MFA only protected role changes (High)
- **Where:** `…20260821150000_admin_content_reads_without_mfa.sql` made `is_admin()` password-only; every `Admin … FOR ALL USING (is_admin())` policy (21 tables, 6 storage policies) and `protect_profile_account_status` used it.
- **Attack:** with only an admin password, direct PostgREST calls could read all producer PII (applications incl. matrícula, profiles incl. DNI, consultas, attachments), edit/delete any row, change `account_status`, publish content to all producers.
- **Fix:** per table: `SELECT` keeps `is_admin()` for portal content (the documented reason for 20260821150000: an admin also browsing as productor), but uses `is_admin_session()` for PII tables; `INSERT/UPDATE/DELETE` always `is_admin_session()`. Storage writes and personal-upload reads need MFA. No UI change: the admin area already requires the MFA step. ASVS V6 (MFA), V8.

### SR-03 — Producer → any profile (High)
- **Where:** `…20260119140828…sql:354` “Productores can insert policies” `WITH CHECK (is_productor())`; `:319` “Productores can view client profiles”.
- **Attack:** producer inserts `policies(user_id = victim, assigned_productor_id = self)` and then reads the victim's profile (DNI, address, phone) — including other producers and admins. Reproduced in tests; live policies identical.
- **Fix:** drop the producer INSERT policy (CRM tables are written only by the service-role FedPat sync; 0 rows today, no frontend use) and restrict that profile policy to `cliente` targets. ASVS V8 (object-level).

### SR-10 — Solicitud for someone else's account (Medium)
- **Where:** `supabase/functions/register-pas-application/index.ts` (existing-account branch).
- **Attack:** anonymous POST with an existing user's email creates a pending application linked to that user (attacker-controlled name/phone/matrícula); an admin approval then grants productor to an account whose owner never applied.
- **Fix:** the existing-account path now requires the submitted password to sign in (throwaway client, `signOut({scope:"local"})`), response stays enumeration-safe; field length caps and password ≤ 72. ASVS V2 (business logic), V6.

### SR-11 — Admin email code (Medium)
- **Where:** `supabase/functions/admin-mfa/index.ts`.
- **Issue:** 5 guesses per code, new code every 60 s, no cap across codes; `byte % 10` bias toward 0–5.
- **Fix:** ≤ 5 codes and ≤ 10 failed attempts per user per hour (429); rejection-sampled digits (`_shared/security.ts`). ASVS V6 (OTP brute force).

### SR-04 … SR-14 (summary)
- **SR-04** `protect_profile_account_status` now runs on INSERT and UPDATE: end users can't change `email`/`user_id`/`account_status` or insert a non-`pending` profile (email drives consulta notifications and admin identity).
- **SR-05** Producer case creation must start `abierto` with no resolver/closer; message `attachment_path` must be `{ticket_id}/{auth.uid()}/…`.
- **SR-06** Anonymous `leads`/`quote_requests`/`contacts` inserts: protected columns must be default (no producer pre-assignment, no `documents`), length caps; client `audit_logs` INSERT policies removed (Edge Functions use service role).
- **SR-07** Avatar reads limited to own folder, producers and admins (pending applicants could enumerate user ids).
- **SR-08** `has_role` revoked from anon; TRUNCATE/TRIGGER/REFERENCES revoked from `anon`/`authenticated` (TRUNCATE bypasses RLS; not reachable via PostgREST today — defense in depth).
- **SR-09** CHECK constraints (`^https?://`) on `pas_resources.external_url`, `design_resources.editable_url`, `academy_lessons.video_url` (production data verified compliant first) + `src/lib/safeUrl.ts` at render sites and in `getVideoEmbedUrl`.
- **SR-12** CORS limited to listed origins + `^https://kipper-ace-hub(-…)?\.vercel\.app$` (`_shared/cors.ts`, `fedpat-sync/utils.ts`). Low impact because auth is a bearer header, not cookies.
- **SR-13** Response now counts only. The endpoint stays callable without a session by design (the portal “kicks” the queue); it only drains rows that are already due and sends are idempotent. **Accepted**; optional hardening in §6.
- **SR-14** Constant-time compare.

## 3. Secrets

- **Tracked files:** no live secrets found. `.env.example` holds only public values. `.env.local` is untracked and git-ignored (not read).
- **History:** commit `cc712880` (2026-01-19) committed `.env` with `VITE_SUPABASE_URL/PROJECT_ID/PUBLISHABLE_KEY`; the only JWT anywhere in history decodes to `"role":"anon"` (publishable). **No rotation required.**
- Key-shaped strings (`AIzaSy…`, `ghp_…`, `re_…`) in history are inside third-party agent-skill docs under `.cursor/skills/` (commit `3df079a5`), presented as examples. Not validated against providers (would require calling them) — treat as **unverified**; see §6.
- Service-role key, Resend, Google, FedPat, CRON secrets are read only from Edge Function env. The Vite bundle uses only `VITE_*` publishable values. `dist/` has **no source maps**.

## 4. Changes (this branch)

| File | Change |
|---|---|
| `supabase/migrations/20261103131256_security_review_hardening.sql` | SR-01…SR-09 (idempotent) |
| `docs/security/rollback_20261103131256_security_review_hardening.sql` | Manual rollback (tested) |
| `supabase/functions/_shared/security.ts` | `timingSafeEqual`, `randomDigits`, `firstOversizedField`, `signInProvesPassword` |
| `supabase/functions/register-pas-application/index.ts` | SR-10 |
| `supabase/functions/admin-mfa/index.ts` | SR-11 |
| `supabase/functions/_shared/cors.ts`, `fedpat-sync/utils.ts` | SR-12 |
| `supabase/functions/process-support-notifications/index.ts` | SR-13 |
| `supabase/functions/google-reviews/index.ts` | SR-14 |
| `src/lib/safeUrl.ts`, `src/lib/videoEmbed.ts`, `PasResourceViewer.tsx`, `ProductorMateriales.tsx`, `ProductorRecursos.tsx`, `AdminRecursosGraficos.tsx` | SR-09 |
| `src/test/db/supabaseDb.ts`, `src/test/db/rlsSecurityReview.test.ts` | Behavioral RLS/RPC tests on PGlite (all migrations applied, Supabase roles/default grants emulated) |
| `src/test/securityReviewHelpers.test.ts` | Helper, CORS and URL tests |
| `src/test/setup.ts` | DOM stubs skipped in node-environment suites |
| `package.json` / lock | `@electric-sql/pglite@0.5.10` (dev, exact); `npm audit fix` (semver-compatible) |

## 5. Verification (commands actually run)

| Check | Result |
|---|---|
| `npx vitest run src/test/db` | **Pass** 32/32 — includes “before the fix” proofs (SR-01/02/03 reproduced on pre-fix migrations), negatives (anon, other producer, applicant, suspended, admin without MFA, other session), positives (service-role approval, MFA admin, own profile edit, case + attachment), rollback + double re-apply. |
| `npx vitest run` (full) | 192 pass, **1 fail — pre-existing**: `securityHardening.test.ts › outbox trigger ambiguity fix` expects `\n` but Windows checks the migration out with CRLF; file untouched here. |
| `npm run build` | **Pass**; no `.map` in `dist/assets`. |
| `npx tsc -p tsconfig.app.json --noEmit` | 10 errors, **all pre-existing**, none in changed files (HeroSection, KipperScrollStory, Registro, 2 tests, 2 `_shared` files). |
| `npx eslint .` | 32 errors / 44 warnings, **pre-existing**; changed files: 0 errors. |
| `deno check` on all Edge Functions | Pass except `google-reviews`: 4 supabase-js generic type errors, **identical on HEAD**. |
| `npm audit` | Before 27 (2 critical) → after 18 (2 critical). Remaining: dev-only vitest/tinypool & eslint chain (major upgrades), `@tailwindcss/typography` (build), **`zod` 3.x** (runtime, client-side validation only; fix is v4 major). |
| Supabase security advisor (prod, read-only) | Flags SR-01 function grant, anon `has_role`, `pg_net` in `public`, **leaked password protection disabled**. |
| Live policy/grant catalog (prod, read-only) | Matches repo migrations; used to scope SR-02/03. |
| Not run | Local Supabase stack (Docker daemon not running); live HTTP tests against Edge Functions (would touch production); DAST. |

A scanner's clean output is not proof of security; the DB tests cover the paths listed only.

## 6. ASVS 5.0 L2 coverage (chapter level)

| Chapter | Status | Notes |
|---|---|---|
| V1 Encoding & Sanitization | Verified (partial) | React escaping; email templates escape via `escapeHtml`; one `dangerouslySetInnerHTML` (shadcn chart CSS, static). |
| V2 Validation & Business Logic | Verified after fix | SR-05/06/10; public endpoint length caps. |
| V3 Web Frontend Security | **Failed (open)** | CSP has `script-src 'unsafe-inline'`; HSTS lacks `preload` (optional). |
| V4 API & Web Service | Verified (partial) | CORS SR-12; no CSRF exposure (bearer tokens). |
| V5 File Handling | Verified | Private buckets, size/MIME limits, folder-scoped policies, signed URLs. |
| V6 Authentication | **Partially failed** | Fixed SR-02/11; open: leaked-password protection off, email-OTP MFA (not phishing-resistant), password policy min 8 (ASVS recommends ≥ 15 or breach check). |
| V7 Session Management | Unverified | Supabase Auth JWT expiry/refresh rotation/inactivity settings are dashboard-only. MFA bound to `session_id`, 12 h. |
| V8 Authorization | Verified after fix | SR-01/02/03/04/07 with behavioral tests. |
| V9 Self-contained Tokens | Verified (platform) | `getUser()` server-side validation in Edge Functions. |
| V10 OAuth/OIDC | N/A | No social login; FedPat is server-to-server client credentials. |
| V11 Cryptography | Verified after fix | CSPRNG, unbiased codes, SHA-256 code hashes, constant-time compares. |
| V12 Secure Communication | Verified (config) | HTTPS only, HSTS 1 y. |
| V13 Configuration | Partially | Secrets server-side; `pg_net` in `public`; no CI pipeline in repo. |
| V14 Data Protection | Partially | PII now MFA-gated for admins; retention/deletion policy not defined (permanent delete exists for producers). |
| V15 Secure Coding & Architecture | Verified (partial) | SECURITY DEFINER functions pin `search_path`; dependency issues listed above. |
| V16 Logging & Error Handling | Partially | Generic client errors; `audit_logs` written only by FedPat; admin actions (approve/delete/role) not audit-logged. |

## 7. Open items & exact manual actions

1. **Enable leaked password protection** — Supabase Dashboard → Authentication → Providers/Passwords → “Prevent use of leaked passwords”. Consider min length 12–15.
2. **Review Auth settings** (unverified here): email confirmation required, JWT expiry ≤ 1 h, refresh token rotation + reuse interval, rate limits for sign-in/sign-up/OTP.
3. **CSP rollout** (not changed, would break GA/Botmaker): move the two inline `<script>` blocks in `index.html` to files or hashes, ship `Content-Security-Policy-Report-Only` without `'unsafe-inline'` for 1–2 weeks, then enforce.
4. **zod 3 → 4** upgrade (runtime advisory GHSA-mrhx-c7xc-m3w5; client-side only) and dev tooling majors (vitest 5, typescript-eslint) in a separate PR.
5. **Move `pg_net` out of `public`** (advisor 0014) — coordinate with `request_support_notification_processing()`.
6. **Remove `.cursor/skills/` third-party catalogs from the repo** (untrusted agent instructions; contain example key strings). Not removed here: unrelated to app runtime and possibly in use.
7. **Optional SR-13 hardening:** require a shared secret header from pg_net (Vault secret) and route client kicks through an authenticated path.
8. **Audit-log admin actions** (approve, delete, grant/revoke admin, status changes) from the Edge Functions/RPCs.
9. **Stronger admin MFA:** Supabase TOTP/WebAuthn (AAL2) instead of email codes.
10. **Legacy CRM tables** (`policies`, `claims`, `installments`, `leads`, `quote_requests`, `tasks`, `payment_proofs`; all empty): drop the remaining producer/client UPDATE policies or the tables if the CRM is retired.
11. Add CI (GitHub Actions) running `npm test` so the DB tests guard future migrations.
12. Pre-existing: fix CRLF-sensitive test, tsc/eslint errors.

## 8. Deployment order & rollback

1. **Before:** confirm no `pas_resources.external_url` / `design_resources.editable_url` / `academy_lessons.video_url` outside `http(s)` (checked 2026-11-03: none).
2. **Apply migration** `20261103131256_security_review_hardening.sql` (`supabase db push`). Safe before the function deploy: Edge Functions call `approve_pas_application` as service role.
3. **Smoke test:** admin login → email code → approve a test solicitud, reply to a consulta, edit a resource; producer → edit profile, open a consulta with attachment; Sumate registration with a new email.
4. **Deploy Edge Functions:** `admin-mfa`, `register-pas-application`, `process-support-notifications`, `google-reviews`, `fedpat-sync`, plus all importing `_shared/cors.ts` (`delete-pas-producer`).
5. **Frontend:** merge to `master` (Vercel auto-deploy).
6. Re-run the Supabase security advisor.

**Rollback:** functions — redeploy previous versions; frontend — Vercel instant rollback; database — run `docs/security/rollback_20261103131256_security_review_hardening.sql` (restores prior policies, keeps SR-01's revoke). Admin sessions whose MFA expired will see empty admin lists/RLS errors until they re-enter a code — expected, not a regression.
