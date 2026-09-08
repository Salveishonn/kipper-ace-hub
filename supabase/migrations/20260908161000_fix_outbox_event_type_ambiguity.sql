-- PL/pgSQL variable event_type collided with notification_outbox.event_type.

CREATE OR REPLACE FUNCTION public.tg_enqueue_support_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket public.support_tickets%ROWTYPE;
  producer_name text;
  v_event_type text;
  msg_count integer;
  is_admin_author boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.author_user_id AND role = 'admin'
  ) INTO is_admin_author;

  IF is_admin_author THEN
    RETURN NEW;
  END IF;

  SELECT * INTO ticket FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF ticket.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF ticket.status NOT IN ('abierto', 'en_gestion') THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO msg_count
  FROM public.support_messages
  WHERE ticket_id = NEW.ticket_id;

  v_event_type := CASE WHEN msg_count <= 1 THEN 'case.created' ELSE 'case.message.created' END;

  SELECT COALESCE(NULLIF(trim(p.full_name), ''), split_part(p.email, '@', 1), 'Productor')
    INTO producer_name
  FROM public.profiles p
  WHERE p.user_id = ticket.producer_id;

  INSERT INTO public.notification_outbox (event_type, event_id, payload)
  VALUES (
    v_event_type,
    CASE WHEN v_event_type = 'case.created' THEN ticket.id::text ELSE NEW.id::text END,
    jsonb_build_object(
      'ticket_id', ticket.id,
      'message_id', NEW.id,
      'subject', ticket.subject,
      'producer_id', ticket.producer_id,
      'producer_name', COALESCE(producer_name, 'Productor'),
      'created_at', NEW.created_at,
      'preview', left(regexp_replace(COALESCE(NEW.body, ''), '\s+', ' ', 'g'), 180)
    )
  )
  ON CONFLICT (event_type, event_id) DO NOTHING;

  PERFORM public.request_support_notification_processing();
  RETURN NEW;
END;
$$;
