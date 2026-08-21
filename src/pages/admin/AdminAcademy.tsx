import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  Video,
  FileText,
  MessageSquare,
  X,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  Upload,
  Image,
  FileSpreadsheet,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import {
  academyFileAccept,
  isAcademyFileType,
  isValidAcademyFile,
  MAX_ACADEMY_BYTES,
  uploadAcademyFile,
} from "@/lib/fileUploads";

type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  type: string;
  video_url: string | null;
  content_text: string | null;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  published: boolean;
  sort_order: number;
};

type ModuleRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  published: boolean;
  sort_order: number;
  academy_lessons: LessonRow[] | null;
};

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

function useAcademyModules() {
  return useQuery({
    queryKey: ["academy_modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_modules")
        .select("*, academy_lessons(*)")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as ModuleRow[];
    },
  });
}

const typeIcon = {
  video: Video,
  chat: MessageSquare,
  pdf: FileText,
  word: FileText,
  excel: FileSpreadsheet,
  image: Image,
};

const AdminAcademy = () => {
  const queryClient = useQueryClient();
  const { data: modules, isLoading, error } = useAcademyModules();
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<ModuleRow | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonRow | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [lessonFile, setLessonFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [moduleForm, setModuleForm] = useState({
    title: "",
    slug: "",
    description: "",
    published: false,
  });
  const [lessonForm, setLessonForm] = useState(emptyLessonForm);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["academy_modules"] });

  const resetModuleForm = () => {
    setModuleForm({ title: "", slug: "", description: "", published: false });
    setEditingModule(null);
    setShowModuleForm(false);
  };

  const resetLessonForm = () => {
    setLessonForm(emptyLessonForm);
    setLessonFile(null);
    setEditingLesson(null);
    setShowLessonForm(null);
  };

  const saveModule = async () => {
    if (!moduleForm.title) {
      toast.error("El título es obligatorio");
      return;
    }
    const slug =
      moduleForm.slug || moduleForm.title.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, "-");
    try {
      if (editingModule) {
        const { error: err } = await supabase
          .from("academy_modules")
          .update({
            title: moduleForm.title,
            slug,
            description: moduleForm.description,
            published: moduleForm.published,
          })
          .eq("id", editingModule.id);
        if (err) throw err;
      } else {
        const maxOrder = Math.max(0, ...(modules || []).map((m) => m.sort_order ?? 0));
        const { error: err } = await supabase.from("academy_modules").insert({
          title: moduleForm.title,
          slug,
          description: moduleForm.description,
          published: moduleForm.published,
          sort_order: maxOrder + 1,
        });
        if (err) throw err;
      }
      await invalidate();
      toast.success(editingModule ? "Módulo actualizado" : "Módulo creado");
      resetModuleForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar módulo");
    }
  };

  const deleteModule = async (id: string) => {
    if (!confirm("¿Eliminar este módulo y sus lecciones?")) return;
    const { error: err } = await supabase.from("academy_modules").delete().eq("id", id);
    if (err) {
      toast.error(err.message);
      return;
    }
    await invalidate();
    toast.success("Módulo eliminado");
  };

  const openLessonCreate = (moduleId: string) => {
    setEditingLesson(null);
    setLessonForm(emptyLessonForm);
    setLessonFile(null);
    setShowLessonForm(moduleId);
  };

  const openLessonEdit = (lesson: LessonRow) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      slug: lesson.slug,
      type: lesson.type,
      video_url: lesson.video_url || "",
      content_text: lesson.content_text || "",
      file_path: lesson.file_path || "",
      file_name: lesson.file_name || "",
      mime_type: lesson.mime_type || "",
      published: lesson.published,
    });
    setLessonFile(null);
    setShowLessonForm(lesson.module_id);
    setExpandedModule(lesson.module_id);
  };

  const saveLesson = async (moduleId: string) => {
    if (!lessonForm.title) {
      toast.error("El título es obligatorio");
      return;
    }
    const needsFile = isAcademyFileType(lessonForm.type);
    if (needsFile && !editingLesson && !lessonFile && !lessonForm.file_path) {
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

    const slug =
      lessonForm.slug || lessonForm.title.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, "-");

    try {
      setUploading(true);
      let file_path = needsFile ? lessonForm.file_path || null : null;
      let file_name = needsFile ? lessonForm.file_name || null : null;
      let mime_type = needsFile ? lessonForm.mime_type || null : null;

      if (lessonFile && needsFile) {
        const key = editingLesson?.id || `${moduleId}-${Date.now()}`;
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

      if (editingLesson) {
        const { error: err } = await supabase
          .from("academy_lessons")
          .update(payload)
          .eq("id", editingLesson.id);
        if (err) throw err;
        toast.success("Lección actualizada");
      } else {
        const mod = modules?.find((m) => m.id === moduleId);
        const maxOrder = Math.max(
          0,
          ...((mod?.academy_lessons || []).map((l) => l.sort_order ?? 0)),
        );
        const { error: err } = await supabase.from("academy_lessons").insert({
          ...payload,
          sort_order: maxOrder + 1,
        });
        if (err) throw err;
        toast.success("Lección creada");
      }
      await invalidate();
      resetLessonForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al guardar lección");
    } finally {
      setUploading(false);
    }
  };

  const deleteLesson = async (id: string) => {
    if (!confirm("¿Eliminar esta lección?")) return;
    const { error: err } = await supabase.from("academy_lessons").delete().eq("id", id);
    if (err) {
      toast.error(err.message);
      return;
    }
    await invalidate();
    toast.success("Lección eliminada");
  };

  const toggleLessonPublished = async (lesson: LessonRow) => {
    const { error: err } = await supabase
      .from("academy_lessons")
      .update({ published: !lesson.published })
      .eq("id", lesson.id);
    if (err) {
      toast.error(err.message);
      return;
    }
    await invalidate();
    toast.success(lesson.published ? "Lección pasada a borrador" : "Lección publicada");
  };

  const moveModule = async (mod: ModuleRow, direction: -1 | 1) => {
    if (!modules?.length) return;
    const sorted = [...modules].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const idx = sorted.findIndex((m) => m.id === mod.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    const aOrder = mod.sort_order ?? idx;
    const bOrder = other.sort_order ?? swapIdx;
    const { error: e1 } = await supabase
      .from("academy_modules")
      .update({ sort_order: bOrder })
      .eq("id", mod.id);
    const { error: e2 } = await supabase
      .from("academy_modules")
      .update({ sort_order: aOrder })
      .eq("id", other.id);
    if (e1 || e2) {
      toast.error(e1?.message || e2?.message || "No se pudo reordenar");
      return;
    }
    await invalidate();
  };

  const moveLesson = async (moduleId: string, lesson: LessonRow, direction: -1 | 1) => {
    const mod = modules?.find((m) => m.id === moduleId);
    const sorted = [...(mod?.academy_lessons || [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    const idx = sorted.findIndex((l) => l.id === lesson.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    const aOrder = lesson.sort_order ?? idx;
    const bOrder = other.sort_order ?? swapIdx;
    const { error: e1 } = await supabase
      .from("academy_lessons")
      .update({ sort_order: bOrder })
      .eq("id", lesson.id);
    const { error: e2 } = await supabase
      .from("academy_lessons")
      .update({ sort_order: aOrder })
      .eq("id", other.id);
    if (e1 || e2) {
      toast.error(e1?.message || e2?.message || "No se pudo reordenar");
      return;
    }
    await invalidate();
  };

  if (isLoading) return <LoadingState text="Cargando Academy..." />;
  if (error) return <ErrorState title="Error" message="No se pudo cargar Academy" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kipper Academy</h1>
          <p className="text-muted-foreground">
            Gestión de módulos y lecciones — crear, editar, publicar y reordenar
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/productor/academy"
            className="btn-hero-outline text-sm px-4 py-2 inline-flex items-center gap-2"
          >
            <ExternalLink size={16} aria-hidden />
            Ver como productor
          </Link>
          <button
            onClick={() => {
              resetModuleForm();
              setShowModuleForm(true);
            }}
            className="btn-hero text-sm px-4 py-2 inline-flex items-center gap-2"
          >
            <Plus size={16} /> Nuevo Módulo
          </button>
        </div>
      </div>

      {!modules?.length ? (
        <EmptyState title="Sin módulos" description="Creá el primer módulo de capacitación" />
      ) : (
        <div className="space-y-4">
          {modules.map((mod, modIndex) => {
            const lessons = [...(mod.academy_lessons || [])].sort(
              (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
            );
            const isExpanded = expandedModule === mod.id;
            return (
              <div key={mod.id} className="bg-card rounded-2xl shadow-soft overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                      className="flex items-center gap-3 text-left flex-1 min-w-0"
                    >
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground text-lg">{mod.title}</h3>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              mod.published
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {mod.published ? "Publicado" : "Borrador"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {lessons.length} lecciones · /productor/academy/{mod.slug}
                        </p>
                      </div>
                    </button>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        title="Subir"
                        disabled={modIndex === 0}
                        onClick={() => moveModule(mod, -1)}
                        className="p-2 hover:bg-muted rounded-lg disabled:opacity-30"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        title="Bajar"
                        disabled={modIndex === modules.length - 1}
                        onClick={() => moveModule(mod, 1)}
                        className="p-2 hover:bg-muted rounded-lg disabled:opacity-30"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModuleForm({
                            title: mod.title,
                            slug: mod.slug,
                            description: mod.description || "",
                            published: mod.published,
                          });
                          setEditingModule(mod);
                          setShowModuleForm(true);
                        }}
                        className="p-2 hover:bg-muted rounded-lg"
                        aria-label="Editar módulo"
                      >
                        <Edit size={16} className="text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteModule(mod.id)}
                        className="p-2 hover:bg-muted rounded-lg"
                        aria-label="Eliminar módulo"
                      >
                        <Trash2 size={16} className="text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border px-6 pb-6">
                    {lessons.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">Sin lecciones aún</p>
                    ) : (
                      <div className="space-y-2 mt-4">
                        {lessons.map((lesson, lessonIndex) => {
                          const Icon = typeIcon[lesson.type as keyof typeof typeIcon] || Video;
                          return (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Icon size={16} className="text-primary shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {lesson.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {lesson.type} ·{" "}
                                    <span
                                      className={
                                        lesson.published ? "text-green-700" : "text-amber-700"
                                      }
                                    >
                                      {lesson.published ? "Publicada" : "Borrador"}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Link
                                  to={`/productor/academy/${mod.slug}/${lesson.slug}`}
                                  title="Ver como productor"
                                  className="p-1.5 hover:bg-muted rounded"
                                  aria-label={`Ver ${lesson.title} como productor`}
                                >
                                  <ExternalLink size={14} className="text-primary" />
                                </Link>
                                <button
                                  type="button"
                                  title="Subir"
                                  disabled={lessonIndex === 0}
                                  onClick={() => moveLesson(mod.id, lesson, -1)}
                                  className="p-1.5 hover:bg-muted rounded disabled:opacity-30"
                                >
                                  <ChevronUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  title="Bajar"
                                  disabled={lessonIndex === lessons.length - 1}
                                  onClick={() => moveLesson(mod.id, lesson, 1)}
                                  className="p-1.5 hover:bg-muted rounded disabled:opacity-30"
                                >
                                  <ChevronDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  title={lesson.published ? "Pasar a borrador" : "Publicar"}
                                  onClick={() => toggleLessonPublished(lesson)}
                                  className="p-1.5 hover:bg-muted rounded"
                                >
                                  {lesson.published ? (
                                    <EyeOff size={14} className="text-muted-foreground" />
                                  ) : (
                                    <Eye size={14} className="text-primary" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  title="Editar lección"
                                  onClick={() => openLessonEdit(lesson)}
                                  className="p-1.5 hover:bg-muted rounded"
                                  aria-label="Editar lección"
                                >
                                  <Edit size={14} className="text-muted-foreground" />
                                </button>
                                <button
                                  type="button"
                                  title="Eliminar"
                                  onClick={() => deleteLesson(lesson.id)}
                                  className="p-1.5 hover:bg-muted rounded"
                                  aria-label="Eliminar lección"
                                >
                                  <Trash2 size={14} className="text-destructive" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => openLessonCreate(mod.id)}
                      className="mt-4 text-sm text-primary font-medium hover:underline inline-flex items-center gap-1"
                    >
                      <Plus size={14} /> Agregar lección
                    </button>

                    {showLessonForm === mod.id && (
                      <div className="mt-4 p-4 bg-muted/20 rounded-xl space-y-3 border border-border/60">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">
                            {editingLesson ? "Editar lección" : "Nueva lección"}
                          </h4>
                          <button type="button" onClick={resetLessonForm}>
                            <X size={16} className="text-muted-foreground" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium">Título *</label>
                            <input
                              className="input-kipper mt-1"
                              value={lessonForm.title}
                              onChange={(e) =>
                                setLessonForm({ ...lessonForm, title: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Slug</label>
                            <input
                              className="input-kipper mt-1"
                              value={lessonForm.slug}
                              onChange={(e) =>
                                setLessonForm({ ...lessonForm, slug: e.target.value })
                              }
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
                              onChange={(e) =>
                                setLessonForm({ ...lessonForm, video_url: e.target.value })
                              }
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
                              onChange={(e) =>
                                setLessonForm({ ...lessonForm, content_text: e.target.value })
                              }
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
                              {lessonFile?.name ??
                                (editingLesson ? "Reemplazar archivo (opcional)" : "Subir archivo")}
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
                            onChange={(e) =>
                              setLessonForm({ ...lessonForm, published: e.target.checked })
                            }
                          />
                          Publicada
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveLesson(mod.id)}
                            disabled={uploading}
                            className="btn-hero text-sm px-4 py-2 disabled:opacity-60"
                          >
                            {uploading
                              ? "Subiendo..."
                              : editingLesson
                                ? "Actualizar lección"
                                : "Guardar lección"}
                          </button>
                          <button
                            type="button"
                            onClick={resetLessonForm}
                            className="btn-hero-outline text-sm px-4 py-2"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModuleForm && (
        <div
          className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4"
          onClick={resetModuleForm}
        >
          <div
            className="bg-card rounded-2xl shadow-elevated max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {editingModule ? "Editar Módulo" : "Nuevo Módulo"}
              </h2>
              <button type="button" onClick={resetModuleForm} className="text-muted-foreground">
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
                {editingModule ? "Actualizar" : "Crear Módulo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAcademy;
