# Self-Hosting Kipper Seguros

## Prerequisites
- Docker & Docker Compose **or** Node.js 20+
- A Supabase project (or Lovable Cloud — the backend stays the same)

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |
| `PORT` | Host port for Docker (default `3000`) |

> **Never commit `.env`** — it's git-ignored.

---

## Option A: Docker (recommended)

```bash
cp .env.example .env
# edit .env with your values
docker compose up -d --build
```

The app will be available at `http://localhost:3000`.

## Option B: Manual build

```bash
npm ci
npm run build        # outputs to dist/
npx serve dist -s    # or any static server
```

---

## Reverse Proxy & SSL

Put nginx / Caddy / Traefik in front of the container.

**Caddy example** (auto-SSL):
```
kipper.example.com {
    reverse_proxy localhost:3000
}
```

**nginx example**:
```nginx
server {
    listen 443 ssl;
    server_name kipper.example.com;
    ssl_certificate     /etc/letsencrypt/live/kipper.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kipper.example.com/privkey.pem;
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

---

## Edge Functions

Edge functions (e.g. `fedpat-sync`) run on your Supabase project, not on the Docker container. They deploy automatically through Lovable Cloud, or you can deploy them manually with the Supabase CLI:

```bash
supabase functions deploy fedpat-sync --project-ref <your-project-id>
```

## Backups

- **Database**: Use `pg_dump` via `supabase db dump` or schedule backups in the Supabase dashboard.
- **Storage**: Back up the Supabase storage bucket if you use file uploads.

## Logs

- Docker: `docker compose logs -f web`
- Edge functions: visible in the Supabase dashboard → Logs → Edge Functions.
