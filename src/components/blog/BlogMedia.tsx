import { Download, FileSpreadsheet, FileText, Presentation } from "lucide-react";
import {
  type BlogAttachment,
  blogFileUrl,
  isImageAttachment,
  isVideoAttachment,
} from "@/lib/blogMedia";
import { formatBytes } from "@/lib/forumFiles";
import { getVideoEmbedUrl } from "@/lib/videoEmbed";
import { cn } from "@/lib/utils";

function fileIcon(name: string) {
  if (/\.(xlsx?|csv)$/i.test(name)) return FileSpreadsheet;
  if (/\.pptx?$/i.test(name)) return Presentation;
  return FileText;
}

/** Video, images and downloadable files of a public blog post. */
export function BlogMedia({
  videoUrl,
  attachments,
  title,
}: {
  videoUrl: string | null;
  attachments: BlogAttachment[];
  title: string;
}) {
  const images = attachments.filter(isImageAttachment);
  const videos = attachments.filter(isVideoAttachment);
  const files = attachments.filter((a) => !isImageAttachment(a) && !isVideoAttachment(a));

  if (!videoUrl && !attachments.length) return null;

  return (
    <div className="space-y-6">
      {videoUrl && (
        <div className="aspect-video overflow-hidden rounded-xl bg-black">
          <iframe
            src={getVideoEmbedUrl(videoUrl)}
            title={`Video: ${title}`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {videos.map((v) => (
        <video
          key={v.id}
          src={blogFileUrl(v.file_path)}
          controls
          preload="metadata"
          className="w-full rounded-xl bg-black"
        />
      ))}

      {images.length > 0 && (
        <div className={cn("grid gap-2", images.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
          {images.map((img) => (
            <a
              key={img.id}
              href={blogFileUrl(img.file_path)}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-xl bg-muted"
            >
              <img
                src={blogFileUrl(img.file_path)}
                alt={img.file_name}
                loading="lazy"
                className={cn("w-full object-cover", images.length === 1 ? "max-h-[520px]" : "aspect-[4/3]")}
              />
            </a>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Archivos para descargar</h2>
          {files.map((f) => {
            const Icon = fileIcon(f.file_name);
            return (
              <a
                key={f.id}
                href={blogFileUrl(f.file_path, f.file_name)}
                className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-sm hover:border-primary/40 transition-colors"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon size={18} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{f.file_name}</span>
                  <span className="block text-xs text-muted-foreground">{formatBytes(f.size_bytes)}</span>
                </span>
                <Download size={16} className="shrink-0 text-muted-foreground" aria-hidden />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** First image of the post, used as its card cover in the listing. */
export function blogCoverUrl(attachments: BlogAttachment[] | undefined) {
  const img = (attachments ?? []).find(isImageAttachment);
  return img ? blogFileUrl(img.file_path) : null;
}
