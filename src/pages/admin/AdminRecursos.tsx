import { useState } from "react";
import { Plus, Trash2, Upload, ExternalLink } from "lucide-react";
import {
  usePasResources,
  useSavePasResource,
  useDeletePasResource,
  uploadPasResourceFile,
  type PasResourceType,
} from "@/hooks/usePasResources";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const AdminRecursos = () => {
  const { data, isLoading, error } = usePasResources({ admin: true });
  const save = useSavePasResource();
  const del = useDeletePasResource();
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    resource_type: "pdf" as PasResourceType,
    external_url: "",
    week_label: "",
    published: true,
  });

  const reset = () => {
    setForm({
      title: "",
      description: "",
      resource_type: "pdf",
      external_url: "",
      week_label: "",
      published: true,
    });
    setFile(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    try {
      let file_path: string | null = null;
      if (file && form.resource_type !== "link") {
        const ext = file.name.split(".").pop();
        file_path = `uploads/${Date.now()}-${form.title.slice(0, 20).replace(/\W/g, "_")}.${ext}`;
        await uploadPasResourceFile(file, file_path);
      }
      await save.mutateAsync({
        title: form.title,
        description: form.description || null,
        resource_type: form.resource_type,
        file_path,
        external_url: form.resource_type === "link" ? form.external_url || null : null,
        week_label: form.week_label || null,
        published: form.published,
        published_at: new Date().toISOString(),
      });
      toast.success("Recurso publicado");
      reset();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  if (isLoading) return <LoadingState text="Cargando recursos..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar los recursos" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Recursos semanales PAS</h1>
          <p className="text-muted-foreground">PDF, video, imágenes y enlaces para productores</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={18} className="mr-2" /> Nuevo recurso
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl p-6 shadow-soft space-y-4">
          <input
            className="input-kipper"
            placeholder="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="input-kipper min-h-[80px]"
            placeholder="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            className="input-kipper"
            placeholder="Semana / etiqueta (ej. Semana 12 · Mar 2026)"
            value={form.week_label}
            onChange={(e) => setForm({ ...form, week_label: e.target.value })}
          />
          <select
            className="input-kipper"
            value={form.resource_type}
            onChange={(e) => setForm({ ...form, resource_type: e.target.value as PasResourceType })}
          >
            <option value="pdf">PDF</option>
            <option value="video">Video</option>
            <option value="image">Imagen</option>
            <option value="link">Enlace externo</option>
          </select>
          {form.resource_type === "link" ? (
            <input
              className="input-kipper"
              placeholder="URL"
              value={form.external_url}
              onChange={(e) => setForm({ ...form, external_url: e.target.value })}
            />
          ) : (
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Upload size={16} /> {file?.name ?? "Subir archivo"}
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
            />
            Publicado para productores
          </label>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={save.isPending}>Guardar</Button>
            <Button variant="outline" onClick={reset}>Cancelar</Button>
          </div>
        </div>
      )}

      {!data?.length ? (
        <EmptyState title="Sin recursos" description="Publicá el primer material semanal." />
      ) : (
        <ul className="space-y-3">
          {data.map((r) => (
            <li key={r.id} className="bg-card rounded-xl p-4 flex justify-between items-start gap-4">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.week_label} · {r.resource_type} · {r.published ? "Publicado" : "Borrador"}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => del.mutate(r.id, { onSuccess: () => toast.success("Eliminado") })}
              >
                <Trash2 size={16} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminRecursos;
