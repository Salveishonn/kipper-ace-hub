# Kipper Seguros

Public website + producer/admin portal for Kipper Seguros.

- **Production:** https://kipperseguros.com  
- **Vercel (direct):** https://kipper-ace-hub.vercel.app  
- **Repo:** https://github.com/Salveishonn/kipper-ace-hub  
- **Production branch:** `master`

## Stack

- Frontend: React, TypeScript, Vite, Tailwind, shadcn/ui  
- Backend: Supabase (Auth, Postgres, Storage, Edge Functions)  
- Hosting: Vercel (GitHub auto-deploy from `master`)

Lovable is **not** part of the production deployment workflow. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Local development

```sh
npm ci
cp .env.example .env   # fill VITE_SUPABASE_* publishable values only
npm run dev
```

```sh
npm test
npm run build
```

## Deploy

Push to `master`. Vercel builds and deploys automatically.

Edge Functions are deployed with the Supabase CLI (see `docs/DEPLOYMENT.md`).

## Federación Patronal

Server-side only via the `fedpat-sync` Edge Function. See [`docs/FEDPAT_COMPLIANCE.md`](docs/FEDPAT_COMPLIANCE.md).
