-- Phase 1: quote_requests, producer_applications, payment_proofs + storage buckets

-- ===== quote_requests =====
CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ramo text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  dni text,
  city text,
  province text,
  vehicle_brand text,
  vehicle_model text,
  vehicle_year integer,
  vehicle_version text,
  vehicle_use text,
  coverage_type text,
  message text,
  documents jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'nuevo',
  assigned_productor_id uuid,
  user_id uuid,
  source text DEFAULT 'website',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create quote_requests"
ON public.quote_requests FOR INSERT TO anon, authenticated
WITH CHECK (email IS NOT NULL AND full_name IS NOT NULL);

CREATE POLICY "Admin manages quote_requests"
ON public.quote_requests FOR ALL TO public
USING (is_admin());

CREATE POLICY "Productores view assigned quote_requests"
ON public.quote_requests FOR SELECT TO public
USING (is_productor() AND assigned_productor_id = auth.uid());

CREATE POLICY "Productores update assigned quote_requests"
ON public.quote_requests FOR UPDATE TO public
USING (is_productor() AND assigned_productor_id = auth.uid());

CREATE POLICY "Clients view own quote_requests"
ON public.quote_requests FOR SELECT TO public
USING (is_cliente() AND user_id = auth.uid());

CREATE TRIGGER update_quote_requests_updated_at
BEFORE UPDATE ON public.quote_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== producer_applications =====
CREATE TABLE public.producer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  matricula_ssn text,
  city text,
  province text,
  years_experience integer,
  current_companies text,
  message text,
  status text NOT NULL DEFAULT 'nuevo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.producer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit producer_applications"
ON public.producer_applications FOR INSERT TO anon, authenticated
WITH CHECK (email IS NOT NULL AND full_name IS NOT NULL);

CREATE POLICY "Admin manages producer_applications"
ON public.producer_applications FOR ALL TO public
USING (is_admin());

CREATE TRIGGER update_producer_applications_updated_at
BEFORE UPDATE ON public.producer_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== payment_proofs =====
CREATE TABLE public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount numeric,
  paid_at timestamptz,
  file_path text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pendiente',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages payment_proofs"
ON public.payment_proofs FOR ALL TO public
USING (is_admin());

CREATE POLICY "Clients insert own payment_proofs"
ON public.payment_proofs FOR INSERT TO public
WITH CHECK (
  is_cliente() AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM installments i
    JOIN policies p ON p.id = i.policy_id
    WHERE i.id = installment_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Clients view own payment_proofs"
ON public.payment_proofs FOR SELECT TO public
USING (is_cliente() AND user_id = auth.uid());

CREATE POLICY "Productores view payment_proofs of assigned"
ON public.payment_proofs FOR SELECT TO public
USING (is_productor() AND EXISTS (
  SELECT 1 FROM installments i
  JOIN policies p ON p.id = i.policy_id
  WHERE i.id = payment_proofs.installment_id AND p.assigned_productor_id = auth.uid()
));

CREATE TRIGGER update_payment_proofs_updated_at
BEFORE UPDATE ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== Storage buckets =====
INSERT INTO storage.buckets (id, name, public) VALUES
  ('quote-uploads', 'quote-uploads', false),
  ('payment-proofs', 'payment-proofs', false),
  ('academy-files', 'academy-files', false)
ON CONFLICT (id) DO NOTHING;

-- quote-uploads: anyone can upload (public quoter), only admin reads
CREATE POLICY "Anyone can upload quote files"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'quote-uploads');

CREATE POLICY "Admin reads quote files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'quote-uploads' AND is_admin());

-- payment-proofs: client uploads to own folder, reads own; admin/productor read
CREATE POLICY "Clients upload own payment proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Clients read own payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admin reads payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs' AND is_admin());

CREATE POLICY "Productores read payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs' AND is_productor());

-- academy-files: admin manages, productor reads
CREATE POLICY "Admin manages academy files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'academy-files' AND is_admin())
WITH CHECK (bucket_id = 'academy-files' AND is_admin());

CREATE POLICY "Productores read academy files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'academy-files' AND (is_productor() OR is_admin()));