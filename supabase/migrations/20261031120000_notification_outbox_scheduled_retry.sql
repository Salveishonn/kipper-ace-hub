-- Retry failed notifications on a schedule instead of waiting for the next event.

ALTER TABLE public.notification_outbox
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- Failed sends back off 5, 10, 20... minutes across 7 retries, about 10.5 hours in total.
-- A claim older than 10 minutes means the Edge Function died mid-send.
CREATE OR REPLACE FUNCTION public.notification_outbox_is_due(o public.notification_outbox)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT o.attempts < 8 AND CASE o.status
    WHEN 'pending' THEN true
    WHEN 'failed' THEN
      COALESCE(o.processed_at, o.created_at)
        + make_interval(mins => (5 * power(2, GREATEST(o.attempts - 1, 0)))::integer) <= now()
    WHEN 'processing' THEN
      COALESCE(o.claimed_at, o.created_at) + interval '10 minutes' <= now()
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.notification_outbox_is_due(public.notification_outbox) FROM PUBLIC, anon, authenticated;

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
      attempts = q.attempts + 1,
      claimed_at = now()
  WHERE q.id IN (
    SELECT o.id
    FROM public.notification_outbox o
    WHERE public.notification_outbox_is_due(o)
    ORDER BY o.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50))
  )
  RETURNING q.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_notification_outbox(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_outbox(integer) TO service_role;

-- Only calls the Edge Function when something is due, so idle runs cost nothing.
CREATE OR REPLACE FUNCTION public.process_due_notification_outbox()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.notification_outbox o
    WHERE public.notification_outbox_is_due(o)
  ) THEN
    PERFORM public.request_support_notification_processing();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.process_due_notification_outbox() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.schedule(
  'process-due-notification-outbox',
  '*/5 * * * *',
  'SELECT public.process_due_notification_outbox()'
);
