-- Rollback for supabase/migrations/20261103131256_security_review_hardening.sql.
-- Restores the access rules that existing before it. Re-opens SR-01..SR-09; use only to unblock
-- an outage, then re-apply a corrected migration. Not a migration: run it by hand (SQL editor).
-- approve_pas_application keeps its new in-function guard; only the grant is left as it was.

BEGIN;

-- SR-02: single FOR ALL admin policies on is_admin()
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('academy_lessons',     'Admin can manage academy lessons',  false),
      ('academy_modules',     'Admin can manage academy modules',  false),
      ('blog_posts',          'Admin can manage all posts',        false),
      ('design_resources',    'Admin manages design_resources',    true),
      ('pas_resources',       'Admin manages pas_resources',       true),
      ('insurance_companies', 'Admin can manage insurance companies', false),
      ('vehicle_brands',      'Admin can manage vehicle brands',   false),
      ('vehicle_models',      'Admin can manage vehicle models',   false),
      ('audit_logs',          'Admin can view all audit logs',     false),
      ('claims',              'Admin can manage all claims',       false),
      ('contacts',            'Admin can manage all contacts',     false),
      ('installments',        'Admin can manage all installments', false),
      ('leads',               'Admin can manage all leads',        false),
      ('payment_proofs',      'Admin manages payment_proofs',      false),
      ('policies',            'Admin can manage all policies',     false),
      ('producer_applications', 'Admin manages producer_applications', true),
      ('profiles',            'Admin can manage all profiles',     false),
      ('quote_requests',      'Admin manages quote_requests',      false),
      ('support_messages',    'Admin manages all support_messages', true),
      ('support_tickets',     'Admin manages all support_tickets', true),
      ('tasks',               'Admin can manage all tasks',        false)
    ) AS v(tbl, pol, with_check)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin reads ' || t.tbl, t.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin MFA inserts ' || t.tbl, t.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin MFA updates ' || t.tbl, t.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin MFA deletes ' || t.tbl, t.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t.pol, t.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin())%s',
      t.pol, t.tbl, CASE WHEN t.with_check THEN ' WITH CHECK (public.is_admin())' ELSE '' END);
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Admins can read integration_runs" ON public.integration_runs;
CREATE POLICY "Admins can read integration_runs" ON public.integration_runs
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admin MFA manages admin buckets" ON storage.objects;
DROP POLICY IF EXISTS "Admin MFA reads personal uploads" ON storage.objects;
CREATE POLICY "Admin manages academy files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'academy-files' AND public.is_admin())
  WITH CHECK (bucket_id = 'academy-files' AND public.is_admin());
CREATE POLICY "Admin manages design-resources storage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'design-resources' AND public.is_admin())
  WITH CHECK (bucket_id = 'design-resources' AND public.is_admin());
CREATE POLICY "Admin manages pas-resources storage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'pas-resources' AND public.is_admin())
  WITH CHECK (bucket_id = 'pas-resources' AND public.is_admin());
CREATE POLICY "Admin manages consulta attachments" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'consulta-attachments' AND public.is_admin())
  WITH CHECK (bucket_id = 'consulta-attachments' AND public.is_admin());
CREATE POLICY "Admin reads payment proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.is_admin());
CREATE POLICY "Admin reads quote files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'quote-uploads' AND public.is_admin());

-- SR-03
CREATE POLICY "Productores can insert policies" ON public.policies
  FOR INSERT WITH CHECK (public.is_productor());
DROP POLICY IF EXISTS "Productores can view client profiles" ON public.profiles;
CREATE POLICY "Productores can view client profiles" ON public.profiles
  FOR SELECT USING (
    public.is_productor() AND EXISTS (
      SELECT 1 FROM public.policies
      WHERE policies.user_id = profiles.user_id
        AND policies.assigned_productor_id = auth.uid()
    )
  );

-- SR-04 (body from 20260821160000)
CREATE OR REPLACE FUNCTION public.protect_profile_account_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.account_status IS DISTINCT FROM OLD.account_status
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo un administrador puede cambiar account_status';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_profile_account_status_trg ON public.profiles;
CREATE TRIGGER protect_profile_account_status_trg BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_account_status();

-- SR-05 (bodies from 20260731120000 / 20261031150000)
DROP POLICY IF EXISTS "Producer inserts own support_tickets" ON public.support_tickets;
CREATE POLICY "Producer inserts own support_tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = producer_id AND public.is_productor());
DROP POLICY IF EXISTS "Producer inserts messages on own open tickets" ON public.support_messages;
CREATE POLICY "Producer inserts messages on own open tickets" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = author_user_id AND public.is_productor() AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id AND t.producer_id = auth.uid()
        AND t.status IN ('abierto', 'en_gestion', 'resuelto')
    )
  );

-- SR-06
DROP POLICY IF EXISTS "Anyone can create leads (cotizador)" ON public.leads;
CREATE POLICY "Anyone can create leads (cotizador)" ON public.leads
  FOR INSERT TO anon, authenticated WITH CHECK (email IS NOT NULL AND full_name IS NOT NULL);
DROP POLICY IF EXISTS "Anyone can create quote_requests" ON public.quote_requests;
CREATE POLICY "Anyone can create quote_requests" ON public.quote_requests
  FOR INSERT TO anon, authenticated WITH CHECK (email IS NOT NULL AND full_name IS NOT NULL);
DROP POLICY IF EXISTS "Anyone can create contacts" ON public.contacts;
CREATE POLICY "Anyone can create contacts" ON public.contacts
  FOR INSERT TO anon, authenticated WITH CHECK (email IS NOT NULL);
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND actor_user_id = auth.uid());
CREATE POLICY "Productores can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (public.is_productor() AND actor_user_id = auth.uid());

-- SR-07
DROP POLICY IF EXISTS "Portal members read avatars" ON storage.objects;
CREATE POLICY "Authenticated read avatars" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'avatars');

-- SR-09
ALTER TABLE public.pas_resources DROP CONSTRAINT IF EXISTS pas_resources_external_url_http;
ALTER TABLE public.design_resources DROP CONSTRAINT IF EXISTS design_resources_editable_url_http;
ALTER TABLE public.academy_lessons DROP CONSTRAINT IF EXISTS academy_lessons_video_url_http;

-- SR-01 / SR-08 grants are not restored: granting authenticated EXECUTE on
-- approve_pas_application or TRUNCATE to API roles has no legitimate caller.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;

COMMIT;
