-- Admin email MFA: password is not enough to use admin privileges.
-- A per-session verification (6-digit code emailed via Edge Function) must succeed
-- before public.is_admin() returns true.

CREATE TABLE IF NOT EXISTS public.admin_mfa_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id text NOT NULL DEFAULT '',
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_mfa_challenges_user_created_idx
  ON public.admin_mfa_challenges (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_mfa_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id text NOT NULL DEFAULT '',
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_mfa_verifications
  ADD CONSTRAINT admin_mfa_verifications_user_session_key UNIQUE (user_id, session_id);

CREATE INDEX IF NOT EXISTS admin_mfa_verifications_expires_idx
  ON public.admin_mfa_verifications (expires_at);

ALTER TABLE public.admin_mfa_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_mfa_verifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_mfa_challenges FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.admin_mfa_verifications FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_mfa_challenges TO service_role;
GRANT ALL ON public.admin_mfa_verifications TO service_role;

CREATE OR REPLACE FUNCTION public.admin_mfa_is_verified()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  sid := nullif(auth.jwt() ->> 'session_id', '');

  RETURN EXISTS (
    SELECT 1
    FROM public.admin_mfa_verifications v
    WHERE v.user_id = auth.uid()
      AND v.expires_at > now()
      AND (
        (sid IS NOT NULL AND v.session_id = sid)
        OR (sid IS NULL AND v.session_id = '')
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mfa_is_verified() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mfa_is_verified() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mfa_is_verified() TO service_role;

-- Admin RLS helpers now require a verified MFA session.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
     AND public.admin_mfa_is_verified()
$$;
