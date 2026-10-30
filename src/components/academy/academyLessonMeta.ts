import { FileSpreadsheet, FileText, Image, MessageSquare, Video, type LucideIcon } from "lucide-react";
import { isAcademyFileType } from "@/lib/fileUploads";
import { getVideoThumbnailUrl } from "@/lib/videoEmbed";
import type { AcademyLessonRow, AcademyModuleRow } from "@/components/academy/types";

const typeIcon: Record<string, LucideIcon> = {
  video: Video,
  chat: MessageSquare,
  pdf: FileText,
  word: FileText,
  excel: FileSpreadsheet,
  image: Image,
};

const typeLabel: Record<string, string> = {
  video: "Video",
  chat: "Texto",
  pdf: "PDF",
  word: "Word",
  excel: "Excel",
  image: "Imagen",
};

export const lessonIcon = (type: string): LucideIcon => typeIcon[type] ?? Video;
export const lessonLabel = (type: string) => typeLabel[type] ?? type;

const typeLabelPlural: Record<string, string> = {
  video: "Videos",
  chat: "Textos",
  image: "Imágenes",
};

/** "2 Videos", "1 PDF": file formats keep their name in the plural. */
export const lessonTypeCount = (type: string, n: number) =>
  `${n} ${n === 1 ? lessonLabel(type) : (typeLabelPlural[type] ?? lessonLabel(type))}`;

export const countLabel = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

/** Lessons that carry a file the producer can open or download. */
export const materialLessons = (lessons: AcademyLessonRow[]) =>
  lessons.filter((l) => isAcademyFileType(l.type));

export function lessonThumbnail(lesson: AcademyLessonRow) {
  return lesson.type === "video" && lesson.video_url ? getVideoThumbnailUrl(lesson.video_url) : null;
}

/** The module's own cover when it has one, otherwise the thumbnail of its first video. */
export function moduleCover(mod: AcademyModuleRow, lessons: AcademyLessonRow[]) {
  if (mod.cover_image) return mod.cover_image;
  for (const lesson of lessons) {
    const thumbnail = lessonThumbnail(lesson);
    if (thumbnail) return thumbnail;
  }
  return null;
}

/** Case- and accent-insensitive form used by the Academy search. */
export const normalizeSearch = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
