import { supabase } from "@/integrations/supabase/client";

export const BLOG_BUCKET = "blog-media";
export const MAX_BLOG_FILE_BYTES = 50 * 1024 * 1024; // matches the bucket limit

const BLOG_EXTENSIONS = [
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv",
  "jpg", "jpeg", "png", "webp", "gif",
  "mp4", "webm", "mov",
];

export const BLOG_ACCEPT = BLOG_EXTENSIONS.map((e) => `.${e}`).join(",");

export type BlogAttachment = {
  id: string;
  post_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  position: number;
};

export function blogFileError(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!BLOG_EXTENSIONS.includes(ext)) {
    return `"${file.name}": tipo no permitido (PDF, Word, Excel, PowerPoint, imagen o video)`;
  }
  if (file.size > MAX_BLOG_FILE_BYTES) return `"${file.name}" supera el máximo de 50 MB`;
  return null;
}

function sanitizeFilename(name: string) {
  return name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120);
}

/** Path convention (checked in the DB): posts/{post_id}/{file} */
export async function uploadBlogFile(file: File, postId: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const base = sanitizeFilename(file.name.replace(/\.[^.]+$/, "")) || "archivo";
  const path = `posts/${postId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}.${ext}`;
  const { error } = await supabase.storage.from(BLOG_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

export function blogFileUrl(path: string, downloadName?: string) {
  const { data } = supabase.storage
    .from(BLOG_BUCKET)
    .getPublicUrl(path, downloadName ? { download: downloadName } : undefined);
  return data.publicUrl;
}

export async function removeBlogFiles(paths: string[]) {
  if (!paths.length) return;
  await supabase.storage.from(BLOG_BUCKET).remove(paths);
}

export const isImageAttachment = (a: Pick<BlogAttachment, "mime_type">) =>
  (a.mime_type ?? "").startsWith("image/");
export const isVideoAttachment = (a: Pick<BlogAttachment, "mime_type">) =>
  (a.mime_type ?? "").startsWith("video/");
