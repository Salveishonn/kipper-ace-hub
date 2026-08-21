import { useState } from "react";
import { Plus, Trash2, Upload, Pencil, Eye, EyeOff } from "lucide-react";
import {
  usePasResources,
  useSavePasResource,
  useDeletePasResource,
  uploadPasResourceFile,
  pasResourceAccept,
  isValidPasResourceFile,
  type PasResourceType,
} from "@/hooks/usePasResources";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasResourceViewer } from "@/components/shared/PasResourceViewer";
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
  resource_type: "pdf" as PasResourceType,
  external_url: "",
  week_label: "",
  published: true,
};

const AdminNovedades = () => {
  const { data, isLoading, error } = usePasResources({ admin: true });
  const save = useSavePasResource();
  const del = useDeletePasResource();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [preview, setPreview] = useState<NonNullable<typeof data>[0] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const reset = () => {
    setForm(emptyForm);
    setFile(null);
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (r: NonNullable<typeof data>[0]) => {
    setEditingId(r.id);
    setForm({
      title: r.title,
      description: r.description ?? "",
      resource_type: r.resource_type as PasResourceType,
      external_url: r.external_url ?? "",
      week_label: r.week_label ?? "",
      published: r.published,
    });
    setFile(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    if (form.resource_type === "link" && !form.external_url.trim()) {
      toast.error("Ingresá la URL del enlace");
      return;
    }
    if (!editingId && form.resource_type !== "link" && !file) {
      toast.error("Subí un archivo");
      return;
    }
    if (file && form.resource_type !== "link" && !isValidPasResourceFile(form.resource_type, file)) {
      toast.error("El archivo no coincide con el tipo seleccionado");
      return;
    }
    try {
      setUploading(true);
      let file_path: string | undefined;
      let file_name: string | undefined;
      let mime_type: string | undefined;
      if (file && form.resource_type !== "link") {
        const ext = file.name.split(".").pop();
        file_path = `uploads/${Date.now()}-${form.title.slice(0, 20).replace(/\W/g, "_")}.${ext}`;
        file_name = file.name;
        mime_type = file.type || undefined;
        await uploadPasResourceFile(file, file_path);
      }
      await save.mutateAsync({
        id: editingId ?? undefined,
        title: form.title,
        description: form.description || null,
        resource_type: form.resource_type,
        ...(file_path ? { file_path, file_name, mime_type } : {}),
        external_url: form.resource_type === "link" ? form.external_url || null : null,
        week_label: form.week_label || null,
        published: form.published,
        published_at: new Date().toISOString(),
      });
      toast.success(editingId ? "Novedad actualizada" : "Novedad creada");
      reset();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setUploading(false);
    }
  };

  const togglePublished = (r: NonNullable<typeof data>[0]) => {
    save.mutate(
      { id: r.id, title: r.title, resource_type: r.resource_type as PasResourceType, published: !r.published },
      { onSuccess: () => toast.success(r.published ? "Despublicada" : "Publicada") },
    );
  };

  if (isLoading) return <LoadingState text="Cargando novedades..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar las novedades" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Novedades</h1>
          <p className="text-muted-foreground">PDF, Word, Excel, imagen, video o enlace para productores · clic para ver</p>
        </div>
        <Button onClick={() => { reset(); setShowForm(true); }}>
          <Plus size={18} className="mr-2" aria-hidden /> Nueva novedad
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl p-6 shadow-soft border border-border/60 space-y-4">
          <h2 className="font-semibold">{editingId ? "Editar novedad" : "Nueva novedad"}</h2>
          <input
            className="input-kipper"
            placeholder="Título"
            aria-label="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="input-kipper min-h-[80px]"
            placeholder="Descripción"
            aria-label="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            className="input-kipper"
            placeholder="Semana / etiqueta (ej. Semana 12 · Mar 2026)"
            aria-label="Semana o etiqueta"
            value={form.week_label}
            onChange={(e) => setForm({ ...form, week_label: e.target.value })}
          />
          <select
            className="input-kipper"
            aria-label="Tipo de contenido"
            value={form.resource_type}
            onChange={(e) => {
              setForm({ ...form, resource_type: e.target.value as PasResourceType });
              setFile(null);
            }}
          >
            <option value="pdf">PDF</option>
            <option value="word">Word</option>
            <option value="excel">Excel</option>
            <option value="image">Imagen</option>
            <option value="video">Video</option>
            <option value="link">Enlace externo</option>
          </select>
          {form.resource_type === "link" ? (
            <input
              className="input-kipper"
              placeholder="URL"
              aria-label="URL"
              value={form.external_url}
              onChange={(e) => setForm({ ...form, external_url: e.target.value })}
            />
          ) : (
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Upload size={16} aria-hidden /> {file?.name ?? (editingId ? "Reemplazar archivo (opcional)" : "Subir archivo")}
              <input
                type="file"
                className="hidden"
                accept={pasResourceAccept(form.resource_type)}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
            />
            Publicada para productores
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
        <EmptyState title="Sin novedades" description="Publicá la primera novedad para tu red." />
      ) : (
        <ul className="space-y-3">
          {data.map((r) => (
            <li key={r.id} className="bg-card rounded-xl p-4 border border-border/60 flex justify-between items-start gap-4 flex-wrap">
              <button
                type="button"
                className="min-w-0 text-left flex-1"
                onClick={() => setPreview(r)}
                aria-label={`Ver ${r.title}`}
              >
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[r.week_label, r.resource_type, r.published ? "Publicada" : "Borrador", "clic para ver"]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </button>
              <div className="flex gap-1">
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
            </li>
          ))}
        </ul>
      )}

      <PasResourceViewer
        resource={preview}
        open={!!preview}
        onClose={() => setPreview(null)}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar novedad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los productores dejarán de ver este contenido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  del.mutate(deleteId, { onSuccess: () => toast.success("Novedad eliminada") });
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

export default AdminNovedades;
