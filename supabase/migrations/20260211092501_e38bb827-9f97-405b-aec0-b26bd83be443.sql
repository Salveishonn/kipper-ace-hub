
-- Fix the overly permissive audit_logs INSERT policy
DROP POLICY "Admin can insert audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND actor_user_id = auth.uid());

-- Also allow productores to insert
CREATE POLICY "Productores can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (public.is_productor() AND actor_user_id = auth.uid());
