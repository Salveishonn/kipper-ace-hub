-- Admins can grant/revoke the admin role without replacing other roles (e.g. productor).
-- Requires a verified admin MFA session (public.is_admin()).

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
  IF caller IS NULL OR NOT public.is_admin() THEN
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
  IF caller IS NULL OR NOT public.is_admin() THEN
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

REVOKE ALL ON FUNCTION public.grant_admin_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_admin_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_admin_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin_role(uuid) TO authenticated;

-- Sole admin: Salvador. Other admin rows are removed; productor roles are kept.
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::public.app_role
FROM public.profiles p
WHERE lower(p.email) = 'salvadormarin2@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.user_id
  AND ur.role = 'admin'
  AND lower(p.email) <> 'salvadormarin2@gmail.com';
