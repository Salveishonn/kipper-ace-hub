import { useState } from "react";
import { X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  academyFileAccept,
  isAcademyFileType,
  isValidAcademyFile,
  MAX_ACADEMY_BYTES,
  uploadAcademyFile,
} from "@/lib/fileUploads";
import { invalidateAcademyQueries } from "@/components/academy/academyQueries";
import { slugifyAcademy, type AcademyLessonRow } from "@/components/academy/types";

const emptyLessonForm = {
  title: "",
  slug: "",
  type: "video",
  video_url: "",
  content_text: "",
  file_path: "",
  file_name: "",
  mime_type: "",
  published: false,
};

type AcademyLessonFormProps = {
  moduleId: string;
  lesson: AcademyLessonRow | null;
  nextSortOrder?: number;
  onCancel: () => void;
  onSaved?: (lesson: { slug: string }) => void;
};

export function AcademyLessonForm({
  moduleId,
  lesson,
  nextSortOrder = 1,
  onCancel,
  onSaved,
}: AcademyLessonFormProps) {
  const queryClient = useQueryClient();
  const [lessonFile, setLessonFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lessonForm, setLessonForm] = useState(() =>
    lesson
      ? {
          title: lesson.title,
          slug: lesson.slug,
          type: lesson.type,
          video_url: lesson.video_url || "",
          content_text: lesson.content_text || "",
          file_path: lesson.file_path || "",
          file_name: lesson.file_name || "",
          mime_type: lesson.mime_type || "",
          published: lesson.published,
        }
      : emptyLessonForm,
  );

  const saveLesson = async () => {
    if (!lessonForm.title) {
      toast.error("El título es obligatorio");
      return;
    }
    const needsFile = isAcademyFileType(lessonForm.type);
    if (needsFile && !lesson && !lessonFile && !lessonForm.file_path) {
      toast.error("Subí un archivo para esta lección");
      return;
    }
    if (lessonFile) {
      if (!isValidAcademyFile(lessonForm.type, lessonFile)) {
        toast.error("El archivo no coincide con el tipo seleccionado");
        return;
      }
      if (lessonFile.size > MAX_ACADEMY_BYTES) {
        toast.error("El archivo supera el máximo de 50 MB");
        return;
      }
    }

    const slug = lessonForm.slug || slugifyAcademy(lessonForm.title);

    try {
      setUploading(true);
      let file_path = needsFile ? lessonForm.file_path || null : null;
      let file_name = needsFile ? lessonForm.file_name || null : null;
      let mime_type = needsFile ? lessonForm.mime_type || null : null;

      if (lessonFile && needsFile) {
        const key = lesson?.id || `${moduleId}-${Date.now()}`;
        file_path = await uploadAcademyFile(lessonFile, key);
        file_name = lessonFile.name;
        mime_type = lessonFile.type || null;
      }

      const payload = {
        module_id: moduleId,
        title: lessonForm.title,
        slug,
        type: lessonForm.type,
        video_url: lessonForm.type === "video" ? lessonForm.video_url || null : null,
        content_text: lessonForm.type === "chat" ? lessonForm.content_text || null : null,
        file_path,
        file_name,
        mime_type,
        published: lessonForm.published,
      };

      if (lesson) {
        const { error: err } = await supabase
          .from("academy_lessons")
          .update(payload)
          .eq("id", lesson.id);
        if (err) throw err;
        toast.success("Lección actualizada");
      } else {
        const { error: err } = await supabase.from("academy_lessons").insert({
          ...payload,
          sort_order: nextSortOrder,
        });
        if (err) throw err;
        toast.success("Lección creada");
      }
      await invalidateAcademyQueries(queryClient);
      onSaved?.({ slug });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar lección");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-muted/20 rounded-xl space-y-3 border border-border/60">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{lesson ? "Editar lección" : "Nueva lección"}</h4>
        <button type="button" onClick={onCancel} aria-label="Cerrar formulario">
          <X size={16} className="text-muted-foreground" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Título *</label>
          <input
            className="input-kipper mt-1"
            value={lessonForm.title}
            onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Slug</label>
          <input
            className="input-kipper mt-1"
            value={lessonForm.slug}
            onChange={(e) => setLessonForm({ ...lessonForm, slug: e.target.value })}
            placeholder="auto si vacío"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Tipo</label>
          <select
            className="input-kipper mt-1"
            value={lessonForm.type}
            onChange={(e) => {
              setLessonForm({ ...lessonForm, type: e.target.value });
              setLessonFile(null);
            }}
          >
            <option value="video">Video</option>
            <option value="chat">Chat / Texto</option>
            <option value="pdf">PDF</option>
            <option value="word">Word</option>
            <option value="excel">Excel</option>
            <option value="image">Imagen / Foto</option>
          </select>
        </div>
      </div>
      {lessonForm.type === "video" && (
        <div>
          <label className="text-sm font-medium">URL del video</label>
          <input
            className="input-kipper mt-1"
            value={lessonForm.video_url}
            onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
            placeholder="https://youtube.com/..."
          />
        </div>
      )}
      {lessonForm.type === "chat" && (
        <div>
          <label className="text-sm font-medium">Contenido</label>
          <textarea
            className="input-kipper mt-1 min-h-[100px]"
            value={lessonForm.content_text}
            onChange={(e) => setLessonForm({ ...lessonForm, content_text: e.target.value })}
          />
        </div>
      )}
      {isAcademyFileType(lessonForm.type) && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Archivo</label>
          {lessonForm.file_name || lessonForm.file_path ? (
            <p className="text-xs text-muted-foreground">
              Actual: {lessonForm.file_name || lessonForm.file_path}
            </p>
          ) : null}
          <label className="flex items-center gap-2 cursor-pointer text-sm w-fit">
            <Upload size={16} aria-hidden />
            {lessonFile?.name ?? (lesson ? "Reemplazar archivo (opcional)" : "Subir archivo")}
            <input
              type="file"
              className="hidden"
              accept={academyFileAccept(lessonForm.type)}
              onChange={(e) => setLessonFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={lessonForm.published}
          onChange={(e) => setLessonForm({ ...lessonForm, published: e.target.checked })}
        />
        Publicada
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={saveLesson}
          disabled={uploading}
          className="btn-hero text-sm px-4 py-2 disabled:opacity-60"
        >
          {uploading ? "Subiendo..." : lesson ? "Actualizar lección" : "Guardar lección"}
        </button>
        <button type="button" onClick={onCancel} className="btn-hero-outline text-sm px-4 py-2">
          Cancelar
        </button>
      </div>
    </div>
  );
}
