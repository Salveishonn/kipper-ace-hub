-- Explicit deny policies (default-deny already, but documents intent for advisors)
-- plus pg_net grants and revoke of unused anon RPC.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA net TO postgres, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION net.http_post(text, jsonb, jsonb, jsonb, integer) TO postgres, service_role';
  END IF;
END $$;

DROP POLICY IF EXISTS "no client access to notification_outbox" ON public.notification_outbox;
CREATE POLICY "no client access to notification_outbox"
  ON public.notification_outbox
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "no client access to admin_mfa_challenges" ON public.admin_mfa_challenges;
CREATE POLICY "no client access to admin_mfa_challenges"
  ON public.admin_mfa_challenges
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "no client access to admin_mfa_verifications" ON public.admin_mfa_verifications;
CREATE POLICY "no client access to admin_mfa_verifications"
  ON public.admin_mfa_verifications
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON FUNCTION public.get_my_producer_application() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_producer_application() TO authenticated;
