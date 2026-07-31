-- Tighten public INSERT policies to avoid permissive `WITH CHECK (true)` while keeping forms functional

-- contacts: allow public inserts only when email is present
DROP POLICY IF EXISTS "Anyone can create contacts" ON public.contacts;
CREATE POLICY "Anyone can create contacts"
ON public.contacts
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
);

-- leads: allow public inserts only when contact fields are present
DROP POLICY IF EXISTS "Anyone can create leads (cotizador)" ON public.leads;
CREATE POLICY "Anyone can create leads (cotizador)"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND full_name IS NOT NULL
);
