
-- Academy modules
CREATE TABLE public.academy_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage academy modules"
ON public.academy_modules FOR ALL
USING (public.is_admin());

CREATE POLICY "Producers can view published modules"
ON public.academy_modules FOR SELECT
USING (public.is_productor() AND published = true);

-- Academy lessons
CREATE TABLE public.academy_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.academy_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'video' CHECK (type IN ('video', 'chat', 'pdf')),
  content_text TEXT,
  video_url TEXT,
  file_path TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(module_id, slug)
);

ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage academy lessons"
ON public.academy_lessons FOR ALL
USING (public.is_admin());

CREATE POLICY "Producers can view published lessons"
ON public.academy_lessons FOR SELECT
USING (public.is_productor() AND published = true);

-- Triggers for updated_at
CREATE TRIGGER update_academy_modules_updated_at
BEFORE UPDATE ON public.academy_modules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_academy_lessons_updated_at
BEFORE UPDATE ON public.academy_lessons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FedPat sync fields on policies (safe ALTER)
ALTER TABLE public.policies
ADD COLUMN IF NOT EXISTS external_source TEXT,
ADD COLUMN IF NOT EXISTS external_policy_id TEXT,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'manual';
