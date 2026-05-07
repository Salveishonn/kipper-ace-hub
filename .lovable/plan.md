# Sprint: Public Site + Leads + Academy + Pre-FedPat UX

This sprint is large. To ship it without breaking the existing app or FedPat work, I'll execute it in **phased batches**, each independently shippable. I'll confirm phase 1 before going deep into phases 2–5.

## Guardrails (apply to all phases)
- Do **not** modify FedPat edge functions, mappers, or sync logic.
- No AbsaNET references; brand color `#7D0909`; copy in Spanish (Argentina).
- Every CTA either works or opens a "Próximamente" modal with a real fallback (WhatsApp / contact / cotizar).
- All forms use zod validation + sonner toast feedback.
- GA4 events: thin `trackEvent(name, params)` helper that no-ops if `window.gtag` undefined.
- SEO: per-page `<title>`, meta description, OG tags via a small `<Seo />` component (no extra deps, just `useEffect` + `document.head`).

## DB changes (single migration, phase 1)
New tables:
- `quote_requests` — unified lead/quote intake from all landings, /cotizar, portal "solicitar póliza".
  Fields: id, ramo, full_name, email, phone, dni?, city?, province?, vehicle_{brand,model,year,version,use}?, coverage_type?, message?, documents jsonb, status (`nuevo|asignado|cotizando|cotizado|cerrado|descartado`), assigned_productor_id?, user_id?, source, created_at, updated_at.
  RLS: anon INSERT (email + full_name not null); admin ALL; productor SELECT/UPDATE where assigned; cliente SELECT own.
- `producer_applications` — /sumate submissions.
  Fields: name, email, phone, matricula_ssn?, city?, province?, years_experience?, current_companies?, message, status, created_at.
  RLS: anon INSERT; admin ALL.
- `payment_proofs` — manual "Avisar pago".
  Fields: installment_id, user_id, amount?, paid_at?, file_path, notes?, status (`pendiente|aprobado|rechazado`), reviewed_by?, reviewed_at?, created_at.
  RLS: cliente INSERT/SELECT own (via installments→policies.user_id); productor SELECT for assigned; admin ALL.
- Storage buckets: `quote-uploads` (private), `payment-proofs` (private), `academy-files` (private, signed URLs for producers/admin).

## Phase 1 — Foundations (this turn after approval)
1. Migration: tables + RLS + buckets + bucket policies.
2. Helpers: `src/lib/analytics.ts` (`trackEvent`), `src/components/Seo.tsx`, `src/components/ComingSoonModal.tsx`, `src/components/forms/QuoteLeadForm.tsx` (reusable ramo-bound form).
3. Hooks: `useQuoteRequests`, `useProducerApplications`, `usePaymentProofs`.
4. Wire `App.tsx` routes for the 6 ramo landings + ensure no dead nav links.

## Phase 2 — Public site & landings
- Rewrite `Index.tsx` hero/sections per spec (asegurados, productores, Academy blocks, 3 CTAs).
- Improve `Servicios`, `Nosotros`, `Comunidad`, `Contacto`.
- New pages: `SeguroAuto`, `SeguroMoto`, `SeguroHogar`, `SeguroComercio`, `SeguroAccidentesPersonales`, `SeguroVida` — shared `<RamoLandingTemplate />` (H1, coverage, benefits, FAQ accordion, lead form, WhatsApp CTA, SEO).
- `/cotizar`: convert to multi-step wizard (ramo → vehicle/-→ coverage → personal → uploads → confirm), saves to `quote_requests`, fires `quote_started` / `quote_request_submitted`.
- `/sumate`: full form → `producer_applications` + `contacts` tag `producer_candidate`.

## Phase 3 — Academy
- Migration already has `academy_modules`/`academy_lessons` (verified). Add `chat` and `pdf` to `type` (currently text). Add storage policies for `academy-files`.
- `/academy/contenido`: list modules; `/academy/:moduleSlug/:lessonSlug`: render by type (video iframe, chat transcript, PDF link). Gate: producer/admin → full; others → paywall card "Próximamente suscripción" with CTA to /sumate.
- `/admin/academy`: CRUD modules + lessons + upload to bucket + publish toggle.
- Link `/productor/tutoriales` to Academy.

## Phase 4 — Client portal (manual data)
- `/portal` dashboard: next payment, active policies, pending docs, open claims, "Solicitar nueva póliza" CTA.
- `/portal/polizas/:id` detail: documents list, installments, source badge ("Manual" vs "Federación Patronal").
- `/portal/pagos`: per-installment "Avisar pago" → upload modal → `payment_proofs` row, toast.
- `/portal/siniestros`: existing create flow audited; ensure file upload works.
- `/portal/solicitudes`: new policy request → `quote_requests`.

## Phase 5 — Admin operational
- `/admin` dashboard cards: pending quote requests, open claims, pending proofs, expiring policies (30d), pending tasks, contacts count.
- `/admin/solicitudes`: list `quote_requests`, filter ramo/status, assign producer, status update, "convert to client" (creates profile shell + policy draft).
- `/admin/polizas`: existing create form; add document upload + "generar cuotas" (N installments based on premium + frequency).
- `/admin/pagos`: tabs Installments | Payment Proofs (approve/reject → updates installment).
- `/admin/siniestros`, `/admin/contactos` (CSV export), `/admin/productores` audit pass.

## Out of scope (explicit)
- Real price calculation or FedPat price comparisons.
- Real subscription/payments for Academy.
- FedPat real API calls (kept in mock until creds arrive).

## Technical notes
- All new pages wrapped in `<MainLayout>` + `<Seo />`.
- RamoLandingTemplate accepts `{ramo, title, description, benefits[], faqs[], heroImage?}` for DRY.
- Wizard state: local `useState`, no extra deps.
- File uploads: `supabase.storage.from(bucket).upload(\`\${user.id}/\${uuid}-\${name}\`)`, save returned path; signed URL on read.
- Source badge derives from `policies.external_source` ("fedpat" → "Federación Patronal", else "Manual").

## Acceptance map
Each spec item (1)–(11) maps to a phase above and will be re-verified at end of phase 5.

---

**Recommendation:** Approve to start with **Phase 1 (migration + shared helpers + routing scaffolding)**. After that lands cleanly I'll proceed phase-by-phase in subsequent turns to keep diffs reviewable. If you'd rather I push all 5 phases in one mega-turn, say so and I'll do it (higher risk of partial breakage).