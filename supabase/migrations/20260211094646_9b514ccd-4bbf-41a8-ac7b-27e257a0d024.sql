
-- Add sync fields to installments
ALTER TABLE public.installments
ADD COLUMN IF NOT EXISTS external_installment_id TEXT,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Add sync fields to claims
ALTER TABLE public.claims
ADD COLUMN IF NOT EXISTS external_claim_id TEXT,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Add sync_error to policies
ALTER TABLE public.policies
ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- Integration tokens table (server-only, admin-only)
CREATE TABLE public.integration_tokens (
  provider TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'bearer',
  expires_at TIMESTAMP WITH TIME ZONE,
  refreshed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to integration_tokens"
ON public.integration_tokens FOR ALL
USING (public.is_admin());

-- Integration runs table (audit trail for sync operations)
CREATE TABLE public.integration_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  run_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to integration_runs"
ON public.integration_runs FOR ALL
USING (public.is_admin());
