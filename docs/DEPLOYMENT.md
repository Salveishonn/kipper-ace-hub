# Kipper Seguros — Deployment

> Last verified: 2026-08-03 — production on Vercel (`kipperseguros.com`), Lovable unpublished/disconnected, GitHub `master` auto-deploys.

## Architecture

| Layer | System | Notes |
|---|---|---|
| Source of truth | **GitHub** `Salveishonn/kipper-ace-hub` | Do not treat Lovable as source of truth |
| Production branch | **`master`** | GitHub default branch |
| Frontend hosting | **Vercel** project `kipper-ace-hub` | Auto-deploys on every push to `master` |
| Backend | **Supabase** project `qefzutfaawsegmwgaynj` | Auth, Postgres, Storage, Edge Functions |
| Production domain | **https://kipperseguros.com** | Canonical apex; `www` → apex (308) |
| Lovable | **Not required** | Archive / disconnect only after domain cutover |

Preview deployments are created automatically for non-`master` branches and pull requests.

## Local build

```sh
npm ci
npm run build   # outputs static site to dist/
npm test
```

Serve `dist/` with any static host that falls back SPA routes to `index.html`.

## Required public environment variables (Vercel)

Set for **Production**, **Preview**, and **Development**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Optional public overrides: `VITE_SITE_URL`, `VITE_WHATSAPP_NUMBER`, contact/social URLs (see `.env.example`).

**Never** put `SUPABASE_SERVICE_ROLE_KEY`, Google API keys, or cron secrets in Vercel. Those belong only in Supabase Edge Function secrets.

## Edge Functions

```sh
npx supabase functions deploy google-reviews --project-ref qefzutfaawsegmwgaynj
npx supabase functions deploy fedpat-sync --project-ref qefzutfaawsegmwgaynj
npx supabase functions deploy register-pas-application --project-ref qefzutfaawsegmwgaynj
npx supabase functions deploy approve-pas-producer --project-ref qefzutfaawsegmwgaynj
npx supabase functions deploy invite-pas-producer --project-ref qefzutfaawsegmwgaynj
```

Required secrets (Supabase Dashboard → Edge Functions → Secrets, never Vite):

- `SITE_URL=https://kipperseguros.com` (register + approve + legacy invite)
- Optional approval email via Resend:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL` (verified domain sender)

`invite-pas-producer` remains only for legacy applications without an Auth `user_id`.

Apply DB migration:

```sh
npx supabase db push --project-ref qefzutfaawsegmwgaynj
```

## Supabase Auth URLs

Site URL:

```text
https://kipperseguros.com
```

Additional Redirect URLs:

```text
https://kipperseguros.com/**
https://www.kipperseguros.com/**
https://kipper-ace-hub.vercel.app/**
http://localhost:5173/**
http://localhost:8080/**
https://kipperseguros.com/auth/callback
https://kipperseguros.com/restablecer-contrasena
http://localhost:5173/auth/callback
http://localhost:5173/restablecer-contrasena
```

Enable **Confirm email** under Authentication → Providers → Email unless production intentionally disables it.

## DNS

Registrar / DNS host: **Hostinger** (`ns1.dns-parking.com` / `ns2.dns-parking.com`).

Recommended Vercel records (from `vercel domains inspect`):

| Host | Type | Value | Purpose |
|---|---|---|---|
| `@` (`kipperseguros.com`) | A | `76.76.21.21` | Apex → Vercel |
| `www` | A | `76.76.21.21` | www → Vercel (redirects to apex) |

Preserve unrelated MX / TXT / SPF / DKIM / DMARC records. Do not change nameservers unless intentionally moving DNS to Vercel.

## Inspect failed deployments

1. Vercel dashboard → project `kipper-ace-hub` → Deployments
2. Or CLI: `npx vercel ls --scope salveishonn1`
3. Build logs: `npx vercel inspect <deployment-url> --logs --scope salveishonn1`
4. MCP / API: deployment `readyState`, `get_deployment_build_logs`

## Rollback

1. Open the previous READY production deployment in Vercel.
2. Use **Promote to Production** / `npx vercel rollback --scope salveishonn1`.
3. DNS rollback (emergency): restore apex/www A records to the previous Lovable IP only if Lovable is still published as a backup.

Lovable is a temporary rollback host until custom-domain cutover is verified; after disconnect, roll back via Vercel only.

## What not to do

- Do not publish the production frontend through Lovable.
- Do not force-push `master` or delete `main` / `master`.
- Do not put service-role keys in the frontend or Vercel.
