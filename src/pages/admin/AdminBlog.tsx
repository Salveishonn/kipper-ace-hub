import { useState } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, X } from "lucide-react";
import { useBlogPosts, useCreateBlogPost, useUpdateBlogPost, useDeleteBlogPost } from "@/hooks/useBlogPosts";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { format } from "date-fns";

const AdminBlog = () => {
  const { data: posts, isLoading, error } = useBlogPosts();
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", excerpt: "", content: "", tags: "", status: "draft" as string });

  const resetForm = () => {
    setForm({ title: "", slug: "", excerpt: "", content: "", tags: "", status: "draft" });
    setEditingId(null);
    setShowEditor(false);
  };

  const openEdit = (post: any) => {
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content,
      tags: (post.tags || []).join(", "),
      status: post.status,
    });
    setEditingId(post.id);
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) {
      toast.error("Título y contenido son obligatorios");
      return;
    }
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const payload = {
      title: form.title,
      slug,
      excerpt: form.excerpt || null,
      content: form.content,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      status: form.status,
    };

    try {
      if (editingId) {
        await updatePost.mutateAsync({ id: editingId, ...payload });
        toast.success("Post actualizado");
      } else {
        await createPost.mutateAsync(payload);
        toast.success("Post creado");
      }
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este post?")) return;
    try {
      await deletePost.mutateAsync(id);
      toast.success("Post eliminado");
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar");
    }
  };

  const handleTogglePublish = async (post: any) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    try {
      await updatePost.mutateAsync({ id: post.id, status: newStatus });
      toast.success(newStatus === "published" ? "Publicado" : "Despublicado");
    } catch (err: any) {
      toast.error("Error al cambiar estado");
    }
  };

  if (isLoading) return <LoadingState text="Cargando blog..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar los posts" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blog / Comunidad</h1>
          <p className="text-muted-foreground">Gestión de contenido publicado en /comunidad</p>
        </div>
        <button onClick={() => { resetForm(); setShowEditor(true); }} className="btn-hero text-sm px-4 py-2 inline-flex items-center gap-2">
          <Plus size={16} /> Nuevo Post
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-foreground">{posts?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-green-600">{posts?.filter(p => p.status === "published").length || 0}</p>
          <p className="text-xs text-muted-foreground">Publicados</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-amber-600">{posts?.filter(p => p.status === "draft").length || 0}</p>
          <p className="text-xs text-muted-foreground">Borradores</p>
        </div>
      </div>

      {/* Posts List */}
      {!posts?.length ? (
        <EmptyState title="Sin posts" description="Creá tu primer post para la comunidad" />
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-card rounded-2xl shadow-soft p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground text-lg">{post.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${post.status === "published" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {post.status === "published" ? "Publicado" : "Borrador"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{post.excerpt || "Sin resumen"}</p>
                  <div className="flex gap-2 mt-2">
                    {(post.tags || []).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{tag}</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Slug: /comunidad/{post.slug} • {format(new Date(post.created_at), "dd/MM/yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleTogglePublish(post)} className="p-2 rounded-lg hover:bg-muted transition-colors" title={post.status === "published" ? "Despublicar" : "Publicar"}>
                    {post.status === "published" ? <EyeOff size={18} className="text-muted-foreground" /> : <Eye size={18} className="text-green-600" />}
                  </button>
                  <button onClick={() => openEdit(post)} className="p-2 rounded-lg hover:bg-muted transition-colors"><Edit size={18} className="text-muted-foreground" /></button>
                  <button onClick={() => handleDelete(post.id)} className="p-2 rounded-lg hover:bg-muted transition-colors"><Trash2 size={18} className="text-destructive" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => resetForm()}>
          <div className="bg-card rounded-2xl shadow-elevated max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">{editingId ? "Editar Post" : "Nuevo Post"}</h2>
              <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Título *</label>
                <input className="input-kipper mt-1" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Slug (auto si vacío)</label>
                <input className="input-kipper mt-1" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} placeholder="mi-primer-post" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Resumen</label>
                <input className="input-kipper mt-1" value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Contenido * (Markdown)</label>
                <textarea className="input-kipper mt-1 min-h-[200px] font-mono text-sm" value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Tags (separados por coma)</label>
                <input className="input-kipper mt-1" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="tips, auto, seguros" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Estado</label>
                <select className="input-kipper mt-1" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                </select>
              </div>
              <button onClick={handleSave} disabled={createPost.isPending || updatePost.isPending} className="btn-hero w-full text-sm py-3">
                {createPost.isPending || updatePost.isPending ? "Guardando..." : editingId ? "Actualizar" : "Crear Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBlog;
