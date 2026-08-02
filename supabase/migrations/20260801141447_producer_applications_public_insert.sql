-- Public /sumate submissions: allow INSERT for both anon and authenticated,
-- with a strict WITH CHECK that only permits a safe initial application state.
-- No public SELECT / UPDATE / DELETE. Admin review policies stay untouched.

-- Ensure table privileges match the intended public write path.
GRANT INSERT ON public.producer_applications TO anon, authenticated;

-- Recreate the public INSERT policy (idempotent) with a strict WITH CHECK.
DROP POLICY IF EXISTS "Anyone can submit producer_applications" ON public.producer_applications;

CREATE POLICY "Anyone can submit producer_applications"
ON public.producer_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(trim(email)) > 0
  AND full_name IS NOT NULL
  AND length(trim(full_name)) > 0
  -- DB default is 'nuevo'; reject any client-supplied workflow status.
  AND status = 'nuevo'
  -- Protected workflow fields must remain unset on public create.
  AND user_id IS NULL
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND admin_notes IS NULL
  AND invited_at IS NULL
  AND invite_expires_at IS NULL
);

-- Case-insensitive unique email so duplicate applications fail cleanly (23505).
-- Keep the oldest row when historical duplicates exist.
DELETE FROM public.producer_applications a
USING public.producer_applications b
WHERE lower(a.email) = lower(b.email)
  AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS producer_applications_email_lower_uidx
  ON public.producer_applications (lower(email));
