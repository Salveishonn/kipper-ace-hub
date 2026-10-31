import { useRef, useState } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  CONSULTA_ACCEPT,
  isValidConsultaAttachment,
  MAX_CONSULTA_BYTES,
  uploadConsultaAttachment,
} from "@/lib/fileUploads";

export function ConsultaComposer({
  placeholder,
  disabled,
  sending,
  ticketId,
  userId,
  onSend,
}: {
  placeholder: string;
  disabled?: boolean;
  sending?: boolean;
  ticketId: string;
  userId: string;
  onSend: (payload: {
    body: string;
    attachment_path?: string | null;
    attachment_name?: string | null;
    attachment_mime?: string | null;
  }) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = disabled || sending || uploading;

  const handleSend = async () => {
    if (busy) return;
    if (!body.trim() && !file) return;

    try {
      setUploading(true);
      let attachment_path: string | null = null;
      let attachment_name: string | null = null;
      let attachment_mime: string | null = null;

      if (file) {
        if (!isValidConsultaAttachment(file)) {
          toast.error("Tipo de archivo no permitido (PDF, Word, Excel o imagen)");
          return;
        }
        if (file.size > MAX_CONSULTA_BYTES) {
          toast.error("El archivo supera el máximo de 20 MB");
          return;
        }
        attachment_path = await uploadConsultaAttachment(file, ticketId, userId);
        attachment_name = file.name;
        attachment_mime = file.type || null;
      }

      await onSend({
        body: body.trim(),
        attachment_path,
        attachment_name,
        attachment_mime,
      });
      setBody("");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border/60 p-3 focus-within:border-primary/50 transition-colors">
      <textarea
        className="w-full min-h-[84px] resize-y bg-transparent px-1 py-1 text-sm focus:outline-none placeholder:text-muted-foreground"
        placeholder={placeholder}
        aria-label={placeholder}
        value={body}
        disabled={busy}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void handleSend();
          }
        }}
      />
      {file && (
        <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-xs">
          <Paperclip size={12} className="shrink-0" aria-hidden />
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            aria-label="Quitar adjunto"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip size={16} className="mr-1.5" aria-hidden /> Adjuntar
        </Button>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] text-muted-foreground sm:inline">Ctrl + Enter para enviar</span>
          <Button size="sm" onClick={handleSend} disabled={busy || (!body.trim() && !file)}>
            <Send size={14} className="mr-1.5" aria-hidden />
            {uploading ? "Subiendo..." : sending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={CONSULTA_ACCEPT}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
