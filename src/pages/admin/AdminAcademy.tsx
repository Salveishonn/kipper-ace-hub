import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  Video,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  Image,
  FileSpreadsheet,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { AcademyLessonForm } from "@/components/academy/AcademyLessonForm";
import { AcademyModuleForm } from "@/components/academy/AcademyModuleForm";
import { invalidateAcademyQueries } from "@/components/academy/academyQueries";
import {
  ADMIN_ACADEMY_BASE,
  PRODUCER_ACADEMY_BASE,
  type AcademyLessonRow,
  type AcademyModuleRow,
} from "@/components/academy/types";

function useAcademyModules() {
  return useQuery({
    queryKey: ["academy_modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_modules")
        .select("*, academy_lessons(*)")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as AcademyModuleRow[];
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
  const [editingModule, setEditingModule] = useState<AcademyModuleRow | null>(null);
  const [editingLesson, setEditingLesson] = useState<AcademyLessonRow | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const invalidate = () => invalidateAcademyQueries(queryClient);

  const resetModuleForm = () => {
    setEditingModule(null);
    setShowModuleForm(false);
  };

  const resetLessonForm = () => {
    setEditingLesson(null);
    setShowLessonForm(null);
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
    setShowLessonForm(moduleId);
  };

  const openLessonEdit = (lesson: AcademyLessonRow) => {
    setEditingLesson(lesson);
    setShowLessonForm(lesson.module_id);
    setExpandedModule(lesson.module_id);
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

  const toggleLessonPublished = async (lesson: AcademyLessonRow) => {
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

  const moveModule = async (mod: AcademyModuleRow, direction: -1 | 1) => {
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

  const moveLesson = async (moduleId: string, lesson: AcademyLessonRow, direction: -1 | 1) => {
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
            to={PRODUCER_ACADEMY_BASE}
            className="btn-hero-outline text-sm px-4 py-2 inline-flex items-center gap-2"
          >
            <ExternalLink size={16} aria-hidden />
            Ver como productor
          </Link>
          <button
            onClick={() => {
              setEditingModule(null);
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
                    <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                        className="p-1 hover:bg-muted rounded-lg shrink-0"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? `Colapsar ${mod.title}` : `Expandir ${mod.title}`}
                      >
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </button>
                      <Link to={`${ADMIN_ACADEMY_BASE}/${mod.slug}`} className="min-w-0 flex-1 group">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground text-lg group-hover:text-primary">
                            {mod.title}
                          </h3>
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
                          {lessons.length} lecciones · clic para ver como productor
                        </p>
                      </Link>
                    </div>
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
                              <Link
                                to={`${ADMIN_ACADEMY_BASE}/${mod.slug}/${lesson.slug}`}
                                className="flex items-center gap-3 min-w-0 flex-1 group"
                              >
                                <Icon size={16} className="text-primary shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary">
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
                              </Link>
                              <div className="flex items-center gap-1 shrink-0">
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
                      <AcademyLessonForm
                        key={editingLesson?.id ?? "new"}
                        moduleId={mod.id}
                        lesson={editingLesson?.module_id === mod.id ? editingLesson : null}
                        nextSortOrder={
                          Math.max(0, ...lessons.map((l) => l.sort_order ?? 0)) + 1
                        }
                        onCancel={resetLessonForm}
                        onSaved={resetLessonForm}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModuleForm && (
        <AcademyModuleForm
          module={editingModule}
          nextSortOrder={Math.max(0, ...(modules || []).map((m) => m.sort_order ?? 0)) + 1}
          onCancel={resetModuleForm}
          onSaved={resetModuleForm}
        />
      )}
    </div>
  );
};

export default AdminAcademy;
