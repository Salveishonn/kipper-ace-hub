# Google Reviews — 12h automatic refresh

The public site reads only `google_reviews_cache`. The `google-reviews` Edge Function
fetches up to 5 reviews from Places API (New) and upserts the cache.

## Edge Function secrets (Dashboard)

Project: `qefzutfaawsegmwgaynj`

Set / confirm:

| Secret | Purpose |
|--------|---------|
| `GOOGLE_PLACE_ID` | Kipper Place ID (`ChIJ…`, not a Maps URL) |
| `GOOGLE_PLACES_API_KEY` | API key restricted to Places API (New) |
| `CRON_SECRET` | Long random string for scheduled calls |
| `SUPABASE_URL` | Usually auto-injected |
| `SUPABASE_SERVICE_ROLE_KEY` | Usually auto-injected |
| `SUPABASE_ANON_KEY` | Needed for admin JWT diagnostic path |

Never put `CRON_SECRET` or Google keys in `VITE_*` or git.

## Deploy the function

```bash
npx supabase functions deploy google-reviews --project-ref qefzutfaawsegmwgaynj
```

`verify_jwt` stays `false` in `supabase/config.toml` so Cron can call with
`x-cron-secret` (admin JWT is validated inside the function when that header is absent).

## Create the Cron job (one-time, Dashboard)

Supabase Dashboard → **Integrations** → **Cron** (or Database → Cron):

1. **Name:** `refresh-google-reviews`
2. **Schedule:** `0 */12 * * *` (every 12 hours)
3. **Type:** HTTP request via `pg_net` to:

   `https://qefzutfaawsegmwgaynj.supabase.co/functions/v1/google-reviews`

4. **Method:** `POST`
5. **Headers:**
   - `Content-Type: application/json`
   - `x-cron-secret: <same value as CRON_SECRET>`
   - `Authorization: Bearer <SUPABASE_ANON_KEY or service role>` (if your Cron UI requires it)
6. **Body:** `{}` (empty JSON is fine; presence of `x-cron-secret` triggers refresh)

### SQL alternative (pg_cron + pg_net)

Only after storing the secret in Vault — **do not commit the real secret**:

```sql
-- Example sketch — replace secret/URL via Vault or Dashboard, never hardcode in git.
select cron.schedule(
  'refresh-google-reviews',
  '0 */12 * * *',
  $$
  select net.http_post(
    url := 'https://qefzutfaawsegmwgaynj.supabase.co/functions/v1/google-reviews',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<FROM_VAULT_OR_DASHBOARD>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## Initial population

After deploy, either:

1. Cron → **Run now**, or
2. Admin → Configuración → **Reintentar ahora** (shown when cache is empty or last diagnostic failed)

Afterwards Cron refreshes every 12 hours with no admin action.

## Cache schema (remote)

```
google_reviews_cache
  place_id text UNIQUE
  reviews_json jsonb
  maps_url text
  rating numeric
  user_ratings_total integer
  fetched_at timestamptz
```

Public SELECT for `anon` / `authenticated`. Writes via service role only.
