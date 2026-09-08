-- Support-case admin emails (outbox) + revoke callable trigger RPCs.

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('case.created', 'case.message.created')),
  event_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (event_type, event_id)
);

CREATE INDEX IF NOT EXISTS notification_outbox_due_idx
  ON public.notification_outbox (created_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.notification_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.notification_outbox TO service_role;

CREATE OR REPLACE FUNCTION public.request_support_notification_processing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req_id bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RETURN;
  END IF;

  SELECT net.http_post(
    url := 'https://qefzutfaawsegmwgaynj.supabase.co/functions/v1/process-support-notifications',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('source', 'db-trigger')
  ) INTO req_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_support_notification_processing() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_support_notification_processing() TO service_role;
GRANT EXECUTE ON FUNCTION public.request_support_notification_processing() TO postgres;

CREATE OR REPLACE FUNCTION public.tg_enqueue_support_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket public.support_tickets%ROWTYPE;
  producer_name text;
  event_type text;
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

  event_type := CASE WHEN msg_count <= 1 THEN 'case.created' ELSE 'case.message.created' END;

  SELECT COALESCE(NULLIF(trim(p.full_name), ''), split_part(p.email, '@', 1), 'Productor')
    INTO producer_name
  FROM public.profiles p
  WHERE p.user_id = ticket.producer_id;

  INSERT INTO public.notification_outbox (event_type, event_id, payload)
  VALUES (
    event_type,
    CASE WHEN event_type = 'case.created' THEN ticket.id::text ELSE NEW.id::text END,
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

DROP TRIGGER IF EXISTS trg_enqueue_support_message_email ON public.support_messages;
CREATE TRIGGER trg_enqueue_support_message_email
AFTER INSERT ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION public.tg_enqueue_support_message_email();

REVOKE ALL ON FUNCTION public.tg_enqueue_support_message_email() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_notification_outbox(p_limit integer DEFAULT 20)
RETURNS SETOF public.notification_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.notification_outbox q
  SET status = 'processing',
      attempts = q.attempts + 1
  WHERE q.id IN (
    SELECT o.id
    FROM public.notification_outbox o
    WHERE o.status IN ('pending', 'failed')
      AND o.attempts < 8
    ORDER BY o.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50))
  )
  RETURNING q.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_notification_outbox(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_outbox(integer) TO service_role;

-- Trigger-only SECURITY DEFINER helpers must not be callable via PostgREST.
REVOKE ALL ON FUNCTION public.activate_pas_on_email_confirmed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_pas_invite_on_auth_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_account_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_pas_applicant_on_signup() FROM PUBLIC, anon, authenticated;

-- Privileged mutations: authenticated OK (functions enforce admin), never anon.
REVOKE ALL ON FUNCTION public.approve_pas_application(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.restore_pas_producer(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.revoke_pas_producer(uuid) FROM anon;

DROP POLICY IF EXISTS "Anyone can upload quote files" ON storage.objects;
