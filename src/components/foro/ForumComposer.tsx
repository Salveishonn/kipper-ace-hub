import { useRef, useState } from "react";
import { FileText, ImagePlus, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useCreateForumPost } from "@/hooks/useForum";
import { FORUM_ACCEPT, MAX_FORUM_FILES, forumFileError, formatBytes } from "@/lib/forumFiles";

const MAX_BODY = 5000;

export function ForumComposer({
  userId,
  profile,
}: {
  userId: string;
  profile: { full_name: string | null; email: string; avatar_url: string | null } | null;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const create = useCreateForumPost(userId);
  const busy = create.isPending;
  const firstName = profile?.full_name?.trim().split(" ")[0];

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      const err = forumFileError(file);
      if (err) {
        toast.error(err);
        continue;
      }
      if (next.length >= MAX_FORUM_FILES) {
        toast.error(`Podés adjuntar hasta ${MAX_FORUM_FILES} archivos por publicación`);
        break;
      }
      next.push(file);
    }
    setFiles(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  const submit = async () => {
    if (busy || (!body.trim() && files.length === 0)) return;
    try {
      await create.mutateAsync({ body: body.trim(), files });
      setBody("");
      setFiles([]);
      toast.success("Publicación compartida con la comunidad");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo publicar");
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border/60 p-4 shadow-sm focus-within:border-primary/50 transition-colors">
      <div className="flex gap-3">
        <UserAvatar profile={profile} className="h-10 w-10 shrink-0" />
        <textarea
          className="w-full min-h-[72px] resize-y bg-transparent py-2 text-sm focus:outline-none placeholder:text-muted-foreground"
          placeholder={`¿Qué querés compartir con los demás productores${firstName ? `, ${firstName}` : ""}?`}
          aria-label="Escribí tu publicación"
          value={body}
          maxLength={MAX_BODY}
          disabled={busy}
          onChange={(e) => setBody(e.target.value)}
          onPaste={(e) => {
            if (e.clipboardData.files.length) {
              e.preventDefault();
              addFiles(e.clipboardData.files);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void submit();
            }
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Archivos a adjuntar">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="inline-flex max-w-full items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-xs"
            >
              {file.type.startsWith("image/") ? (
                <ImagePlus size={12} className="shrink-0" aria-hidden />
              ) : (
                <FileText size={12} className="shrink-0" aria-hidden />
              )}
              <span className="truncate max-w-[180px]">{file.name}</span>
              <span className="text-muted-foreground">{formatBytes(file.size)}</span>
              <button
                type="button"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                disabled={busy}
                aria-label={`Quitar ${file.name}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy || files.length >= MAX_FORUM_FILES}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip size={16} className="mr-1.5" aria-hidden /> Adjuntar archivos
        </Button>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            {body.length > MAX_BODY - 300 ? `${body.length}/${MAX_BODY}` : "Ctrl + Enter para publicar"}
          </span>
          <Button size="sm" onClick={submit} disabled={busy || (!body.trim() && files.length === 0)}>
            <Send size={14} className="mr-1.5" aria-hidden />
            {busy ? (files.length ? "Subiendo..." : "Publicando...") : "Publicar"}
          </Button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept={FORUM_ACCEPT}
        onChange={(e) => addFiles(e.target.files)}
      />
    </div>
  );
}
