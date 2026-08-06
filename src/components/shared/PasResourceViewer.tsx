import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, FileSpreadsheet, FileText, Image, Video, X } from "lucide-react";
import { getPasResourceDownloadUrl, type PasResourceType } from "@/hooks/usePasResources";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";

type ResourceLike = {
  title: string;
  resource_type: string;
  file_path: string | null;
  file_name?: string | null;
  external_url?: string | null;
};

function getIcon(type: string) {
  switch (type) {
    case "video":
      return Video;
    case "pdf":
    case "word":
      return FileText;
    case "excel":
      return FileSpreadsheet;
    case "link":
      return ExternalLink;
    default:
      return Image;
  }
}

function officeEmbedUrl(signedUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;
}

export function PasResourceViewer({
  resource,
  open,
  onClose,
}: {
  resource: ResourceLike | null;
  open: boolean;
  onClose: () => void;
}) {
  const type = (resource?.resource_type ?? "pdf") as PasResourceType;
  const filePath = resource?.file_path ?? null;

  const { data: signedUrl, isLoading, error } = useQuery({
    queryKey: ["pas_resource_viewer", filePath],
    queryFn: () => getPasResourceDownloadUrl(filePath!),
    enabled: open && !!filePath && type !== "link",
  });

  if (!open || !resource) return null;

  const downloadName = resource.file_name || resource.title;
  const Icon = getIcon(type);

  const handleDownload = () => {
    if (!signedUrl) return;
    const a = document.createElement("a");
    a.href = signedUrl;
    a.download = downloadName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  const handleOpenExternal = () => {
    if (type === "link" && resource.external_url) {
      window.open(resource.external_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (signedUrl) window.open(signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={resource.title}>
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <Icon size={18} className="text-primary shrink-0" aria-hidden />
            <h2 className="font-semibold truncate">{resource.title}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {type !== "link" && signedUrl && (
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download size={14} className="mr-1.5" aria-hidden /> Descargar
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleOpenExternal}>
              <ExternalLink size={14} className="mr-1.5" aria-hidden /> Abrir
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-[50vh] overflow-auto bg-muted/30 p-4">
          {type === "link" ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-muted-foreground">Este recurso es un enlace externo.</p>
              <Button onClick={handleOpenExternal}>Abrir enlace</Button>
            </div>
          ) : isLoading ? (
            <LoadingState text="Cargando vista previa..." />
          ) : error || !signedUrl ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-muted-foreground">No se pudo cargar la vista previa.</p>
              <Button onClick={handleOpenExternal}>Abrir / Descargar</Button>
            </div>
          ) : type === "image" ? (
            <img src={signedUrl} alt={resource.title} className="max-w-full max-h-[70vh] mx-auto object-contain rounded-lg" />
          ) : type === "video" ? (
            <video src={signedUrl} controls className="w-full max-h-[70vh] rounded-lg bg-black" />
          ) : type === "pdf" ? (
            <iframe title={resource.title} src={signedUrl} className="w-full h-[70vh] rounded-lg bg-white" />
          ) : type === "word" || type === "excel" ? (
            <iframe
              title={resource.title}
              src={officeEmbedUrl(signedUrl)}
              className="w-full h-[70vh] rounded-lg bg-white"
            />
          ) : (
            <div className="text-center py-16 space-y-3">
              <p className="text-muted-foreground">Vista previa no disponible para este tipo.</p>
              <Button onClick={handleDownload}>Descargar</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
