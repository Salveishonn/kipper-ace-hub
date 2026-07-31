
-- FedPat upsert keys and sync_status checks (policy_documents omitted: never versioned; PAS intranet has no portal doc sync)

-- Columns present in Lovable/types but missing from earlier versioned migrations
ALTER TABLE public.installments
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS sync_error TEXT,
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'manual';

ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS sync_error TEXT,
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'manual';

-- Unique constraints for upsert keys
CREATE UNIQUE INDEX IF NOT EXISTS policies_external_policy_id_key ON public.policies(external_policy_id) WHERE external_policy_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS installments_external_installment_id_key ON public.installments(external_installment_id) WHERE external_installment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS claims_external_claim_id_key ON public.claims(external_claim_id) WHERE external_claim_id IS NOT NULL;

-- Sync status CHECK constraints (idempotent)
DO $$ BEGIN
  ALTER TABLE public.policies ADD CONSTRAINT policies_sync_status_check CHECK (sync_status IN ('manual','pending','synced','error'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.installments ADD CONSTRAINT installments_sync_status_check CHECK (sync_status IN ('manual','pending','synced','error'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.claims ADD CONSTRAINT claims_sync_status_check CHECK (sync_status IN ('manual','pending','synced','error'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
