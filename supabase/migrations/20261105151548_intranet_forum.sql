-- Foro interno de la intranet: feed de publicaciones de productores y admins,
-- con archivos adjuntos, reacciones y comentarios.
--
-- Acceso: productores activos (rol productor + profile.account_status = 'active') y admins.
-- Cada autor gestiona lo suyo; la moderación de contenido ajeno requiere sesión admin con MFA.

-- ===== Helper de acceso =====
CREATE OR REPLACE FUNCTION public.can_use_forum()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND (
       public.has_role(auth.uid(), 'admin')
       OR (
         public.has_role(auth.uid(), 'productor')
         AND EXISTS (
           SELECT 1 FROM public.profiles p
           WHERE p.user_id = auth.uid() AND p.account_status = 'active'
         )
       )
     )
$$;

REVOKE ALL ON FUNCTION public.can_use_forum() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_forum() TO authenticated, service_role;

-- ===== Tablas =====
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  CONSTRAINT forum_posts_body_length CHECK (length(body) <= 5000)
);

CREATE INDEX IF NOT EXISTS forum_posts_created_at_idx ON public.forum_posts (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS forum_posts_author_idx ON public.forum_posts (author_id);

CREATE TABLE IF NOT EXISTS public.forum_post_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  file_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  position smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_post_attachments_name_length CHECK (length(file_name) BETWEEN 1 AND 200)
);

CREATE INDEX IF NOT EXISTS forum_post_attachments_post_idx ON public.forum_post_attachments (post_id, position);

CREATE TABLE IF NOT EXISTS public.forum_reactions (
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  reaction text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id),
  CONSTRAINT forum_reactions_reaction_check CHECK (reaction IN ('like', 'love', 'idea', 'clap', 'question'))
);

CREATE INDEX IF NOT EXISTS forum_reactions_user_idx ON public.forum_reactions (user_id);

CREATE TABLE IF NOT EXISTS public.forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  CONSTRAINT forum_comments_body_length CHECK (length(btrim(body)) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS forum_comments_post_idx ON public.forum_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS forum_comments_author_idx ON public.forum_comments (author_id);

-- ===== Integridad: autor fijo, edición marcada, post con texto o adjunto =====
CREATE OR REPLACE FUNCTION public.forum_touch_edit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.author_id IS DISTINCT FROM OLD.author_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'No se puede cambiar el autor ni la fecha' USING ERRCODE = '42501';
  END IF;
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.edited_at := now();
  END IF;
  IF TG_TABLE_NAME = 'forum_posts' THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forum_posts_touch_edit ON public.forum_posts;
CREATE TRIGGER forum_posts_touch_edit
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.forum_touch_edit();

DROP TRIGGER IF EXISTS forum_comments_touch_edit ON public.forum_comments;
CREATE TRIGGER forum_comments_touch_edit
  BEFORE UPDATE ON public.forum_comments
  FOR EACH ROW EXECUTE FUNCTION public.forum_touch_edit();

-- Bumps the post so new comments float the conversation in "updated_at" order if ever needed.
CREATE OR REPLACE FUNCTION public.forum_bump_post_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.forum_posts SET updated_at = now() WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.forum_bump_post_on_comment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS forum_comments_bump_post ON public.forum_comments;
CREATE TRIGGER forum_comments_bump_post
  AFTER INSERT ON public.forum_comments
  FOR EACH ROW EXECUTE FUNCTION public.forum_bump_post_on_comment();

-- ===== RLS =====
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.forum_posts, public.forum_post_attachments, public.forum_reactions, public.forum_comments FROM anon;
REVOKE UPDATE ON public.forum_posts, public.forum_comments, public.forum_post_attachments, public.forum_reactions FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.forum_posts, public.forum_post_attachments, public.forum_reactions, public.forum_comments TO authenticated;
GRANT UPDATE (body) ON public.forum_posts TO authenticated;
GRANT UPDATE (body) ON public.forum_comments TO authenticated;
GRANT UPDATE (reaction) ON public.forum_reactions TO authenticated;

-- forum_posts
DROP POLICY IF EXISTS "Forum members read posts" ON public.forum_posts;
CREATE POLICY "Forum members read posts"
  ON public.forum_posts FOR SELECT TO authenticated
  USING (public.can_use_forum());

DROP POLICY IF EXISTS "Forum members create own posts" ON public.forum_posts;
CREATE POLICY "Forum members create own posts"
  ON public.forum_posts FOR INSERT TO authenticated
  WITH CHECK (public.can_use_forum() AND author_id = auth.uid());

DROP POLICY IF EXISTS "Authors edit own posts" ON public.forum_posts;
CREATE POLICY "Authors edit own posts"
  ON public.forum_posts FOR UPDATE TO authenticated
  USING (public.can_use_forum() AND author_id = auth.uid())
  WITH CHECK (public.can_use_forum() AND author_id = auth.uid());

DROP POLICY IF EXISTS "Authors or admins delete posts" ON public.forum_posts;
CREATE POLICY "Authors or admins delete posts"
  ON public.forum_posts FOR DELETE TO authenticated
  USING (
    (public.can_use_forum() AND author_id = auth.uid())
    OR public.is_admin_session()
  );

-- forum_post_attachments: path = {author_id}/{post_id}/{file}
DROP POLICY IF EXISTS "Forum members read attachments" ON public.forum_post_attachments;
CREATE POLICY "Forum members read attachments"
  ON public.forum_post_attachments FOR SELECT TO authenticated
  USING (public.can_use_forum());

DROP POLICY IF EXISTS "Authors attach files to own posts" ON public.forum_post_attachments;
CREATE POLICY "Authors attach files to own posts"
  ON public.forum_post_attachments FOR INSERT TO authenticated
  WITH CHECK (
    public.can_use_forum()
    AND file_path LIKE auth.uid()::text || '/' || post_id::text || '/%'
    AND EXISTS (
      SELECT 1 FROM public.forum_posts p
      WHERE p.id = post_id AND p.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authors or admins remove attachments" ON public.forum_post_attachments;
CREATE POLICY "Authors or admins remove attachments"
  ON public.forum_post_attachments FOR DELETE TO authenticated
  USING (
    public.is_admin_session()
    OR (
      public.can_use_forum()
      AND EXISTS (
        SELECT 1 FROM public.forum_posts p
        WHERE p.id = post_id AND p.author_id = auth.uid()
      )
    )
  );

-- forum_reactions
DROP POLICY IF EXISTS "Forum members read reactions" ON public.forum_reactions;
CREATE POLICY "Forum members read reactions"
  ON public.forum_reactions FOR SELECT TO authenticated
  USING (public.can_use_forum());

DROP POLICY IF EXISTS "Forum members react as themselves" ON public.forum_reactions;
CREATE POLICY "Forum members react as themselves"
  ON public.forum_reactions FOR INSERT TO authenticated
  WITH CHECK (public.can_use_forum() AND user_id = auth.uid());

DROP POLICY IF EXISTS "Forum members change own reaction" ON public.forum_reactions;
CREATE POLICY "Forum members change own reaction"
  ON public.forum_reactions FOR UPDATE TO authenticated
  USING (public.can_use_forum() AND user_id = auth.uid())
  WITH CHECK (public.can_use_forum() AND user_id = auth.uid());

DROP POLICY IF EXISTS "Forum members remove own reaction" ON public.forum_reactions;
CREATE POLICY "Forum members remove own reaction"
  ON public.forum_reactions FOR DELETE TO authenticated
  USING (public.can_use_forum() AND user_id = auth.uid());

-- forum_comments
DROP POLICY IF EXISTS "Forum members read comments" ON public.forum_comments;
CREATE POLICY "Forum members read comments"
  ON public.forum_comments FOR SELECT TO authenticated
  USING (public.can_use_forum());

DROP POLICY IF EXISTS "Forum members comment as themselves" ON public.forum_comments;
CREATE POLICY "Forum members comment as themselves"
  ON public.forum_comments FOR INSERT TO authenticated
  WITH CHECK (public.can_use_forum() AND author_id = auth.uid());

DROP POLICY IF EXISTS "Authors edit own comments" ON public.forum_comments;
CREATE POLICY "Authors edit own comments"
  ON public.forum_comments FOR UPDATE TO authenticated
  USING (public.can_use_forum() AND author_id = auth.uid())
  WITH CHECK (public.can_use_forum() AND author_id = auth.uid());

DROP POLICY IF EXISTS "Authors or admins delete comments" ON public.forum_comments;
CREATE POLICY "Authors or admins delete comments"
  ON public.forum_comments FOR DELETE TO authenticated
  USING (
    public.is_admin_session()
    OR (public.can_use_forum() AND author_id = auth.uid())
  );

-- ===== Perfiles públicos del foro (solo nombre y avatar, sin email/DNI) =====
CREATE OR REPLACE FUNCTION public.get_forum_authors(p_user_ids uuid[])
RETURNS TABLE (user_id uuid, full_name text, avatar_url text, is_admin boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id,
         p.full_name,
         p.avatar_url,
         public.has_role(p.user_id, 'admin') AS is_admin
  FROM public.profiles p
  WHERE public.can_use_forum()
    AND p.user_id = ANY (p_user_ids[1:500])
    AND (
      EXISTS (SELECT 1 FROM public.forum_posts fp WHERE fp.author_id = p.user_id)
      OR EXISTS (SELECT 1 FROM public.forum_comments fc WHERE fc.author_id = p.user_id)
      OR EXISTS (SELECT 1 FROM public.forum_reactions fr WHERE fr.user_id = p.user_id)
    )
$$;

REVOKE ALL ON FUNCTION public.get_forum_authors(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_forum_authors(uuid[]) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.forum_touch_edit() FROM PUBLIC, anon, authenticated;

-- ===== Storage: forum-attachments =====
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-attachments',
  'forum-attachments',
  false,
  20 * 1024 * 1024,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Forum members read forum files" ON storage.objects;
CREATE POLICY "Forum members read forum files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'forum-attachments' AND public.can_use_forum());

DROP POLICY IF EXISTS "Forum members upload own forum files" ON storage.objects;
CREATE POLICY "Forum members upload own forum files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'forum-attachments'
    AND public.can_use_forum()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owners or admins delete forum files" ON storage.objects;
CREATE POLICY "Owners or admins delete forum files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'forum-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin_session()
    )
  );

-- ===== Realtime =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'forum_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'forum_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_comments;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'forum_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_reactions;
  END IF;
END $$;
