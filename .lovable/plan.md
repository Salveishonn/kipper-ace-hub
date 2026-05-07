## Federación Patronal Direct API Readiness Sprint

Prepare Kipper for direct integration with the official Federación Patronal APIs. No AbsaNET wording. Server-side only credentials. Mock mode for testing today; sandbox/production placeholders for later.

### 1. Database migration (single migration)

Add/ensure sync metadata columns and tables:

- `policies`: add `external_customer_id`, ensure `sync_status` constraint (`manual|pending|synced|error`), keep existing `external_source`, `external_policy_id`, `last_synced_at`, `sync_error`.
- `installments`: add `external_source`, `sync_status`, `sync_error` (keep existing `external_installment_id`, `last_synced_at`).
- `claims`: add `external_source`, `sync_status`, `sync_error` (keep existing `external_claim_id`, `last_synced_at`).
- New `policy_documents` table with all fields specified, RLS: admin manage; productores read assigned; clients read own.
- `integration_runs`: add `created_by uuid` column if missing.
- `integration_tokens`: ensure `updated_at` column.
- New `external_identity_matches` table, admin-only RLS (clients table doesn't exist; reference `profiles` only — drop the `client_id` reference and store only `profile_id`).

Constraints implemented as triggers (not CHECK with mutable expressions) per project rules — but these are static enums so CHECK is fine.

### 2. Edge Function refactor — `supabase/functions/fedpat-sync/`

Split into modules:

- `index.ts` — request router, auth/admin guard, CORS, rate limit, dispatches to action handlers
- `auth.ts` — `getUserAndAdmin()`, `getAdminClient()`
- `client.ts` — `fetchOAuthToken()`, `callFedPatPoliciesEndpoint()`, `callFedPatInstallmentsEndpoint()`, `callFedPatDocumentsEndpoint()`, `callFedPatClaimsEndpoint()` — all TODO placeholders
- `types.ts` — FedPat payload shapes + Kipper row shapes
- `mappers.ts` — `mapFedPatPolicy`, `mapFedPatInstallment`, `mapFedPatDocument`, `mapFedPatClaim`, `matchFedPatPolicyToKipperClient`
- `syncPolicies.ts`, `syncInstallments.ts`, `syncDocuments.ts`, `syncClaims.ts` — each handles mock + real branches, upserts via service role, writes audit + run rows
- `utils.ts` — ok()/error() responses, configured-check, audit log helper, run helper

Actions: `check-status`, `test-token`, `sync-policies`, `sync-installments`, `sync-documents`, `sync-claims`, `sync-full`.

CORS: explicit allowed origins list (not `*`), echo origin if allowed.

Modes: `mock` | `sandbox` | `production`. Sandbox/production with missing creds → `{status:"not_configured"}` 200.

Mock mode: generates fedpat-prefixed external IDs, inserts policies/installments/documents/claims, creates `external_identity_matches` rows when no profile match, writes audit_logs + integration_runs.

### 3. Admin Integration Center UI — `src/pages/admin/AdminIntegraciones.tsx`

Rewrite with sections:

- **Estado**: mode badge, configured y/n, last token refresh, last successful run, last failed run.
- **Acciones manuales**: 6 buttons (Probar conexión, Sincronizar pólizas/cuotas/documentos/siniestros, Sincronización completa).
- **Logs de sincronización**: filterable table from `integration_runs`.
- **Pendientes de vinculación**: list `external_identity_matches` where `status='needs_review'`, with "Vincular a cliente existente" and "Crear cliente desde datos externos" actions.
- **Mapeo de datos**: static checklist (FedPat pólizas → policies, etc).

All wording: "Federación Patronal" / "FedPat".

### 4. Acceptance check

- Build passes without FedPat secrets.
- `/admin/integraciones` loads in mock mode and runs each sync.
- Frontend has zero references to FedPat secrets or AbsaNET.
- Audit logs + integration_runs entries created on every action.

### Technical details

- Reuse `supabase.functions.invoke('fedpat-sync', { body: { action, ... } })` from frontend.
- Service-role client used inside edge functions for upserts.
- Upsert keys: `policies` on `external_policy_id`, `installments` on `external_installment_id`, `policy_documents` on `external_document_id`, `claims` on `external_claim_id`.
- `policy_documents` stored under `policies.documents` jsonb is replaced with a normalized table; existing jsonb column kept untouched for backward compatibility.
- `external_identity_matches.profile_id` only (no `clients` table exists in this DB).

After plan approval I'll: (1) run migration, (2) refactor edge function into modules, (3) rewrite AdminIntegraciones page.
