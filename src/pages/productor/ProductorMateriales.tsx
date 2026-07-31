import { FolderOpen, Download, Image, FileText, Video, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { usePasResources, getPasResourceDownloadUrl } from "@/hooks/usePasResources";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { siteConfig } from "@/lib/siteConfig";

const getIcon = (type: string) => {
  switch (type) {
    case "video":
      return Video;
    case "pdf":
      return FileText;
    case "link":
      return ExternalLink;
    default:
      return Image;
  }
};

const ProductorMateriales = () => {
  const { data: resources, isLoading, error } = usePasResources();

  const handleOpen = async (resource: NonNullable<typeof resources>[0]) => {
    try {
      if (resource.resource_type === "link" && resource.external_url) {
        window.open(resource.external_url, "_blank", "noopener,noreferrer");
        return;
      }
      if (resource.file_path) {
        const url = await getPasResourceDownloadUrl(resource.file_path);
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      toast.error("Recurso sin archivo disponible");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo abrir el recurso");
    }
  };

  if (isLoading) return <LoadingState text="Cargando recursos..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar los materiales" />;

  const grouped = (resources ?? []).reduce<Record<string, typeof resources>>((acc, r) => {
    const key = r.week_label || "General";
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recursos semanales</h1>
        <p className="text-muted-foreground">Material actualizado por el equipo Kipper</p>
      </div>

      {!resources?.length ? (
        <EmptyState
          title="Sin recursos publicados"
          description="Pronto verás PDFs, videos e imágenes de la semana acá."
        />
      ) : (
        Object.entries(grouped).map(([week, items]) => (
          <div key={week} className="space-y-3">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <FolderOpen size={20} className="text-primary" /> {week}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items?.map((item) => {
                const Icon = getIcon(item.resource_type);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpen(item)}
                    className="bg-card rounded-xl p-4 text-left shadow-soft hover:shadow-md transition-shadow flex gap-3 items-start"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <Download size={16} className="text-muted-foreground shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}

      <p className="text-xs text-muted-foreground">
        ¿Dudas sobre un recurso?{" "}
        <a href={`${siteConfig.whatsappUrl}?text=Consulta%20sobre%20recursos%20PAS`} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
          Escribinos por WhatsApp
        </a>
      </p>
    </div>
  );
};

export default ProductorMateriales;
