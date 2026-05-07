# Federación Patronal — Cumplimiento de integración

Esta integración con las APIs oficiales de **Federación Patronal** está diseñada
para cumplir los términos de uso (privacidad, seguridad, no comparativas
públicas) antes de tener credenciales reales.

## Arquitectura segura

```
Frontend Kipper
  → Edge Function `fedpat-sync` (server-side, admin-only)
    → API Federación Patronal (OAuth2 client_credentials)
      → DB interna Kipper (policies / installments / policy_documents / claims)
        → Dashboards y portales privados Kipper
```

**Nunca** el frontend habla directo con FedPat.

## Variables de entorno (server-side only)

Se configuran como **secretos** en Lovable Cloud (no en `.env` ni en el repo):

| Variable | Descripción |
|---|---|
| `FEDPAT_MODE` | `mock` (default) \| `sandbox` \| `production` |
| `FEDPAT_BASE_URL` | URL base de API |
| `FEDPAT_TOKEN_URL` | Endpoint OAuth2 |
| `FEDPAT_CLIENT_ID` | client_id OAuth2 |
| `FEDPAT_CLIENT_SECRET` | client_secret OAuth2 |
| `FEDPAT_USERNAME` | (si aplica) |
| `FEDPAT_PASSWORD` | (si aplica) |
| `FEDPAT_SCOPE` | (si aplica) |

> **Prohibido** crear `VITE_FEDPAT_*` o `NEXT_PUBLIC_FEDPAT_*`.
> **Prohibido** devolver `access_token` al frontend.

## Modos

- **mock** → genera datos realistas localmente, no llama a FedPat.
- **sandbox** → llamadas reales contra entorno de prueba FedPat.
- **production** → llamadas reales contra producción FedPat.

Si `FEDPAT_MODE` ≠ `mock` y faltan credenciales, la función responde
`{status:"not_configured"}` con HTTP 200 (no rompe el panel admin).

## Cómo correr en mock

1. No hace falta configurar nada (mock es el default).
2. Entrar a `/admin/integraciones` como admin.
3. Probar conexión → genera token mock.
4. Sincronizar pólizas / cuotas / documentos / siniestros.
5. Inspeccionar `integration_runs`, `audit_logs`, `external_identity_matches`.

## Cómo cambiar a sandbox

1. Configurar todos los `FEDPAT_*` como secretos server-side.
2. Setear `FEDPAT_MODE=sandbox`.
3. Reemplazar los `TODO` de `supabase/functions/fedpat-sync/client.ts` con los
   endpoints reales según la documentación oficial entregada por Federación.
4. Probar conexión y cada acción de sync.
5. Cuando esté validado, cambiar a `FEDPAT_MODE=production`.

## Uso permitido de los datos

Los datos sincronizados de FedPat **solo** pueden usarse para:

- Comercialización de pólizas Kipper.
- Mantenimiento y gestión administrativa de pólizas.
- Portal privado del asegurado.
- Panel interno de productores y administradores.

## Qué NO hacer

- ❌ Token exchange en el navegador.
- ❌ Exponer `client_secret` en JavaScript cliente.
- ❌ Mostrar tokens en consola, UI, responses al frontend o logs públicos.
- ❌ Comparativas públicas de precios FedPat vs otras aseguradoras.
- ❌ Cotizador público que muestre primas oficiales FedPat.
- ❌ Scraping de portales FedPat.
- ❌ Uso de datos FedPat fuera de gestión / comercialización / mantenimiento.

## Auditoría

Cada acción escribe en `audit_logs`:

- `fedpat.connection_tested`
- `fedpat.token_refreshed`
- `fedpat.sync_started` / `fedpat.sync_success` / `fedpat.sync_failed`
- `fedpat.policy_upserted`
- `fedpat.installment_upserted`
- `fedpat.document_upserted`
- `fedpat.claim_upserted`
- `fedpat.match_created` / `fedpat.manual_match_confirmed`

Los runs se persisten en `integration_runs`.

## Privacidad y RLS

- `integration_tokens`, `integration_runs`, `external_identity_matches`,
  `audit_logs`: **admin only**.
- `policies`, `installments`, `policy_documents`, `claims`: clientes solo ven
  los registros vinculados a su `user_id`; productores solo los asignados;
  admin todo.
- Datos FedPat sincronizados **nunca** se exponen sin autenticación.
