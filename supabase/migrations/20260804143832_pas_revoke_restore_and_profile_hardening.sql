-- PAS revoke/restore + prevent producers from self-changing account_status

-- ===== Harden profiles: non-admins cannot change account_status =====
CREATE OR REPLACE FUNCTION public.protect_profile_account_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.account_status IS DISTINCT FROM OLD.account_status
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN_ACCOUNT_STATUS'
      USING ERRCODE = '42501',
            MESSAGE = 'Solo un administrador puede cambiar account_status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_account_status_trg ON public.profiles;
CREATE TRIGGER protect_profile_account_status_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_account_status();

-- ===== Revoke PAS access (idempotent) =====
CREATE OR REPLACE FUNCTION public.revoke_pas_producer(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
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

-- ===== Restore PAS access (idempotent) =====
CREATE OR REPLACE FUNCTION public.restore_pas_producer(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
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

REVOKE ALL ON FUNCTION public.revoke_pas_producer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_pas_producer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_pas_producer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_pas_producer(uuid) TO authenticated;
