import { supabase } from "@/integrations/supabase/client";

export const ACADEMY_BUCKET = "academy-files";
export const CONSULTA_BUCKET = "consulta-attachments";

export const MAX_ACADEMY_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_CONSULTA_BYTES = 20 * 1024 * 1024; // 20 MB

export type AcademyFileLessonType = "pdf" | "word" | "excel" | "image";

const ACADEMY_ACCEPT: Record<AcademyFileLessonType, string> = {
  pdf: ".pdf,application/pdf",
  word: ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  excel:
    ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  image: "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif",
};

const ACADEMY_EXTENSIONS: Record<AcademyFileLessonType, string[]> = {
  pdf: ["pdf"],
  word: ["doc", "docx"],
  excel: ["xls", "xlsx"],
  image: ["jpg", "jpeg", "png", "gif", "webp"],
};

const CONSULTA_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
];

export const CONSULTA_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";

export function isAcademyFileType(type: string): type is AcademyFileLessonType {
  return type === "pdf" || type === "word" || type === "excel" || type === "image";
}

export function academyFileAccept(type: string): string | undefined {
  if (!isAcademyFileType(type)) return undefined;
  return ACADEMY_ACCEPT[type];
}

export function isValidAcademyFile(type: string, file: File): boolean {
  if (!isAcademyFileType(type)) return false;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ACADEMY_EXTENSIONS[type].includes(ext);
}

export function isValidConsultaAttachment(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return CONSULTA_EXTENSIONS.includes(ext);
}

function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120);
}

export async function uploadAcademyFile(file: File, lessonKey: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const base = sanitizeFilename(file.name.replace(/\.[^.]+$/, ""));
  const path = `lessons/${lessonKey}/${Date.now()}-${base}.${ext}`;
  const { error } = await supabase.storage.from(ACADEMY_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

export async function getAcademyFileSignedUrl(filePath: string, expiresIn = 3600) {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  const { data, error } = await supabase.storage.from(ACADEMY_BUCKET).createSignedUrl(filePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadConsultaAttachment(file: File, ticketId: string, userId: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const base = sanitizeFilename(file.name.replace(/\.[^.]+$/, ""));
  const path = `${ticketId}/${userId}/${Date.now()}-${base}.${ext}`;
  const { error } = await supabase.storage.from(CONSULTA_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

export async function getConsultaAttachmentSignedUrl(filePath: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(CONSULTA_BUCKET).createSignedUrl(filePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
