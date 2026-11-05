import { supabase } from "@/integrations/supabase/client";

export const FORUM_BUCKET = "forum-attachments";
export const MAX_FORUM_FILE_BYTES = 20 * 1024 * 1024; // 20 MB (matches the bucket limit)
export const MAX_FORUM_FILES = 6;

const FORUM_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "mp4",
  "webm",
  "mov",
];

export const FORUM_ACCEPT = FORUM_EXTENSIONS.map((e) => `.${e}`).join(",");

export function forumFileError(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!FORUM_EXTENSIONS.includes(ext)) {
    return `"${file.name}": tipo no permitido (PDF, Office, imagen, video o texto)`;
  }
  if (file.size > MAX_FORUM_FILE_BYTES) return `"${file.name}" supera el máximo de 20 MB`;
  return null;
}

function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120);
}

/** Path convention (enforced by RLS): {user_id}/{post_id}/{timestamp}-{name}.{ext} */
export async function uploadForumFile(file: File, userId: string, postId: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const base = sanitizeFilename(file.name.replace(/\.[^.]+$/, "")) || "archivo";
  const path = `${userId}/${postId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}.${ext}`;
  const { error } = await supabase.storage.from(FORUM_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

export async function getForumFileSignedUrl(path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(FORUM_BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function getForumFileDownloadUrl(path: string, fileName: string) {
  const { data, error } = await supabase.storage
    .from(FORUM_BUCKET)
    .createSignedUrl(path, 3600, { download: fileName });
  if (error) throw error;
  return data.signedUrl;
}

export async function removeForumFiles(paths: string[]) {
  if (!paths.length) return;
  await supabase.storage.from(FORUM_BUCKET).remove(paths);
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
