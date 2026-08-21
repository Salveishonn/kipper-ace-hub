-- MFA must not hide content. is_admin() is the role check used by RLS reads
-- (academy, files, etc.). Sensitive admin-role changes use is_admin_session().

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_admin_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
     AND public.admin_mfa_is_verified()
$$;

REVOKE ALL ON FUNCTION public.is_admin_session() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_session() TO service_role;

CREATE OR REPLACE FUNCTION public.grant_admin_role(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  already boolean;
BEGIN
  IF caller IS NULL OR NOT public.is_admin_session() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_USER' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin'
  ) INTO already;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'role', 'admin',
    'idempotent', already
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_admin_role(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  admin_count integer;
BEGIN
  IF caller IS NULL OR NOT public.is_admin_session() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_USER' USING ERRCODE = '22023';
  END IF;

  IF p_user_id = caller THEN
    RAISE EXCEPTION 'CANNOT_REVOKE_SELF' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer INTO admin_count
  FROM public.user_roles
  WHERE role = 'admin';

  IF admin_count <= 1 THEN
    RAISE EXCEPTION 'LAST_ADMIN' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = p_user_id
    AND role = 'admin';

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'role', 'admin',
    'revoked', true
  );
END;
$$;
