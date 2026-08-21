export const PRODUCER_ACADEMY_BASE = "/productor/academy";
export const ADMIN_ACADEMY_BASE = "/admin/academy";

export type AcademyLessonRow = {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  type: string;
  video_url: string | null;
  content_text: string | null;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  published: boolean;
  sort_order: number;
};

export type AcademyModuleRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  published: boolean;
  sort_order: number;
  academy_lessons: AcademyLessonRow[] | null;
};

export function slugifyAcademy(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, "-");
}
