-- Academy: per-producer lesson progress.
-- A row means the producer completed the lesson; unmarking deletes it, so there is no UPDATE path.

CREATE TABLE IF NOT EXISTS public.academy_lesson_progress (
  producer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (producer_id, lesson_id)
);

-- The primary key covers lookups by producer; this one keeps lesson deletes from scanning the table.
CREATE INDEX IF NOT EXISTS academy_lesson_progress_lesson_id_idx
  ON public.academy_lesson_progress (lesson_id);

ALTER TABLE public.academy_lesson_progress ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.academy_lesson_progress FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.academy_lesson_progress TO authenticated;

DROP POLICY IF EXISTS "Producer reads own academy progress" ON public.academy_lesson_progress;
CREATE POLICY "Producer reads own academy progress"
  ON public.academy_lesson_progress FOR SELECT TO authenticated
  USING (auth.uid() = producer_id AND public.is_productor());

-- Admins preview the Academy without recording progress, even when they also hold the productor role.
-- Only lessons a producer can actually see can be completed.
DROP POLICY IF EXISTS "Producer completes visible academy lessons" ON public.academy_lesson_progress;
CREATE POLICY "Producer completes visible academy lessons"
  ON public.academy_lesson_progress FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = producer_id
    AND public.is_productor()
    AND NOT public.is_admin()
    AND EXISTS (
      SELECT 1
      FROM public.academy_lessons l
      JOIN public.academy_modules m ON m.id = l.module_id
      WHERE l.id = lesson_id
        AND l.published = true
        AND m.published = true
    )
  );

DROP POLICY IF EXISTS "Producer removes own academy progress" ON public.academy_lesson_progress;
CREATE POLICY "Producer removes own academy progress"
  ON public.academy_lesson_progress FOR DELETE TO authenticated
  USING (auth.uid() = producer_id AND public.is_productor() AND NOT public.is_admin());
