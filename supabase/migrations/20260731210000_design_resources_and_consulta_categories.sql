-- Functional simplification phase — additive migration.
-- 1) design_resources: branded graphic-template library for productores.
-- 2) support_tickets.category: new controlled category list (legacy values retained for existing rows).

-- ===== design_resources =====
CREATE TABLE IF NOT EXISTS public.design_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  preview_path text,
  download_path text,
  editable_url text,
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.design_resources DROP CONSTRAINT IF EXISTS design_resources_category_check;
ALTER TABLE public.design_resources
  ADD CONSTRAINT design_resources_category_check
  CHECK (category IN (
    'instagram_post',
    'instagram_story',
    'whatsapp_status',
    'flyer',
    'reel_cover',
    'otro'
  ));

ALTER TABLE public.design_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages design_resources" ON public.design_resources;
CREATE POLICY "Admin manages design_resources"
  ON public.design_resources FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Productores read published design_resources" ON public.design_resources;
CREATE POLICY "Productores read published design_resources"
  ON public.design_resources FOR SELECT
  USING (public.is_productor() AND published = true);

DROP TRIGGER IF EXISTS update_design_resources_updated_at ON public.design_resources;
CREATE TRIGGER update_design_resources_updated_at
  BEFORE UPDATE ON public.design_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== storage: design-resources bucket (private) =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('design-resources', 'design-resources', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admin manages design-resources storage" ON storage.objects;
CREATE POLICY "Admin manages design-resources storage"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'design-resources' AND public.is_admin())
  WITH CHECK (bucket_id = 'design-resources' AND public.is_admin());

DROP POLICY IF EXISTS "Productores read design-resources storage" ON storage.objects;
CREATE POLICY "Productores read design-resources storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'design-resources' AND (public.is_productor() OR public.is_admin()));

-- ===== support_tickets: new category list =====
-- New categories: comercial | siniestros | administracion | cotizaciones | otro
-- Legacy values (siniestro, operativo) retained in CHECK so existing rows keep validating.
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_check;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_category_check
  CHECK (category IN (
    'comercial',
    'siniestros',
    'administracion',
    'cotizaciones',
    'otro',
    -- legacy values, no longer written by the app
    'siniestro',
    'operativo'
  ));
