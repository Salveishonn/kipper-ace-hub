-- Academy: expand lesson file types + metadata
-- Consultas: message attachments + storage bucket
-- Idempotent hardening for pas_resources word/excel (if prior migration pending)

-- ===== academy_lessons: types + file metadata =====
ALTER TABLE public.academy_lessons DROP CONSTRAINT IF EXISTS academy_lessons_type_check;
ALTER TABLE public.academy_lessons
  ADD CONSTRAINT academy_lessons_type_check
  CHECK (type IN ('video', 'chat', 'pdf', 'word', 'excel', 'image'));

ALTER TABLE public.academy_lessons
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS mime_type text;

-- Ensure academy-files bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('academy-files', 'academy-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admin manages academy files" ON storage.objects;
CREATE POLICY "Admin manages academy files"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'academy-files' AND public.is_admin())
  WITH CHECK (bucket_id = 'academy-files' AND public.is_admin());

DROP POLICY IF EXISTS "Productores read academy files" ON storage.objects;
CREATE POLICY "Productores read academy files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'academy-files' AND (public.is_productor() OR public.is_admin()));

-- ===== support_messages: attachments =====
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_mime text;

ALTER TABLE public.support_messages ALTER COLUMN body SET DEFAULT '';

-- Allow empty body when an attachment is present
ALTER TABLE public.support_messages DROP CONSTRAINT IF EXISTS support_messages_body_or_attachment;
ALTER TABLE public.support_messages
  ADD CONSTRAINT support_messages_body_or_attachment
  CHECK (
    length(btrim(COALESCE(body, ''))) > 0
    OR attachment_path IS NOT NULL
  );

-- ===== storage: consulta-attachments =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('consulta-attachments', 'consulta-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: {ticket_id}/{user_id}/{filename}
DROP POLICY IF EXISTS "Admin manages consulta attachments" ON storage.objects;
CREATE POLICY "Admin manages consulta attachments"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'consulta-attachments' AND public.is_admin())
  WITH CHECK (bucket_id = 'consulta-attachments' AND public.is_admin());

DROP POLICY IF EXISTS "Producer reads own ticket attachments" ON storage.objects;
CREATE POLICY "Producer reads own ticket attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'consulta-attachments'
    AND public.is_productor()
    AND EXISTS (
      SELECT 1
      FROM public.support_tickets t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND t.producer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Producer uploads to own open tickets" ON storage.objects;
CREATE POLICY "Producer uploads to own open tickets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'consulta-attachments'
    AND public.is_productor()
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.support_tickets t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND t.producer_id = auth.uid()
        AND t.status IN ('abierto', 'en_gestion')
    )
  );

-- ===== pas_resources: word / excel (idempotent) =====
ALTER TABLE public.pas_resources DROP CONSTRAINT IF EXISTS pas_resources_resource_type_check;
ALTER TABLE public.pas_resources
  ADD CONSTRAINT pas_resources_resource_type_check
  CHECK (resource_type IN ('pdf', 'video', 'image', 'link', 'word', 'excel'));

ALTER TABLE public.pas_resources
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS mime_type text;

-- ===== profiles: ticket peers can read names/avatars (idempotent) =====
DROP POLICY IF EXISTS "Ticket participants can view peer profiles" ON public.profiles;
CREATE POLICY "Ticket participants can view peer profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.support_tickets t
      WHERE t.producer_id = auth.uid()
        AND (
          profiles.user_id = t.producer_id
          OR profiles.user_id = t.resolved_by
          OR profiles.user_id = t.closed_by
          OR EXISTS (
            SELECT 1
            FROM public.support_messages m
            WHERE m.ticket_id = t.id
              AND m.author_user_id = profiles.user_id
          )
        )
    )
  );
