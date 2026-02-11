import { useState } from "react";
import { Plus, Edit, Trash2, BookOpen, Video, FileText, MessageSquare, X, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { toast } from "sonner";

function useAcademyModules() {
  return useQuery({
    queryKey: ["academy_modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_modules")
        .select("*, academy_lessons(*)")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

const typeIcon = { video: Video, chat: MessageSquare, pdf: FileText };

const AdminAcademy = () => {
  const queryClient = useQueryClient();
  const { data: modules, isLoading, error } = useAcademyModules();
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const [moduleForm, setModuleForm] = useState({ title: "", slug: "", description: "", published: false });
  const [lessonForm, setLessonForm] = useState({ title: "", slug: "", type: "video" as string, video_url: "", content_text: "", published: false });

  const resetModuleForm = () => { setModuleForm({ title: "", slug: "", description: "", published: false }); setEditingModule(null); setShowModuleForm(false); };
  const resetLessonForm = () => { setLessonForm({ title: "", slug: "", type: "video", video_url: "", content_text: "", published: false }); setShowLessonForm(null); };

  const saveModule = async () => {
    if (!moduleForm.title) { toast.error("El título es obligatorio"); return; }
    const slug = moduleForm.slug || moduleForm.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    try {
      if (editingModule) {
        await supabase.from("academy_modules").update({ title: moduleForm.title, slug, description: moduleForm.description, published: moduleForm.published }).eq("id", editingModule.id);
      } else {
        await supabase.from("academy_modules").insert({ title: moduleForm.title, slug, description: moduleForm.description, published: moduleForm.published });
      }
      queryClient.invalidateQueries({ queryKey: ["academy_modules"] });
      toast.success(editingModule ? "Módulo actualizado" : "Módulo creado");
      resetModuleForm();
    } catch (err: any) { toast.error(err.message); }
  };

  const deleteModule = async (id: string) => {
    if (!confirm("¿Eliminar este módulo y sus lecciones?")) return;
    await supabase.from("academy_modules").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["academy_modules"] });
    toast.success("Módulo eliminado");
  };

  const saveLesson = async (moduleId: string) => {
    if (!lessonForm.title) { toast.error("El título es obligatorio"); return; }
    const slug = lessonForm.slug || lessonForm.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    try {
      await supabase.from("academy_lessons").insert({
        module_id: moduleId,
        title: lessonForm.title,
        slug,
        type: lessonForm.type,
        video_url: lessonForm.video_url || null,
        content_text: lessonForm.content_text || null,
        published: lessonForm.published,
      });
      queryClient.invalidateQueries({ queryKey: ["academy_modules"] });
      toast.success("Lección creada");
      resetLessonForm();
    } catch (err: any) { toast.error(err.message); }
  };

  const deleteLesson = async (id: string) => {
    if (!confirm("¿Eliminar esta lección?")) return;
    await supabase.from("academy_lessons").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["academy_modules"] });
    toast.success("Lección eliminada");
  };

  if (isLoading) return <LoadingState text="Cargando Academy..." />;
  if (error) return <ErrorState title="Error" message="No se pudo cargar Academy" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kipper Academy</h1>
          <p className="text-muted-foreground">Gestión de módulos y lecciones de capacitación</p>
        </div>
        <button onClick={() => { resetModuleForm(); setShowModuleForm(true); }} className="btn-hero text-sm px-4 py-2 inline-flex items-center gap-2">
          <Plus size={16} /> Nuevo Módulo
        </button>
      </div>

      {!modules?.length ? (
        <EmptyState title="Sin módulos" description="Creá el primer módulo de capacitación" />
      ) : (
        <div className="space-y-4">
          {modules.map((mod: any) => {
            const lessons = mod.academy_lessons || [];
            const isExpanded = expandedModule === mod.id;
            return (
              <div key={mod.id} className="bg-card rounded-2xl shadow-soft overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setExpandedModule(isExpanded ? null : mod.id)} className="flex items-center gap-3 text-left flex-1">
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground text-lg">{mod.title}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${mod.published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {mod.published ? "Publicado" : "Borrador"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{lessons.length} lecciones • /academy/{mod.slug}</p>
                      </div>
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => { setModuleForm({ title: mod.title, slug: mod.slug, description: mod.description || "", published: mod.published }); setEditingModule(mod); setShowModuleForm(true); }} className="p-2 hover:bg-muted rounded-lg"><Edit size={16} className="text-muted-foreground" /></button>
                      <button onClick={() => deleteModule(mod.id)} className="p-2 hover:bg-muted rounded-lg"><Trash2 size={16} className="text-destructive" /></button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border px-6 pb-6">
                    {lessons.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">Sin lecciones aún</p>
                    ) : (
                      <div className="space-y-2 mt-4">
                        {lessons.map((lesson: any) => {
                          const Icon = typeIcon[lesson.type as keyof typeof typeIcon] || Video;
                          return (
                            <div key={lesson.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Icon size={16} className="text-primary" />
                                <div>
                                  <p className="text-sm font-medium text-foreground">{lesson.title}</p>
                                  <p className="text-xs text-muted-foreground">{lesson.type} • {lesson.published ? "Publicada" : "Borrador"}</p>
                                </div>
                              </div>
                              <button onClick={() => deleteLesson(lesson.id)} className="p-1 hover:bg-muted rounded"><Trash2 size={14} className="text-destructive" /></button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <button onClick={() => setShowLessonForm(mod.id)} className="mt-4 text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
                      <Plus size={14} /> Agregar lección
                    </button>

                    {/* Lesson Form */}
                    {showLessonForm === mod.id && (
                      <div className="mt-4 p-4 bg-muted/20 rounded-xl space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium">Título *</label>
                            <input className="input-kipper mt-1" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Tipo</label>
                            <select className="input-kipper mt-1" value={lessonForm.type} onChange={e => setLessonForm({...lessonForm, type: e.target.value})}>
                              <option value="video">Video</option>
                              <option value="chat">Chat / Texto</option>
                              <option value="pdf">PDF</option>
                            </select>
                          </div>
                        </div>
                        {lessonForm.type === "video" && (
                          <div>
                            <label className="text-sm font-medium">URL del video</label>
                            <input className="input-kipper mt-1" value={lessonForm.video_url} onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})} placeholder="https://youtube.com/..." />
                          </div>
                        )}
                        {lessonForm.type === "chat" && (
                          <div>
                            <label className="text-sm font-medium">Contenido</label>
                            <textarea className="input-kipper mt-1 min-h-[100px]" value={lessonForm.content_text} onChange={e => setLessonForm({...lessonForm, content_text: e.target.value})} />
                          </div>
                        )}
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={lessonForm.published} onChange={e => setLessonForm({...lessonForm, published: e.target.checked})} />
                          Publicar inmediatamente
                        </label>
                        <div className="flex gap-2">
                          <button onClick={() => saveLesson(mod.id)} className="btn-hero text-sm px-4 py-2">Guardar</button>
                          <button onClick={resetLessonForm} className="btn-hero-outline text-sm px-4 py-2">Cancelar</button>
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

      {/* Module Form Modal */}
      {showModuleForm && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={resetModuleForm}>
          <div className="bg-card rounded-2xl shadow-elevated max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">{editingModule ? "Editar Módulo" : "Nuevo Módulo"}</h2>
              <button onClick={resetModuleForm} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Título *</label>
                <input className="input-kipper mt-1" value={moduleForm.title} onChange={e => setModuleForm({...moduleForm, title: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Slug (auto si vacío)</label>
                <input className="input-kipper mt-1" value={moduleForm.slug} onChange={e => setModuleForm({...moduleForm, slug: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Descripción</label>
                <textarea className="input-kipper mt-1 min-h-[80px]" value={moduleForm.description} onChange={e => setModuleForm({...moduleForm, description: e.target.value})} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={moduleForm.published} onChange={e => setModuleForm({...moduleForm, published: e.target.checked})} />
                Publicar inmediatamente
              </label>
              <button onClick={saveModule} className="btn-hero w-full text-sm py-3">
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
