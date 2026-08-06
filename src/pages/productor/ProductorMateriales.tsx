import { useState } from "react";
import { FolderOpen, Eye, Image, FileText, Video, ExternalLink, FileSpreadsheet } from "lucide-react";
import { usePasResources } from "@/hooks/usePasResources";
import { PasResourceViewer } from "@/components/shared/PasResourceViewer";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { siteConfig } from "@/lib/siteConfig";

const getIcon = (type: string) => {
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
};

const ProductorMateriales = () => {
  const { data: resources, isLoading, error } = usePasResources();
  const [selected, setSelected] = useState<NonNullable<typeof resources>[0] | null>(null);

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
        <h1 className="text-2xl font-bold text-foreground">Novedades</h1>
        <p className="text-muted-foreground">Actualizaciones y material publicado por el equipo Kipper</p>
      </div>

      {!resources?.length ? (
        <EmptyState
          title="Sin novedades publicadas"
          description="Pronto verás PDFs, Word, Excel, videos e imágenes acá."
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
                    onClick={() => {
                      if (item.resource_type === "link" && item.external_url) {
                        window.open(item.external_url, "_blank", "noopener,noreferrer");
                        return;
                      }
                      setSelected(item);
                    }}
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
                    <Eye size={16} className="text-muted-foreground shrink-0 mt-1" aria-hidden />
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

      <PasResourceViewer resource={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default ProductorMateriales;
