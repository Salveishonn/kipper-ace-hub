import { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
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
    <div className="space-y-2">
      <div className="flex gap-2">
        <textarea
          className="input-kipper flex-1 min-h-[80px]"
          placeholder={placeholder}
          value={body}
          disabled={busy}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            aria-label="Adjuntar archivo"
          >
            <Paperclip size={16} />
          </Button>
          <Button onClick={handleSend} disabled={busy || (!body.trim() && !file)}>
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
      {file && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Paperclip size={12} aria-hidden />
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            className="text-foreground hover:text-destructive"
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
    </div>
  );
}
