import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateSupportTicket } from "@/hooks/useSupportTickets";
import { CONSULTA_CATEGORIES } from "@/lib/consultaCategories";
import {
  CONSULTA_ACCEPT,
  isValidConsultaAttachment,
  MAX_CONSULTA_BYTES,
} from "@/lib/fileUploads";
import { cn } from "@/lib/utils";

const EMPTY_FORM = { category: "comercial", subject: "", message: "" };

export function NewConsultaDialog({
  open,
  onOpenChange,
  producerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producerId: string;
}) {
  const navigate = useNavigate();
  const create = useCreateSupportTicket();
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectFile = (selected: File | null) => {
    if (selected && !isValidConsultaAttachment(selected)) {
      toast.error("Tipo de archivo no permitido (PDF, Word, Excel o imagen)");
      selected = null;
    } else if (selected && selected.size > MAX_CONSULTA_BYTES) {
      toast.error("El archivo supera el máximo de 20 MB");
      selected = null;
    }
    setFile(selected);
    if (!selected && inputRef.current) inputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error("Completá asunto y mensaje");
      return;
    }
    try {
      const { ticket, attachmentFailed } = await create.mutateAsync({
        producer_id: producerId,
        category: form.category,
        subject: form.subject,
        initial_message: form.message,
        file,
      });
      if (attachmentFailed) {
        toast.warning("Enviamos tu consulta, pero no se pudo subir el archivo. Podés adjuntarlo en la conversación.");
      } else {
        toast.success("Consulta enviada");
      }
      setForm(EMPTY_FORM);
      selectFile(null);
      onOpenChange(false);
      navigate(`/productor/consultas/${ticket.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar la consulta");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva consulta</DialogTitle>
          <DialogDescription>
            Contanos qué necesitás. Te avisamos por email cuando el equipo responda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Categoría</legend>
            <div className="flex flex-wrap gap-2">
              {CONSULTA_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={form.category === c.value}
                  onClick={() => setForm({ ...form, category: c.value })}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    form.category === c.value
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="consulta-subject" className="mb-1 block text-sm font-medium">
              Asunto
            </label>
            <input
              id="consulta-subject"
              className="input-kipper"
              placeholder="Ej: Cotización para flota de 5 vehículos"
              maxLength={120}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="consulta-message" className="mb-1 block text-sm font-medium">
              Mensaje
            </label>
            <textarea
              id="consulta-message"
              className="input-kipper min-h-[130px]"
              placeholder="Describí el caso, incluyendo póliza o cliente si aplica."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>

          <div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={CONSULTA_ACCEPT}
              onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="inline-flex max-w-full items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                <Paperclip size={14} className="shrink-0" aria-hidden />
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => selectFile(null)}
                  aria-label="Quitar adjunto"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                <Paperclip size={14} className="mr-1.5" aria-hidden /> Adjuntar archivo
              </Button>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">PDF, Word, Excel o imagen, hasta 20 MB.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? "Enviando..." : "Enviar consulta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
