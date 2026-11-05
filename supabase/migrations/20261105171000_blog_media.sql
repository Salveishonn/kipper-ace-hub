-- Blog público (Comunidad Kipper): video embebido y archivos adjuntos por post, como en Academy.

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_video_url_http;
ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_video_url_http
  CHECK (video_url IS NULL OR video_url ~* '^https?://');

-- A post can be just a video or files; the editor still asks for a title.
ALTER TABLE public.blog_posts ALTER COLUMN content SET DEFAULT '';

CREATE TABLE IF NOT EXISTS public.blog_post_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  file_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  position smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blog_post_attachments_name_length CHECK (length(file_name) BETWEEN 1 AND 200),
  CONSTRAINT blog_post_attachments_path CHECK (file_path LIKE 'posts/' || post_id::text || '/%')
);

CREATE INDEX IF NOT EXISTS blog_post_attachments_post_idx
  ON public.blog_post_attachments (post_id, position);

ALTER TABLE public.blog_post_attachments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.blog_post_attachments FROM anon, authenticated;
GRANT SELECT ON public.blog_post_attachments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_post_attachments TO authenticated;

DROP POLICY IF EXISTS "Anyone reads attachments of published posts" ON public.blog_post_attachments;
CREATE POLICY "Anyone reads attachments of published posts"
  ON public.blog_post_attachments FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts p
      WHERE p.id = post_id AND p.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admin reads all blog attachments" ON public.blog_post_attachments;
CREATE POLICY "Admin reads all blog attachments"
  ON public.blog_post_attachments FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin MFA manages blog attachments" ON public.blog_post_attachments;
CREATE POLICY "Admin MFA manages blog attachments"
  ON public.blog_post_attachments FOR ALL TO authenticated
  USING (public.is_admin_session())
  WITH CHECK (public.is_admin_session());

-- Public bucket: files of published posts are linked from the public site.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-media',
  'blog-media',
  true,
  50 * 1024 * 1024,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Admin MFA manages blog media" ON storage.objects;
CREATE POLICY "Admin MFA manages blog media"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'blog-media' AND public.is_admin_session())
  WITH CHECK (bucket_id = 'blog-media' AND public.is_admin_session());
