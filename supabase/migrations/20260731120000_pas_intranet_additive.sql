-- PAS intranet pivot — additive migration (no legacy table drops)
--
-- producer_applications.status lifecycle:
--   nuevo | en_revision → invitado (invite sent) → activo (email confirmed + UPDATE trigger)
--   rechazado = terminal
--   aprobado = legacy only (CHECK retained, not written by new code)

-- ===== profiles.account_status =====
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('pending', 'active', 'suspended'));

-- ===== producer_applications extensions =====
ALTER TABLE public.producer_applications
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.producer_applications DROP CONSTRAINT IF EXISTS producer_applications_status_check;
ALTER TABLE public.producer_applications
  ADD CONSTRAINT producer_applications_status_check
  CHECK (status IN ('nuevo', 'en_revision', 'aprobado', 'rechazado', 'invitado', 'activo'));

-- ===== pas_resources =====
CREATE TABLE IF NOT EXISTS public.pas_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  resource_type text NOT NULL CHECK (resource_type IN ('pdf', 'video', 'image', 'link')),
  file_path text,
  external_url text,
  week_label text,
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pas_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages pas_resources" ON public.pas_resources;
CREATE POLICY "Admin manages pas_resources"
  ON public.pas_resources FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Productores read published pas_resources" ON public.pas_resources;
CREATE POLICY "Productores read published pas_resources"
  ON public.pas_resources FOR SELECT
  USING (public.is_productor() AND published = true);

DROP TRIGGER IF EXISTS update_pas_resources_updated_at ON public.pas_resources;
CREATE TRIGGER update_pas_resources_updated_at
  BEFORE UPDATE ON public.pas_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== support tickets (text-only v1) =====
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'siniestro'
    CHECK (category IN ('siniestro', 'operativo', 'otro')),
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'abierto'
    CHECK (status IN ('abierto', 'en_gestion', 'resuelto', 'cerrado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages all support_tickets" ON public.support_tickets;
CREATE POLICY "Admin manages all support_tickets"
  ON public.support_tickets FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Producer manages own support_tickets" ON public.support_tickets;
CREATE POLICY "Producer manages own support_tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = producer_id);

DROP POLICY IF EXISTS "Producer inserts own support_tickets" ON public.support_tickets;
CREATE POLICY "Producer inserts own support_tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = producer_id AND public.is_productor());

DROP POLICY IF EXISTS "Admin manages all support_messages" ON public.support_messages;
CREATE POLICY "Admin manages all support_messages"
  ON public.support_messages FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Producer reads messages on own tickets" ON public.support_messages;
CREATE POLICY "Producer reads messages on own tickets"
  ON public.support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id AND t.producer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Producer inserts messages on own open tickets" ON public.support_messages;
CREATE POLICY "Producer inserts messages on own open tickets"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    auth.uid() = author_user_id
    AND public.is_productor()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND t.producer_id = auth.uid()
        AND t.status IN ('abierto', 'en_gestion')
    )
  );

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== google reviews cache =====
CREATE TABLE IF NOT EXISTS public.google_reviews_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL UNIQUE,
  reviews_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  maps_url text NOT NULL,
  rating numeric,
  user_ratings_total integer,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_reviews_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read google_reviews_cache" ON public.google_reviews_cache;
CREATE POLICY "Anyone can read google_reviews_cache"
  ON public.google_reviews_cache FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role manages google_reviews_cache" ON public.google_reviews_cache;
CREATE POLICY "Service role manages google_reviews_cache"
  ON public.google_reviews_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===== user_roles: remove cliente self-insert =====
DROP POLICY IF EXISTS "Users can insert default cliente role" ON public.user_roles;

-- ===== storage: pas-resources bucket =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('pas-resources', 'pas-resources', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admin manages pas-resources storage" ON storage.objects;
CREATE POLICY "Admin manages pas-resources storage"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'pas-resources' AND public.is_admin())
  WITH CHECK (bucket_id = 'pas-resources' AND public.is_admin());

DROP POLICY IF EXISTS "Productores read pas-resources storage" ON storage.objects;
CREATE POLICY "Productores read pas-resources storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pas-resources' AND (public.is_productor() OR public.is_admin()));

-- Link pending profile when invite creates unconfirmed auth.users (no productor role yet).
CREATE OR REPLACE FUNCTION public.link_pas_invite_on_auth_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_id uuid;
  app_row public.producer_applications%ROWTYPE;
  meta_full_name text;
  meta_app_id text;
BEGIN
  IF NEW.invited_at IS NULL THEN
    RETURN NEW;
  END IF;

  meta_app_id := NEW.raw_user_meta_data->>'application_id';
  IF meta_app_id IS NULL OR btrim(meta_app_id) = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    app_id := meta_app_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  SELECT * INTO app_row FROM public.producer_applications WHERE id = app_id;
  IF app_row.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF lower(btrim(app_row.email)) <> lower(btrim(NEW.email)) THEN
    RETURN NEW;
  END IF;

  IF app_row.status <> 'invitado' THEN
    RETURN NEW;
  END IF;

  IF app_row.invite_expires_at IS NOT NULL AND app_row.invite_expires_at < now() THEN
    RETURN NEW;
  END IF;

  IF app_row.user_id IS NOT NULL AND app_row.user_id <> NEW.id THEN
    RETURN NEW;
  END IF;

  meta_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  INSERT INTO public.profiles (user_id, email, full_name, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(btrim(COALESCE(meta_full_name, app_row.full_name)), ''),
    'pending'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      account_status = 'pending',
      updated_at = now();

  UPDATE public.producer_applications
  SET user_id = NEW.id,
      updated_at = now()
  WHERE id = app_row.id
    AND status = 'invitado';

  RETURN NEW;
END;
$$;

-- Activate PAS only when invite is accepted (email confirmed).
CREATE OR REPLACE FUNCTION public.activate_pas_on_email_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_id uuid;
  app_row public.producer_applications%ROWTYPE;
  meta_app_id text;
BEGIN
  IF OLD.email_confirmed_at IS NOT NULL OR NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.invited_at IS NULL THEN
    RETURN NEW;
  END IF;

  meta_app_id := NEW.raw_user_meta_data->>'application_id';
  IF meta_app_id IS NULL OR btrim(meta_app_id) = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    app_id := meta_app_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  SELECT * INTO app_row FROM public.producer_applications WHERE id = app_id;
  IF app_row.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF lower(btrim(app_row.email)) <> lower(btrim(NEW.email)) THEN
    RETURN NEW;
  END IF;

  IF app_row.status <> 'invitado' THEN
    RETURN NEW;
  END IF;

  IF app_row.invite_expires_at IS NOT NULL AND app_row.invite_expires_at < now() THEN
    RETURN NEW;
  END IF;

  IF app_row.user_id IS NOT NULL AND app_row.user_id <> NEW.id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'full_name', app_row.full_name)), ''),
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET account_status = 'active',
      updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'productor')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.producer_applications
  SET user_id = NEW.id,
      status = 'activo',
      updated_at = now()
  WHERE id = app_row.id
    AND status = 'invitado';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_provision_pas ON auth.users;
DROP FUNCTION IF EXISTS public.provision_invited_pas_user();

DROP TRIGGER IF EXISTS on_auth_user_link_pas_invite ON auth.users;
CREATE TRIGGER on_auth_user_link_pas_invite
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_pas_invite_on_auth_insert();

DROP TRIGGER IF EXISTS on_auth_user_activate_pas_invite ON auth.users;
CREATE TRIGGER on_auth_user_activate_pas_invite
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_pas_on_email_confirmed();
