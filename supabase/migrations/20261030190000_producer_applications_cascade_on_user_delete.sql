-- Deleting a user left the application behind as 'activo' with no account, which the admin
-- list showed as an active producer. The application now goes with the user.

ALTER TABLE public.producer_applications
  DROP CONSTRAINT IF EXISTS producer_applications_user_id_fkey;
ALTER TABLE public.producer_applications
  ADD CONSTRAINT producer_applications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
