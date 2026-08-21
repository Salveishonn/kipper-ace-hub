import { useState } from "react";
import { Plus, Trash2, Upload, Pencil, Eye, EyeOff, ExternalLink } from "lucide-react";
import {
  useDesignResources,
  useSaveDesignResource,
  useDeleteDesignResource,
  uploadDesignResourceFile,
  getDesignResourceSignedUrl,
  designCategoryLabel,
  designResourcePreviewPath,
  DESIGN_CATEGORIES,
  type DesignCategory,
} from "@/hooks/useDesignResources";
import { DesignResourcePreview } from "@/components/shared/DesignResourcePreview";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const emptyForm = {
  title: "",
  description: "",
  category: "instagram_post" as DesignCategory,
  editable_url: "",
  published: true,
  sort_order: 0,
};

function sanitizeName(title: string) {
  return title.slice(0, 24).replace(/\W/g, "_");
}

const AdminRecursosGraficos = () => {
  const { data, isLoading, error } = useDesignResources({ admin: true });
  const save = useSaveDesignResource();
  const del = useDeleteDesignResource();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [downloadFile, setDownloadFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<NonNullable<typeof data>[0] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const reset = () => {
    setForm(emptyForm);
    setPreviewFile(null);
    setDownloadFile(null);
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (r: NonNullable<typeof data>[0]) => {
    setEditingId(r.id);
    setForm({
      title: r.title,
      description: r.description ?? "",
      category: r.category as DesignCategory,
      editable_url: r.editable_url ?? "",
      published: r.published,
      sort_order: r.sort_order,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    if (!form.editable_url.trim() && !downloadFile && !editingId) {
      toast.error("Cargá una URL editable (Canva) o un archivo descargable");
      return;
    }
    try {
      setUploading(true);
      let preview_path: string | undefined;
      let download_path: string | undefined;

      if (previewFile) {
        const ext = previewFile.name.split(".").pop();
        preview_path = `previews/${Date.now()}-${sanitizeName(form.title)}.${ext}`;
        await uploadDesignResourceFile(previewFile, preview_path);
      }
      if (downloadFile) {
        const ext = downloadFile.name.split(".").pop();
        download_path = `files/${Date.now()}-${sanitizeName(form.title)}.${ext}`;
        await uploadDesignResourceFile(downloadFile, download_path);
      }
      if (!preview_path && download_path) {
        preview_path = designResourcePreviewPath({ preview_path: null, download_path }) ?? undefined;
      }

      await save.mutateAsync({
        id: editingId ?? undefined,
        title: form.title,
        description: form.description || null,
        category: form.category,
        editable_url: form.editable_url || null,
        published: form.published,
        sort_order: form.sort_order,
        ...(preview_path ? { preview_path } : {}),
        ...(download_path ? { download_path } : {}),
      });
      toast.success(editingId ? "Recurso actualizado" : "Recurso creado");
      reset();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (path: string) => {
    try {
      const url = await getDesignResourceSignedUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo descargar el archivo");
    }
  };

  const togglePublished = (r: NonNullable<typeof data>[0]) => {
    save.mutate(
      { id: r.id, title: r.title, category: r.category as DesignCategory, published: !r.published },
      { onSuccess: () => toast.success(r.published ? "Despublicado" : "Publicado") },
    );
  };

  if (isLoading) return <LoadingState text="Cargando recursos gráficos..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar los recursos gráficos" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Recursos gráficos</h1>
          <p className="text-muted-foreground">
            Plantillas de marca (Canva u otros) para que los productores personalicen y publiquen · clic para ver
          </p>
        </div>
        <Button onClick={() => { reset(); setShowForm(true); }}>
          <Plus size={18} className="mr-2" aria-hidden /> Nuevo recurso
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl p-6 shadow-soft border border-border/60 space-y-4">
          <h2 className="font-semibold">{editingId ? "Editar recurso" : "Nuevo recurso"}</h2>
          <input
            className="input-kipper"
            placeholder="Título"
            aria-label="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="input-kipper min-h-[70px]"
            placeholder="Descripción"
            aria-label="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <select
              className="input-kipper"
              aria-label="Categoría"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as DesignCategory })}
            >
              {DESIGN_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              className="input-kipper"
              type="number"
              placeholder="Orden"
              aria-label="Orden"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
            />
          </div>
          <input
            className="input-kipper"
            placeholder="URL de plantilla editable (Canva)"
            aria-label="URL de plantilla editable"
            value={form.editable_url}
            onChange={(e) => setForm({ ...form, editable_url: e.target.value })}
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Upload size={16} aria-hidden />
              {previewFile?.name ?? "Imagen de vista previa"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPreviewFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Upload size={16} aria-hidden />
              {downloadFile?.name ?? "Archivo descargable (opcional)"}
              <input
                type="file"
                className="hidden"
                onChange={(e) => setDownloadFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
            />
            Publicado para productores
          </label>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={save.isPending || uploading}>
              {uploading ? "Subiendo..." : save.isPending ? "Guardando..." : "Guardar"}
            </Button>
            <Button variant="outline" onClick={reset}>Cancelar</Button>
          </div>
        </div>
      )}

      {!data?.length ? (
        <EmptyState
          title="Sin recursos gráficos"
          description="Cargá la primera plantilla (Instagram, WhatsApp, flyer) con su enlace de Canva."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.map((r) => (
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
                <span className="text-xs font-medium text-primary mb-1">
                  {designCategoryLabel(r.category)} · {r.published ? "Publicado" : "Borrador"}
                </span>
                <button
                  type="button"
                  className="text-left"
                  onClick={() => setPreview(r)}
                  aria-label={`Ver ${r.title}`}
                >
                  <h2 className="font-semibold">{r.title}</h2>
                  {r.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">clic para ver</p>
                </button>
                <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center gap-1">
                  {r.editable_url && (
                    <Button asChild size="sm" variant="outline">
                      <a href={r.editable_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={14} className="mr-1" aria-hidden /> Plantilla
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => togglePublished(r)} aria-label={r.published ? "Despublicar" : "Publicar"}>
                    {r.published ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(r)} aria-label="Editar">
                    <Pencil size={16} aria-hidden />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteId(r.id)} aria-label="Eliminar">
                    <Trash2 size={16} aria-hidden />
                  </Button>
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
                <DialogDescription>
                  {designCategoryLabel(preview.category)}
                  {preview.published ? " · Publicado" : " · Borrador"}
                </DialogDescription>
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
                      <ExternalLink size={14} className="mr-1" aria-hidden /> Plantilla
                    </a>
                  </Button>
                )}
                {preview.download_path && (
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(preview.download_path!)}
                  >
                    Descargar
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar recurso gráfico?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los productores dejarán de ver esta plantilla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  del.mutate(deleteId, { onSuccess: () => toast.success("Recurso eliminado") });
                }
                setDeleteId(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminRecursosGraficos;
