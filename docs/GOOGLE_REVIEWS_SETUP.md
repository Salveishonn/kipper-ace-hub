# Google Maps reviews (Places API New)

## Limitación importante

Place Details devuelve **solo un subconjunto limitado** de reseñas. La web muestra esas reseñas en caché y siempre incluye el enlace **“Ver todas las reseñas en Google”**.

## GCP

1. Crear proyecto en Google Cloud.
2. Habilitar **Places API (New)**.
3. Crear API key restringida **solo** a Places API (New). No usar restricción por referrer HTTP (las llamadas salen desde Supabase Edge Functions).

## Supabase secrets

En el proyecto Supabase (Edge Functions):

- `GOOGLE_PLACE_ID` — ID del lugar en Google Maps
- `GOOGLE_PLACES_API_KEY` — clave restringida a Places API
- `SITE_URL` — origen del sitio (invites PAS; ej. `https://kipperseguros.com.ar`)

## Funciones

- `google-reviews` — actualiza `google_reviews_cache`
- `invite-pas-producer` — invitación admin-only vía `inviteUserByEmail`

Desplegar:

```bash
supabase functions deploy google-reviews
supabase functions deploy invite-pas-producer
```

## Frontend

`TestimonialsSection` lee la tabla `google_reviews_cache` o invoca `google-reviews` si no hay caché reciente.
