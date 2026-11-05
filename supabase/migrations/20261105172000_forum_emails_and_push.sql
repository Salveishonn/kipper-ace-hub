-- Notificaciones: mails del foro, push del portal (PWA) y avisos manuales del equipo.
-- Todo pasa por notification_outbox; la Edge Function process-support-notifications envía.

-- ===== Nuevos eventos =====
ALTER TABLE public.notification_outbox
  DROP CONSTRAINT IF EXISTS notification_outbox_event_type_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT notification_outbox_event_type_check
  CHECK (event_type IN (
    'case.created',
    'case.message.created',
    'case.reply.created',
    'case.status.changed',
    'pas.application.created',
    'forum.post.created',
    'forum.comment.created',
    'content.published',
    'admin.broadcast'
  ));

-- ===== Preferencias de mail (opt-out por usuario) =====
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  forum_new_post_email boolean NOT NULL DEFAULT true,
  forum_reply_email boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_preferences FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;

DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ===== Suscripciones push (un registro por dispositivo/navegador) =====
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  CONSTRAINT push_subscriptions_endpoint_https CHECK (endpoint ~ '^https://' AND length(endpoint) <= 1000),
  CONSTRAINT push_subscriptions_keys_length CHECK (length(p256dh) <= 200 AND length(auth) <= 100),
  CONSTRAINT push_subscriptions_ua_length CHECK (user_agent IS NULL OR length(user_agent) <= 400)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_subscriptions FROM anon;
REVOKE UPDATE ON public.push_subscriptions FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;

DROP POLICY IF EXISTS "Portal users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Portal users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.can_use_forum());

-- A device that changes hands: re-subscribing moves the endpoint to the signed-in user.
CREATE OR REPLACE FUNCTION public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_use_forum() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 400))
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = auth.uid(),
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        created_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_subscription(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(text, text, text, text) TO authenticated;

-- VAPID keys live in Supabase Vault (secret 'push_vapid_keys'), never in git.
CREATE OR REPLACE FUNCTION public.get_push_vapid_keys()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  IF to_regclass('vault.decrypted_secrets') IS NULL THEN
    RETURN NULL;
  END IF;
  EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $1 LIMIT 1'
    INTO v USING 'push_vapid_keys';
  RETURN v::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.get_push_vapid_keys() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_push_vapid_keys() TO service_role;

-- ===== Avisos manuales del equipo =====
CREATE TABLE IF NOT EXISTS public.admin_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  url text,
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_broadcasts_title_length CHECK (length(btrim(title)) BETWEEN 1 AND 80),
  CONSTRAINT admin_broadcasts_body_length CHECK (length(btrim(body)) BETWEEN 1 AND 300),
  CONSTRAINT admin_broadcasts_url_path CHECK (url IS NULL OR url ~ '^/[A-Za-z0-9/_\-]*$')
);

ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_broadcasts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.admin_broadcasts FROM authenticated;
GRANT SELECT ON public.admin_broadcasts TO authenticated;

DROP POLICY IF EXISTS "Admins read broadcasts" ON public.admin_broadcasts;
CREATE POLICY "Admins read broadcasts"
  ON public.admin_broadcasts FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.send_admin_broadcast(p_title text, p_body text, p_url text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.is_admin_session() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.admin_broadcasts (title, body, url, sent_by)
  VALUES (btrim(p_title), btrim(p_body), NULLIF(btrim(COALESCE(p_url, '')), ''), auth.uid())
  RETURNING id INTO new_id;

  INSERT INTO public.notification_outbox (event_type, event_id, payload)
  VALUES (
    'admin.broadcast',
    new_id::text,
    jsonb_build_object(
      'title', btrim(p_title),
      'body', btrim(p_body),
      'url', COALESCE(NULLIF(btrim(COALESCE(p_url, '')), ''), '/productor')
    )
  );

  PERFORM public.request_support_notification_processing();
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_admin_broadcast(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_admin_broadcast(text, text, text) TO authenticated;

-- ===== Foro =====
CREATE OR REPLACE FUNCTION public.forum_author_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(btrim(p.full_name), ''), 'Un productor')
  FROM public.profiles p WHERE p.user_id = p_user_id
$$;

REVOKE ALL ON FUNCTION public.forum_author_name(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tg_enqueue_forum_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.notification_outbox (event_type, event_id, payload)
    VALUES (
      'forum.post.created',
      NEW.id::text,
      jsonb_build_object(
        'post_id', NEW.id,
        'author_id', NEW.author_id,
        'author_name', COALESCE(public.forum_author_name(NEW.author_id), 'Un productor'),
        'preview', left(regexp_replace(COALESCE(NEW.body, ''), '\s+', ' ', 'g'), 240),
        'created_at', NEW.created_at
      )
    )
    ON CONFLICT (event_type, event_id) DO NOTHING;
    PERFORM public.request_support_notification_processing();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'forum post notification failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_enqueue_forum_post() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enqueue_forum_post ON public.forum_posts;
CREATE TRIGGER trg_enqueue_forum_post
  AFTER INSERT ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_enqueue_forum_post();

CREATE OR REPLACE FUNCTION public.tg_enqueue_forum_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author uuid;
  post_preview text;
BEGIN
  SELECT p.author_id, left(regexp_replace(COALESCE(p.body, ''), '\s+', ' ', 'g'), 120)
    INTO post_author, post_preview
  FROM public.forum_posts p WHERE p.id = NEW.post_id;

  BEGIN
    INSERT INTO public.notification_outbox (event_type, event_id, payload)
    VALUES (
      'forum.comment.created',
      NEW.id::text,
      jsonb_build_object(
        'post_id', NEW.post_id,
        'comment_id', NEW.id,
        'post_author_id', post_author,
        'post_preview', post_preview,
        'author_id', NEW.author_id,
        'author_name', COALESCE(public.forum_author_name(NEW.author_id), 'Un productor'),
        'preview', left(regexp_replace(NEW.body, '\s+', ' ', 'g'), 240),
        'created_at', NEW.created_at
      )
    )
    ON CONFLICT (event_type, event_id) DO NOTHING;
    PERFORM public.request_support_notification_processing();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'forum comment notification failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_enqueue_forum_comment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enqueue_forum_comment ON public.forum_comments;
CREATE TRIGGER trg_enqueue_forum_comment
  AFTER INSERT ON public.forum_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_enqueue_forum_comment();

-- ===== Contenido nuevo: Novedades y Academy (solo la primera publicación avisa) =====
CREATE OR REPLACE FUNCTION public.enqueue_content_published(p_key text, p_kind text, p_title text, p_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.notification_outbox (event_type, event_id, payload)
    VALUES (
      'content.published',
      p_key,
      jsonb_build_object('kind', p_kind, 'title', left(p_title, 120), 'url', p_url)
    )
    ON CONFLICT (event_type, event_id) DO NOTHING;
    PERFORM public.request_support_notification_processing();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'content notification failed: %', SQLERRM;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_content_published(text, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tg_notify_pas_resource_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.published AND (TG_OP = 'INSERT' OR NOT COALESCE(OLD.published, false)) THEN
    PERFORM public.enqueue_content_published(
      'pas_resource:' || NEW.id, 'novedad', NEW.title, '/productor/novedades');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_notify_pas_resource_published() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_pas_resource_published ON public.pas_resources;
CREATE TRIGGER trg_notify_pas_resource_published
  AFTER INSERT OR UPDATE OF published ON public.pas_resources
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_pas_resource_published();

CREATE OR REPLACE FUNCTION public.tg_notify_academy_lesson_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.academy_modules%ROWTYPE;
BEGIN
  IF NEW.published AND (TG_OP = 'INSERT' OR NOT COALESCE(OLD.published, false)) THEN
    SELECT * INTO m FROM public.academy_modules WHERE id = NEW.module_id;
    IF m.published THEN
      PERFORM public.enqueue_content_published(
        'academy_lesson:' || NEW.id,
        'academy',
        NEW.title,
        '/productor/academy/' || m.slug || '/' || NEW.slug);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_notify_academy_lesson_published() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_academy_lesson_published ON public.academy_lessons;
CREATE TRIGGER trg_notify_academy_lesson_published
  AFTER INSERT OR UPDATE OF published ON public.academy_lessons
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_academy_lesson_published();

CREATE OR REPLACE FUNCTION public.tg_notify_academy_module_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.published AND (TG_OP = 'INSERT' OR NOT COALESCE(OLD.published, false)) THEN
    PERFORM public.enqueue_content_published(
      'academy_module:' || NEW.id, 'academy', NEW.title, '/productor/academy/' || NEW.slug);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_notify_academy_module_published() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_academy_module_published ON public.academy_modules;
CREATE TRIGGER trg_notify_academy_module_published
  AFTER INSERT OR UPDATE OF published ON public.academy_modules
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_academy_module_published();

-- How many devices a broadcast would reach (shown on the admin Avisos page).
CREATE OR REPLACE FUNCTION public.count_push_subscribers()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.is_admin() THEN (SELECT count(*)::integer FROM public.push_subscriptions) END
$$;

REVOKE ALL ON FUNCTION public.count_push_subscribers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_push_subscribers() TO authenticated;
