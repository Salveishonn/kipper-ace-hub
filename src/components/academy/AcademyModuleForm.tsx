import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { invalidateAcademyQueries } from "@/components/academy/academyQueries";
import { slugifyAcademy, type AcademyModuleRow } from "@/components/academy/types";

type AcademyModuleFormProps = {
  module: Pick<AcademyModuleRow, "id" | "title" | "slug" | "description" | "published"> | null;
  nextSortOrder?: number;
  onCancel: () => void;
  onSaved?: (module: { slug: string }) => void;
};

export function AcademyModuleForm({
  module,
  nextSortOrder = 1,
  onCancel,
  onSaved,
}: AcademyModuleFormProps) {
  const queryClient = useQueryClient();
  const [moduleForm, setModuleForm] = useState({
    title: module?.title ?? "",
    slug: module?.slug ?? "",
    description: module?.description ?? "",
    published: module?.published ?? false,
  });

  const saveModule = async () => {
    if (!moduleForm.title) {
      toast.error("El título es obligatorio");
      return;
    }
    const slug = moduleForm.slug || slugifyAcademy(moduleForm.title);
    try {
      if (module) {
        const { error: err } = await supabase
          .from("academy_modules")
          .update({
            title: moduleForm.title,
            slug,
            description: moduleForm.description,
            published: moduleForm.published,
          })
          .eq("id", module.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("academy_modules").insert({
          title: moduleForm.title,
          slug,
          description: moduleForm.description,
          published: moduleForm.published,
          sort_order: nextSortOrder,
        });
        if (err) throw err;
      }
      await invalidateAcademyQueries(queryClient);
      toast.success(module ? "Módulo actualizado" : "Módulo creado");
      onSaved?.({ slug });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar módulo");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-card rounded-2xl shadow-elevated max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            {module ? "Editar Módulo" : "Nuevo Módulo"}
          </h2>
          <button type="button" onClick={onCancel} className="text-muted-foreground" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Título *</label>
            <input
              className="input-kipper mt-1"
              value={moduleForm.title}
              onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Slug (auto si vacío)</label>
            <input
              className="input-kipper mt-1"
              value={moduleForm.slug}
              onChange={(e) => setModuleForm({ ...moduleForm, slug: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              className="input-kipper mt-1 min-h-[80px]"
              value={moduleForm.description}
              onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={moduleForm.published}
              onChange={(e) => setModuleForm({ ...moduleForm, published: e.target.checked })}
            />
            Publicado
          </label>
          <button type="button" onClick={saveModule} className="btn-hero w-full text-sm py-3">
            {module ? "Actualizar" : "Crear Módulo"}
          </button>
        </div>
      </div>
    </div>
  );
}
