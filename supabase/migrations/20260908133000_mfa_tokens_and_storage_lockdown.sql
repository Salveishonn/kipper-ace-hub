-- Close remaining MFA bypasses, lock FedPat tokens, and stop payment-proof oversharing.

DROP POLICY IF EXISTS "Admin can manage all roles" ON public.user_roles;
CREATE POLICY "Admin can manage all roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_admin_session())
  WITH CHECK (public.is_admin_session());

DROP POLICY IF EXISTS "Admin only access to integration_tokens" ON public.integration_tokens;
REVOKE ALL ON TABLE public.integration_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.integration_tokens TO service_role;
CREATE POLICY "no client access to integration_tokens"
  ON public.integration_tokens
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Admin only access to integration_runs" ON public.integration_runs;
CREATE POLICY "Admins can read integration_runs"
  ON public.integration_runs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.revoke_pas_producer(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL OR NOT public.is_admin_session() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_USER' USING ERRCODE = '22023';
  END IF;

  IF public.has_role(p_user_id, 'admin') THEN
    RAISE EXCEPTION 'CANNOT_REVOKE_ADMIN' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET account_status = 'suspended',
      updated_at = now()
  WHERE user_id = p_user_id;

  DELETE FROM public.user_roles
  WHERE user_id = p_user_id
    AND role = 'productor';

  UPDATE public.producer_applications
  SET admin_notes = trim(both FROM concat_ws(
        E'\n',
        NULLIF(admin_notes, ''),
        format('[%s] Acceso suspendido por admin %s', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), caller)
      )),
      updated_at = now()
  WHERE user_id = p_user_id
    AND status = 'activo';

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'account_status', 'suspended'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_pas_producer(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL OR NOT public.is_admin_session() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_USER' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET account_status = 'active',
      updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'productor')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.producer_applications
  SET admin_notes = trim(both FROM concat_ws(
        E'\n',
        NULLIF(admin_notes, ''),
        format('[%s] Acceso reactivado por admin %s', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), caller)
      )),
      updated_at = now()
  WHERE user_id = p_user_id
    AND status = 'activo';

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'account_status', 'active'
  );
END;
$$;

DROP POLICY IF EXISTS "Productores read payment proofs" ON storage.objects;
