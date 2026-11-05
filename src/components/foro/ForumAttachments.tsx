import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, FileText, Film, Presentation } from "lucide-react";
import { toast } from "sonner";
import type { ForumAttachment } from "@/hooks/useForum";
import { formatBytes, getForumFileDownloadUrl, getForumFileSignedUrl } from "@/lib/forumFiles";
import { cn } from "@/lib/utils";

const isImage = (a: ForumAttachment) => (a.mime_type ?? "").startsWith("image/");
const isVideo = (a: ForumAttachment) => (a.mime_type ?? "").startsWith("video/");

function useSignedUrl(path: string, enabled = true) {
  return useQuery({
    queryKey: ["forum_file", path],
    queryFn: () => getForumFileSignedUrl(path),
    staleTime: 30 * 60 * 1000,
    enabled,
  });
}

function fileIcon(a: ForumAttachment) {
  const name = a.file_name.toLowerCase();
  if (/\.(xlsx?|csv)$/.test(name)) return FileSpreadsheet;
  if (/\.(pptx?)$/.test(name)) return Presentation;
  if (isVideo(a)) return Film;
  return FileText;
}

function ImageTile({ a, className }: { a: ForumAttachment; className?: string }) {
  const { data: url } = useSignedUrl(a.file_path);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("block overflow-hidden bg-muted", className)}
      aria-label={`Abrir imagen ${a.file_name}`}
    >
      {url ? (
        <img src={url} alt={a.file_name} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full animate-pulse" />
      )}
    </a>
  );
}

function VideoTile({ a }: { a: ForumAttachment }) {
  const { data: url } = useSignedUrl(a.file_path);
  return url ? (
    <video src={url} controls preload="metadata" className="w-full max-h-[420px] rounded-lg bg-black" />
  ) : (
    <div className="aspect-video w-full animate-pulse rounded-lg bg-muted" />
  );
}

function FileRow({ a }: { a: ForumAttachment }) {
  const Icon = fileIcon(a);
  const download = async () => {
    try {
      const url = await getForumFileDownloadUrl(a.file_path, a.file_name);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("No se pudo descargar el archivo");
    }
  };
  return (
    <button
      type="button"
      onClick={download}
      className="flex w-full items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5 text-left text-sm hover:border-primary/40 transition-colors"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{a.file_name}</span>
        <span className="block text-xs text-muted-foreground">{formatBytes(a.size_bytes)}</span>
      </span>
      <Download size={16} className="shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

export function ForumAttachments({ attachments }: { attachments: ForumAttachment[] }) {
  if (!attachments.length) return null;
  const images = attachments.filter(isImage);
  const videos = attachments.filter(isVideo);
  const files = attachments.filter((a) => !isImage(a) && !isVideo(a));

  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <div
          className={cn(
            "grid gap-1 overflow-hidden rounded-lg",
            images.length === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {images.slice(0, 4).map((a, i) => (
            <div key={a.id} className="relative">
              <ImageTile
                a={a}
                className={images.length === 1 ? "max-h-[480px]" : "aspect-square"}
              />
              {i === 3 && images.length > 4 && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-semibold text-white">
                  +{images.length - 4}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {images.length > 4 && (
        <div className="space-y-2">
          {images.slice(4).map((a) => (
            <FileRow key={a.id} a={a} />
          ))}
        </div>
      )}
      {videos.map((a) => (
        <VideoTile key={a.id} a={a} />
      ))}
      {files.map((a) => (
        <FileRow key={a.id} a={a} />
      ))}
    </div>
  );
}
