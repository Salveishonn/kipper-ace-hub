-- Email the team on every new solicitud PAS, through the same outbox as support cases.

ALTER TABLE public.notification_outbox
  DROP CONSTRAINT IF EXISTS notification_outbox_event_type_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT notification_outbox_event_type_check
  CHECK (event_type IN ('case.created', 'case.message.created', 'pas.application.created'));

CREATE OR REPLACE FUNCTION public.tg_enqueue_pas_application_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin-created producers are inserted as 'activo' and need no review.
  IF NEW.status NOT IN ('pending', 'nuevo') THEN
    RETURN NEW;
  END IF;

  -- Runs inside the auth signup transaction: a notification problem must not block signup.
  BEGIN
    INSERT INTO public.notification_outbox (event_type, event_id, payload)
    VALUES (
      'pas.application.created',
      NEW.id::text,
      jsonb_build_object(
        'application_id', NEW.id,
        'producer_name', NEW.full_name,
        'email', NEW.email,
        'phone', NEW.phone,
        'matricula_ssn', NEW.matricula_ssn,
        'location', NULLIF(concat_ws(', ', NEW.city, NEW.province), ''),
        'created_at', NEW.created_at,
        'preview', left(regexp_replace(COALESCE(NEW.message, ''), '\s+', ' ', 'g'), 180)
      )
    )
    ON CONFLICT (event_type, event_id) DO NOTHING;

    PERFORM public.request_support_notification_processing();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'pas application notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_pas_application_email ON public.producer_applications;
CREATE TRIGGER trg_enqueue_pas_application_email
AFTER INSERT ON public.producer_applications
FOR EACH ROW
EXECUTE FUNCTION public.tg_enqueue_pas_application_email();

REVOKE ALL ON FUNCTION public.tg_enqueue_pas_application_email() FROM PUBLIC, anon, authenticated;
