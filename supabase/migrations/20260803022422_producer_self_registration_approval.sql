-- Producer self-registration + admin approval (no invite for new applicants)
--
-- New lifecycle:
--   pending → (admin approves) → activo  |  rechazado
-- Legacy invite lifecycle retained:
--   nuevo | en_revision → invitado → activo (email confirmed via invite trigger)

-- ===== Status + approval audit columns =====
ALTER TABLE public.producer_applications
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.producer_applications DROP CONSTRAINT IF EXISTS producer_applications_status_check;
ALTER TABLE public.producer_applications
  ADD CONSTRAINT producer_applications_status_check
  CHECK (status IN (
    'pending',
    'nuevo',
    'en_revision',
    'aprobado',
    'rechazado',
    'invitado',
    'activo'
  ));

ALTER TABLE public.producer_applications
  ALTER COLUMN status SET DEFAULT 'pending';

-- Normalize open legacy rows that already have an Auth user into the new pending state.
UPDATE public.producer_applications
SET status = 'pending'
WHERE status IN ('nuevo', 'en_revision', 'aprobado')
  AND user_id IS NOT NULL;

-- ===== Drop insecure public INSERT path (registration goes through Edge Function / trigger) =====
DROP POLICY IF EXISTS "Anyone can submit producer_applications" ON public.producer_applications;
REVOKE INSERT ON public.producer_applications FROM anon;

-- Authenticated applicants may still not insert directly; service_role / SECURITY DEFINER only.
REVOKE INSERT ON public.producer_applications FROM authenticated;

-- Applicants may read only their own application (status screen).
DROP POLICY IF EXISTS "Users read own producer_applications" ON public.producer_applications;
CREATE POLICY "Users read own producer_applications"
  ON public.producer_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Keep admin full access (recreate idempotently if missing).
DROP POLICY IF EXISTS "Admin manages producer_applications" ON public.producer_applications;
CREATE POLICY "Admin manages producer_applications"
  ON public.producer_applications
  FOR ALL
  TO public
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ===== Self-registration provisioning (no productor role) =====
CREATE OR REPLACE FUNCTION public.provision_pas_applicant_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  is_applicant boolean := COALESCE((meta->>'pas_applicant')::boolean, false);
  app_full_name text;
  app_phone text;
  app_city text;
  app_province text;
  app_matricula text;
  app_years integer;
  app_companies text;
  app_message text;
BEGIN
  -- Legacy invite path is handled by link_pas_invite_on_auth_insert.
  IF NEW.invited_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NOT is_applicant THEN
    RETURN NEW;
  END IF;

  app_full_name := NULLIF(btrim(COALESCE(meta->>'full_name', '')), '');
  app_phone := NULLIF(btrim(COALESCE(meta->>'phone', '')), '');
  app_city := NULLIF(btrim(COALESCE(meta->>'city', '')), '');
  app_province := NULLIF(btrim(COALESCE(meta->>'province', '')), '');
  app_matricula := NULLIF(btrim(COALESCE(meta->>'matricula_ssn', '')), '');
  app_companies := NULLIF(btrim(COALESCE(meta->>'current_companies', '')), '');
  app_message := NULLIF(btrim(COALESCE(meta->>'message', '')), '');

  BEGIN
    IF meta ? 'years_experience' AND NULLIF(meta->>'years_experience', '') IS NOT NULL THEN
      app_years := (meta->>'years_experience')::integer;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    app_years := NULL;
  END;

  INSERT INTO public.profiles (user_id, email, full_name, phone, city, province, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    app_full_name,
    app_phone,
    app_city,
    app_province,
    'pending'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      city = COALESCE(EXCLUDED.city, public.profiles.city),
      province = COALESCE(EXCLUDED.province, public.profiles.province),
      account_status = CASE
        WHEN public.profiles.account_status = 'active' THEN public.profiles.account_status
        ELSE 'pending'
      END,
      updated_at = now();

  IF NOT EXISTS (
    SELECT 1
    FROM public.producer_applications
    WHERE user_id = NEW.id
       OR lower(email) = lower(NEW.email)
  ) THEN
    INSERT INTO public.producer_applications (
      full_name,
      email,
      phone,
      matricula_ssn,
      city,
      province,
      years_experience,
      current_companies,
      message,
      status,
      user_id
    )
    VALUES (
      COALESCE(app_full_name, split_part(NEW.email, '@', 1)),
      NEW.email,
      app_phone,
      app_matricula,
      app_city,
      app_province,
      app_years,
      app_companies,
      app_message,
      'pending',
      NEW.id
    );
  ELSE
    -- Link an existing open application that was created without Auth (legacy).
    UPDATE public.producer_applications
    SET user_id = NEW.id,
        status = CASE
          WHEN status IN ('nuevo', 'en_revision', 'aprobado', 'pending') THEN 'pending'
          ELSE status
        END,
        updated_at = now()
    WHERE lower(email) = lower(NEW.email)
      AND user_id IS NULL
      AND status IN ('nuevo', 'en_revision', 'aprobado', 'pending');
  END IF;

  -- Never grant productor here.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_provision_pas_applicant ON auth.users;
CREATE TRIGGER on_auth_user_provision_pas_applicant
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.provision_pas_applicant_on_signup();

-- ===== Idempotent approval helper (callable by Edge Function / service role) =====
CREATE OR REPLACE FUNCTION public.approve_pas_application(
  p_application_id uuid,
  p_admin_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_row public.producer_applications%ROWTYPE;
  already_productor boolean := false;
BEGIN
  IF p_admin_user_id IS NULL OR NOT public.has_role(p_admin_user_id, 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO app_row
  FROM public.producer_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF app_row.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF app_row.status = 'rechazado' THEN
    RAISE EXCEPTION 'REJECTED' USING ERRCODE = '22023';
  END IF;

  IF app_row.user_id IS NULL THEN
    RAISE EXCEPTION 'NO_AUTH_USER' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = app_row.user_id AND role = 'productor'
  ) INTO already_productor;

  -- Idempotent: already active + role → success without duplicating.
  IF app_row.status = 'activo' AND already_productor THEN
    UPDATE public.profiles
    SET account_status = 'active',
        updated_at = now()
    WHERE user_id = app_row.user_id
      AND account_status IS DISTINCT FROM 'active';

    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'application_id', app_row.id,
      'user_id', app_row.user_id,
      'status', 'activo'
    );
  END IF;

  IF app_row.status NOT IN ('pending', 'nuevo', 'en_revision', 'aprobado', 'invitado')
     AND NOT (app_row.status = 'activo' AND NOT already_productor) THEN
    RAISE EXCEPTION 'INVALID_STATUS' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (app_row.user_id, 'productor')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.profiles (user_id, email, full_name, account_status)
  VALUES (
    app_row.user_id,
    app_row.email,
    app_row.full_name,
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET account_status = 'active',
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email),
      updated_at = now();

  UPDATE public.producer_applications
  SET status = 'activo',
      approved_at = COALESCE(approved_at, now()),
      approved_by = COALESCE(approved_by, p_admin_user_id),
      reviewed_at = COALESCE(reviewed_at, now()),
      reviewed_by = COALESCE(reviewed_by, p_admin_user_id),
      updated_at = now()
  WHERE id = app_row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', already_productor AND app_row.status = 'activo',
    'application_id', app_row.id,
    'user_id', app_row.user_id,
    'status', 'activo',
    'full_name', app_row.full_name,
    'email', app_row.email
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_pas_application(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_pas_application(uuid, uuid) TO service_role;

-- Helper: own application status for pending screen (defense in depth alongside RLS).
CREATE OR REPLACE FUNCTION public.get_my_producer_application()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  status text,
  created_at timestamptz,
  approved_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.email, a.full_name, a.status, a.created_at, a.approved_at
  FROM public.producer_applications a
  WHERE a.user_id = auth.uid()
  ORDER BY a.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_producer_application() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_producer_application() TO authenticated;
