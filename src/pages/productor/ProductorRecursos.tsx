import { useMemo, useState } from "react";
import { ExternalLink, Download, Search } from "lucide-react";
import { toast } from "sonner";
import {
  useDesignResources,
  getDesignResourceSignedUrl,
  designCategoryLabel,
  designResourcePreviewPath,
  DESIGN_CATEGORIES,
} from "@/hooks/useDesignResources";
import { DesignResourcePreview } from "@/components/shared/DesignResourcePreview";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ProductorRecursos = () => {
  const { data: resources, isLoading, error } = useDesignResources();
  const [category, setCategory] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<NonNullable<typeof resources>[0] | null>(null);

  const filtered = useMemo(() => {
    let list = resources ?? [];
    if (category !== "todos") list = list.filter((r) => r.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [resources, category, search]);

  const handleDownload = async (path: string) => {
    try {
      const url = await getDesignResourceSignedUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo descargar el archivo");
    }
  };

  if (isLoading) return <LoadingState text="Cargando recursos gráficos..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar los recursos gráficos" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recursos gráficos</h1>
        <p className="text-muted-foreground">
          Plantillas con la marca Kipper listas para personalizar y publicar en tus redes · clic para ver
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar plantillas..."
            className="input-kipper pl-9 py-2 text-sm"
            aria-label="Buscar recursos gráficos"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
          <button
            type="button"
            onClick={() => setCategory("todos")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              category === "todos" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            Todos
          </button>
          {DESIGN_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                category === c.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Sin recursos gráficos"
          description={
            search || category !== "todos"
              ? "No encontramos plantillas con esos filtros."
              : "El equipo Kipper publicará plantillas de redes sociales acá."
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r) => (
            <div key={r.id} className="bg-card rounded-xl border border-border/70 shadow-soft overflow-hidden flex flex-col">
              <button
                type="button"
                className="text-left"
                onClick={() => setPreview(r)}
                aria-label={`Vista previa de ${r.title}`}
              >
                <DesignResourcePreview
                  previewPath={designResourcePreviewPath(r)}
                  alt={`Vista previa: ${r.title}`}
                  className="w-full aspect-[4/3]"
                />
              </button>
              <div className="p-4 flex flex-col flex-1">
                <span className="text-xs font-medium text-primary mb-1">{designCategoryLabel(r.category)}</span>
                <button
                  type="button"
                  className="text-left"
                  onClick={() => setPreview(r)}
                  aria-label={`Ver ${r.title}`}
                >
                  <h2 className="font-semibold text-foreground">{r.title}</h2>
                  {r.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">clic para ver</p>
                </button>
                <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap gap-2">
                  {r.editable_url && (
                    <Button asChild size="sm">
                      <a href={r.editable_url} target="_blank" rel="noopener noreferrer">
                        Editar plantilla <ExternalLink size={14} className="ml-1" aria-hidden />
                      </a>
                    </Button>
                  )}
                  {r.download_path && (
                    <Button variant="outline" size="sm" onClick={() => handleDownload(r.download_path!)}>
                      <Download size={14} className="mr-1" aria-hidden /> Descargar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{preview.title}</DialogTitle>
                <DialogDescription>{designCategoryLabel(preview.category)}</DialogDescription>
              </DialogHeader>
              <DesignResourcePreview
                previewPath={designResourcePreviewPath(preview)}
                alt={`Vista previa: ${preview.title}`}
                fit="contain"
                className="w-full max-h-[70vh] rounded-lg"
              />
              {preview.description && (
                <p className="text-sm text-muted-foreground">{preview.description}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {preview.editable_url && (
                  <Button asChild>
                    <a href={preview.editable_url} target="_blank" rel="noopener noreferrer">
                      Editar plantilla <ExternalLink size={14} className="ml-1" aria-hidden />
                    </a>
                  </Button>
                )}
                {preview.download_path && (
                  <Button variant="outline" onClick={() => handleDownload(preview.download_path!)}>
                    <Download size={14} className="mr-1" aria-hidden /> Descargar
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductorRecursos;
