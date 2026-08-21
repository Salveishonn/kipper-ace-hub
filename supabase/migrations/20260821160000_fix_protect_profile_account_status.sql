-- Service-role RPCs (approve_pas_application, etc.) update profiles.account_status
-- with auth.uid() null, so is_admin() is false. The previous RAISE also set
-- MESSAGE twice (42601), which blocked PAS approval with a generic 500.

CREATE OR REPLACE FUNCTION public.protect_profile_account_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce for end-user sessions. Service-role / auth triggers
  -- (auth.uid() null) and admin sessions may change account_status.
  IF TG_OP = 'UPDATE'
     AND NEW.account_status IS DISTINCT FROM OLD.account_status
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Solo un administrador puede cambiar account_status';
  END IF;
  RETURN NEW;
END;
$$;
