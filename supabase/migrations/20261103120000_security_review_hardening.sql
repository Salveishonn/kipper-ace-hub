-- Security review (ASVS 5.0 L2) hardening. See SECURITY_REVIEW.md for findings SR-01..SR-09.
--
-- Deploy order: apply this migration BEFORE deploying the updated Edge Functions.
-- Every change here is additive or narrows access; the frontend needs no change because the
-- admin UI is already gated behind the email MFA step (resolvePostAuthDestination).
-- Rollback: re-run the CREATE POLICY / GRANT statements of the earlier migrations named per section.

-- ===== SR-01: approve_pas_application was callable by any signed-in user =====
-- Supabase grants EXECUTE to anon/authenticated directly, so REVOKE ... FROM PUBLIC (20260803022422)
-- left `authenticated` able to call it with any admin's id and approve or self-restore themselves.
REVOKE ALL ON FUNCTION public.approve_pas_application(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_pas_application(uuid, uuid) TO service_role;

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
  -- Defense in depth: an end-user session may only act as itself, with a verified MFA session.
  IF auth.uid() IS NOT NULL
     AND (auth.uid() IS DISTINCT FROM p_admin_user_id OR NOT public.is_admin_session()) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

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

REVOKE ALL ON FUNCTION public.approve_pas_application(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_pas_application(uuid, uuid) TO service_role;

-- has_role(any_user, role) was an anonymous oracle for "is this uuid an admin".
-- Policies call it only through SECURITY DEFINER helpers or TO authenticated policies.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- ===== SR-02: admin writes and PII reads required only a password, not the MFA session =====
-- is_admin() (no MFA) stays for reading portal content an admin also browses as productor.
-- Everything else an admin does through RLS now requires is_admin_session().
DO $$
DECLARE
  t record;
  read_check text;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      -- table, existing admin policy, admin reads hold personal/business data
      ('academy_lessons',     'Admin can manage academy lessons',  false),
      ('academy_modules',     'Admin can manage academy modules',  false),
      ('blog_posts',          'Admin can manage all posts',        false),
      ('design_resources',    'Admin manages design_resources',    false),
      ('pas_resources',       'Admin manages pas_resources',       false),
      ('insurance_companies', 'Admin can manage insurance companies', false),
      ('vehicle_brands',      'Admin can manage vehicle brands',   false),
      ('vehicle_models',      'Admin can manage vehicle models',   false),
      ('audit_logs',          'Admin can view all audit logs',     true),
      ('claims',              'Admin can manage all claims',       true),
      ('contacts',            'Admin can manage all contacts',     true),
      ('installments',        'Admin can manage all installments', true),
      ('leads',               'Admin can manage all leads',        true),
      ('payment_proofs',      'Admin manages payment_proofs',      true),
      ('policies',            'Admin can manage all policies',     true),
      ('producer_applications', 'Admin manages producer_applications', true),
      ('profiles',            'Admin can manage all profiles',     true),
      ('quote_requests',      'Admin manages quote_requests',      true),
      ('support_messages',    'Admin manages all support_messages', true),
      ('support_tickets',     'Admin manages all support_tickets', true),
      ('tasks',               'Admin can manage all tasks',        true)
    ) AS v(tbl, pol, pii)
  LOOP
    read_check := CASE WHEN t.pii THEN 'public.is_admin_session()' ELSE 'public.is_admin()' END;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t.pol, t.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin reads ' || t.tbl, t.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin MFA inserts ' || t.tbl, t.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin MFA updates ' || t.tbl, t.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin MFA deletes ' || t.tbl, t.tbl);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)',
      'Admin reads ' || t.tbl, t.tbl, read_check);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin_session())',
      'Admin MFA inserts ' || t.tbl, t.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin_session()) WITH CHECK (public.is_admin_session())',
      'Admin MFA updates ' || t.tbl, t.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin_session())',
      'Admin MFA deletes ' || t.tbl, t.tbl);
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Admins can read integration_runs" ON public.integration_runs;
CREATE POLICY "Admins can read integration_runs"
  ON public.integration_runs FOR SELECT TO authenticated
  USING (public.is_admin_session());

-- Storage: content buckets keep password-only admin reads (productor read policies already
-- include is_admin()); every admin write and every read of personal uploads needs MFA.
DROP POLICY IF EXISTS "Admin manages academy files" ON storage.objects;
DROP POLICY IF EXISTS "Admin manages design-resources storage" ON storage.objects;
DROP POLICY IF EXISTS "Admin manages pas-resources storage" ON storage.objects;
DROP POLICY IF EXISTS "Admin manages consulta attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admin reads payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admin reads quote files" ON storage.objects;
DROP POLICY IF EXISTS "Admin MFA manages admin buckets" ON storage.objects;
DROP POLICY IF EXISTS "Admin MFA reads personal uploads" ON storage.objects;

CREATE POLICY "Admin MFA manages admin buckets"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id IN ('academy-files', 'design-resources', 'pas-resources', 'consulta-attachments')
    AND public.is_admin_session()
  )
  WITH CHECK (
    bucket_id IN ('academy-files', 'design-resources', 'pas-resources', 'consulta-attachments')
    AND public.is_admin_session()
  );

CREATE POLICY "Admin MFA reads personal uploads"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN ('payment-proofs', 'quote-uploads')
    AND public.is_admin_session()
  );

-- Team read marker on consultas follows the same rule.
CREATE OR REPLACE FUNCTION public.mark_support_ticket_read(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
  SET producer_last_read_at = CASE WHEN producer_id = auth.uid() THEN now() ELSE producer_last_read_at END,
      team_last_read_at = CASE WHEN producer_id <> auth.uid() THEN now() ELSE team_last_read_at END
  WHERE id = p_ticket_id
    AND (producer_id = auth.uid() OR public.is_admin_session());
END;
$$;

REVOKE ALL ON FUNCTION public.mark_support_ticket_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_support_ticket_read(uuid) TO authenticated;

-- ===== SR-03: producers could read any user's profile through the legacy CRM tables =====
-- "Productores can insert policies" only checked is_productor(), so a producer could insert a policy
-- for any user_id assigned to themselves and then read that user's profile (DNI, address, phone).
-- The CRM tables are written only by the service-role FedPat sync.
DROP POLICY IF EXISTS "Productores can insert policies" ON public.policies;

DROP POLICY IF EXISTS "Productores can view client profiles" ON public.profiles;
CREATE POLICY "Productores can view client profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_productor()
    AND public.has_role(profiles.user_id, 'cliente')
    AND EXISTS (
      SELECT 1 FROM public.policies
      WHERE policies.user_id = profiles.user_id
        AND policies.assigned_productor_id = auth.uid()
    )
  );

-- ===== SR-04: profile fields that drive identity and notifications =====
-- Users could change their own profiles.email (notification recipient, admin identity column)
-- and insert a profile already marked active.
CREATE OR REPLACE FUNCTION public.protect_profile_account_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-role / auth triggers (auth.uid() null) and MFA admin sessions are trusted.
  IF auth.uid() IS NULL OR public.is_admin_session() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.account_status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Solo un administrador puede cambiar account_status';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Solo un administrador puede cambiar account_status';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'El email del perfil solo se cambia desde la cuenta';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile_account_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_profile_account_status_trg ON public.profiles;
CREATE TRIGGER protect_profile_account_status_trg
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_account_status();

-- ===== SR-05: consultas mass assignment =====
-- Producers could open a case already resolved/closed by someone else, and attach any
-- object path (e.g. another case's file) to their message.
DROP POLICY IF EXISTS "Producer inserts own support_tickets" ON public.support_tickets;
CREATE POLICY "Producer inserts own support_tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = producer_id
    AND public.is_productor()
    AND status = 'abierto'
    AND resolved_by IS NULL AND resolved_at IS NULL
    AND closed_by IS NULL AND closed_at IS NULL
  );

DROP POLICY IF EXISTS "Producer inserts messages on own open tickets" ON public.support_messages;
CREATE POLICY "Producer inserts messages on own open tickets"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_user_id
    AND public.is_productor()
    AND (
      attachment_path IS NULL
      OR left(attachment_path, 74) = ticket_id::text || '/' || auth.uid()::text || '/'
    )
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id
        AND t.producer_id = auth.uid()
        AND t.status IN ('abierto', 'en_gestion', 'resuelto')
    )
  );

-- ===== SR-06: anonymous inserts could pre-assign rows to producers or forge audit entries =====
DROP POLICY IF EXISTS "Anyone can create leads (cotizador)" ON public.leads;
CREATE POLICY "Anyone can create leads (cotizador)"
  ON public.leads FOR INSERT TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL AND length(email) <= 320
    AND full_name IS NOT NULL AND length(full_name) <= 200
    AND length(COALESCE(notes, '')) <= 5000
    AND status = 'nuevo'
    AND assigned_productor_id IS NULL
    AND (user_id IS NULL OR user_id = auth.uid())
    AND (documents IS NULL OR documents = '[]'::jsonb)
  );

DROP POLICY IF EXISTS "Anyone can create quote_requests" ON public.quote_requests;
CREATE POLICY "Anyone can create quote_requests"
  ON public.quote_requests FOR INSERT TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL AND length(email) <= 320
    AND full_name IS NOT NULL AND length(full_name) <= 200
    AND length(COALESCE(message, '')) <= 5000
    AND status = 'nuevo'
    AND assigned_productor_id IS NULL
    AND (user_id IS NULL OR user_id = auth.uid())
    AND (documents IS NULL OR documents = '[]'::jsonb)
  );

DROP POLICY IF EXISTS "Anyone can create contacts" ON public.contacts;
CREATE POLICY "Anyone can create contacts"
  ON public.contacts FOR INSERT TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL AND length(email) <= 320
    AND length(COALESCE(full_name, '')) <= 200
    AND (tags IS NULL OR tags = '{}'::text[])
  );

-- Audit entries are written only by Edge Functions (service role).
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Productores can insert audit logs" ON public.audit_logs;

-- ===== SR-07: any signed-in account could list every user id through the avatars bucket =====
DROP POLICY IF EXISTS "Authenticated read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Portal members read avatars" ON storage.objects;
CREATE POLICY "Portal members read avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_productor()
      OR public.is_admin()
    )
  );

-- ===== SR-09: admin-entered links are opened/embedded for every producer =====
-- Only http(s); a javascript: or data: URL would run in the portal's origin.
-- Production data was checked before adding these (all existing values are http/https).
ALTER TABLE public.pas_resources DROP CONSTRAINT IF EXISTS pas_resources_external_url_http;
ALTER TABLE public.pas_resources ADD CONSTRAINT pas_resources_external_url_http
  CHECK (external_url IS NULL OR external_url = '' OR external_url ~* '^https?://');

ALTER TABLE public.design_resources DROP CONSTRAINT IF EXISTS design_resources_editable_url_http;
ALTER TABLE public.design_resources ADD CONSTRAINT design_resources_editable_url_http
  CHECK (editable_url IS NULL OR editable_url = '' OR editable_url ~* '^https?://');

ALTER TABLE public.academy_lessons DROP CONSTRAINT IF EXISTS academy_lessons_video_url_http;
ALTER TABLE public.academy_lessons ADD CONSTRAINT academy_lessons_video_url_http
  CHECK (video_url IS NULL OR video_url = '' OR video_url ~* '^https?://');

-- ===== SR-08: privileges PostgREST never needs =====
-- TRUNCATE ignores RLS; it is not reachable through PostgREST, but no client role should hold it.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
