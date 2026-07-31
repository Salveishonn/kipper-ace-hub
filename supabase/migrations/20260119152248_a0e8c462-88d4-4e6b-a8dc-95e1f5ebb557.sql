-- Allow new users to insert ONLY their default 'cliente' role row (prevents privilege escalation)
DROP POLICY IF EXISTS "Users can insert default cliente role" ON public.user_roles;

CREATE POLICY "Users can insert default cliente role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'cliente'
);
