-- PAS resources: Word/Excel + file metadata
-- Support tickets: resolve/close audit
-- Avatars bucket + profile SELECT for ticket participants

-- ===== pas_resources: word / excel + file metadata =====
ALTER TABLE public.pas_resources DROP CONSTRAINT IF EXISTS pas_resources_resource_type_check;
ALTER TABLE public.pas_resources
  ADD CONSTRAINT pas_resources_resource_type_check
  CHECK (resource_type IN ('pdf', 'video', 'image', 'link', 'word', 'excel'));

ALTER TABLE public.pas_resources
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS mime_type text;

-- ===== support_tickets: resolve / close audit =====
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- ===== profiles: producers can read peers on their tickets (name + avatar) =====
-- Admins already have full access via "Admin can manage all profiles".
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

-- ===== storage: avatars bucket =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users manage own avatars" ON storage.objects;
CREATE POLICY "Users manage own avatars"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated read avatars" ON storage.objects;
CREATE POLICY "Authenticated read avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');
