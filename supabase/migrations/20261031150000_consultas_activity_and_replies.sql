-- Consultas: track activity per ticket, email producers about replies, let them reopen resolved cases.

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS last_message_by text CHECK (last_message_by IN ('productor', 'equipo')),
  ADD COLUMN IF NOT EXISTS producer_last_read_at timestamptz,
  ADD COLUMN IF NOT EXISTS team_last_read_at timestamptz;

CREATE OR REPLACE FUNCTION public.support_message_preview(p_body text, p_attachment_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(left(regexp_replace(btrim(COALESCE(p_body, '')), '\s+', ' ', 'g'), 180), ''),
    'Archivo adjunto: ' || COALESCE(p_attachment_name, 'sin nombre')
  );
$$;

REVOKE ALL ON FUNCTION public.support_message_preview(text, text) FROM PUBLIC, anon, authenticated;

-- Existing conversations start as read, and keep their real updated_at.
ALTER TABLE public.support_tickets DISABLE TRIGGER update_support_tickets_updated_at;

UPDATE public.support_tickets t
SET last_message_at = m.created_at,
    last_message_preview = public.support_message_preview(m.body, m.attachment_name),
    last_message_by = CASE WHEN m.author_user_id = t.producer_id THEN 'productor' ELSE 'equipo' END,
    producer_last_read_at = m.created_at,
    team_last_read_at = m.created_at
FROM (
  SELECT DISTINCT ON (ticket_id) ticket_id, author_user_id, body, attachment_name, created_at
  FROM public.support_messages
  ORDER BY ticket_id, created_at DESC
) m
WHERE m.ticket_id = t.id;

UPDATE public.support_tickets
SET last_message_at = created_at
WHERE last_message_preview IS NULL;

ALTER TABLE public.support_tickets ENABLE TRIGGER update_support_tickets_updated_at;

-- Producers have no UPDATE policy on tickets, so activity is kept here instead of by the client.
CREATE OR REPLACE FUNCTION public.tg_support_message_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket public.support_tickets%ROWTYPE;
  from_producer boolean;
BEGIN
  SELECT * INTO ticket FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF ticket.id IS NULL THEN
    RETURN NEW;
  END IF;

  from_producer := NEW.author_user_id = ticket.producer_id;

  UPDATE public.support_tickets
  SET last_message_at = NEW.created_at,
      last_message_preview = public.support_message_preview(NEW.body, NEW.attachment_name),
      last_message_by = CASE WHEN from_producer THEN 'productor' ELSE 'equipo' END,
      producer_last_read_at = CASE WHEN from_producer THEN NEW.created_at ELSE producer_last_read_at END,
      team_last_read_at = CASE WHEN from_producer THEN team_last_read_at ELSE NEW.created_at END,
      status = CASE
        WHEN from_producer AND status = 'resuelto' THEN 'abierto'
        WHEN NOT from_producer AND status = 'abierto' THEN 'en_gestion'
        ELSE status
      END,
      resolved_by = CASE WHEN from_producer AND status = 'resuelto' THEN NULL ELSE resolved_by END,
      resolved_at = CASE WHEN from_producer AND status = 'resuelto' THEN NULL ELSE resolved_at END
  WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_support_message_activity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_support_message_activity ON public.support_messages;
CREATE TRIGGER trg_support_message_activity
AFTER INSERT ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION public.tg_support_message_activity();

ALTER TABLE public.notification_outbox
  DROP CONSTRAINT IF EXISTS notification_outbox_event_type_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT notification_outbox_event_type_check
  CHECK (event_type IN (
    'case.created',
    'case.message.created',
    'case.reply.created',
    'case.status.changed',
    'pas.application.created'
  ));

CREATE OR REPLACE FUNCTION public.tg_enqueue_support_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket public.support_tickets%ROWTYPE;
  producer_name text;
  producer_email text;
  v_event_type text;
  msg_count integer;
BEGIN
  SELECT * INTO ticket FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF ticket.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(trim(p.full_name), ''), split_part(p.email, '@', 1), 'Productor'), p.email
    INTO producer_name, producer_email
  FROM public.profiles p
  WHERE p.user_id = ticket.producer_id;

  IF NEW.author_user_id = ticket.producer_id THEN
    SELECT count(*) INTO msg_count
    FROM public.support_messages
    WHERE ticket_id = NEW.ticket_id;

    v_event_type := CASE WHEN msg_count <= 1 THEN 'case.created' ELSE 'case.message.created' END;
  ELSIF producer_email IS NULL THEN
    RETURN NEW;
  ELSE
    v_event_type := 'case.reply.created';
  END IF;

  -- A notification problem must not lose the message.
  BEGIN
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
        'producer_email', producer_email,
        'created_at', NEW.created_at,
        'preview', public.support_message_preview(NEW.body, NEW.attachment_name)
      )
    )
    ON CONFLICT (event_type, event_id) DO NOTHING;

    PERFORM public.request_support_notification_processing();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'support message notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_enqueue_support_status_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  producer_name text;
  producer_email text;
BEGIN
  SELECT COALESCE(NULLIF(trim(p.full_name), ''), split_part(p.email, '@', 1), 'Productor'), p.email
    INTO producer_name, producer_email
  FROM public.profiles p
  WHERE p.user_id = NEW.producer_id;

  IF producer_email IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.notification_outbox (event_type, event_id, payload)
    VALUES (
      'case.status.changed',
      NEW.id::text || ':' || NEW.status || ':' || extract(epoch FROM now())::bigint::text,
      jsonb_build_object(
        'ticket_id', NEW.id,
        'subject', NEW.subject,
        'status', NEW.status,
        'producer_id', NEW.producer_id,
        'producer_name', COALESCE(producer_name, 'Productor'),
        'producer_email', producer_email,
        'created_at', now()
      )
    )
    ON CONFLICT (event_type, event_id) DO NOTHING;

    PERFORM public.request_support_notification_processing();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'support status notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_enqueue_support_status_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enqueue_support_status_email ON public.support_tickets;
CREATE TRIGGER trg_enqueue_support_status_email
AFTER UPDATE OF status ON public.support_tickets
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('resuelto', 'cerrado'))
EXECUTE FUNCTION public.tg_enqueue_support_status_email();

-- Replying to a resolved case reopens it; closed cases stay closed.
DROP POLICY IF EXISTS "Producer inserts messages on own open tickets" ON public.support_messages;
CREATE POLICY "Producer inserts messages on own open tickets"
  ON public.support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_user_id
    AND public.is_productor()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id
        AND t.producer_id = auth.uid()
        AND t.status IN ('abierto', 'en_gestion', 'resuelto')
    )
  );

DROP POLICY IF EXISTS "Producer uploads to own open tickets" ON storage.objects;
CREATE POLICY "Producer uploads to own open tickets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'consulta-attachments'
    AND public.is_productor()
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id::text = (storage.foldername(objects.name))[1]
        AND t.producer_id = auth.uid()
        AND t.status IN ('abierto', 'en_gestion', 'resuelto')
    )
  );

-- Producers can't update tickets, and the team shares one read marker.
CREATE OR REPLACE FUNCTION public.mark_support_ticket_read(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
  SET producer_last_read_at = CASE WHEN producer_id = auth.uid() THEN now() ELSE producer_last_read_at END,
      team_last_read_at = CASE WHEN producer_id <> auth.uid() THEN now() ELSE team_last_read_at END
  WHERE id = p_ticket_id
    AND (producer_id = auth.uid() OR public.is_admin());
END;
$$;

REVOKE ALL ON FUNCTION public.mark_support_ticket_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_support_ticket_read(uuid) TO authenticated;

-- Realtime applies each table's RLS, so people only receive changes they can already read.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  END IF;
END;
$$;
