import { useRef, useState } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, X, Paperclip, FileText, Image as ImageIcon, Film } from "lucide-react";
import {
  type BlogPost,
  useBlogPosts,
  useCreateBlogPost,
  useUpdateBlogPost,
  useDeleteBlogPost,
} from "@/hooks/useBlogPosts";
import {
  BLOG_ACCEPT,
  type BlogAttachment,
  blogFileError,
  isImageAttachment,
  isVideoAttachment,
} from "@/lib/blogMedia";
import { formatBytes } from "@/lib/forumFiles";
import { safeExternalUrl } from "@/lib/safeUrl";
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
  const emptyForm = { title: "", slug: "", excerpt: "", content: "", tags: "", status: "draft" as string, video_url: "" };
  const [form, setForm] = useState(emptyForm);
  const [existingFiles, setExistingFiles] = useState<BlogAttachment[]>([]);
  const [removedFiles, setRemovedFiles] = useState<BlogAttachment[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setForm(emptyForm);
    setExistingFiles([]);
    setRemovedFiles([]);
    setNewFiles([]);
    setEditingId(null);
    setShowEditor(false);
  };

  const openEdit = (post: BlogPost) => {
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content,
      tags: (post.tags || []).join(", "),
      status: post.status,
      video_url: post.video_url || "",
    });
    setExistingFiles(post.blog_post_attachments ?? []);
    setRemovedFiles([]);
    setNewFiles([]);
    setEditingId(post.id);
    setShowEditor(true);
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      const err = blogFileError(file);
      if (err) toast.error(err);
      else accepted.push(file);
    }
    setNewFiles((prev) => [...prev, ...accepted]);
    if (fileInput.current) fileInput.current.value = "";
  };

  const handleSave = async () => {
    const hasMedia = Boolean(form.video_url.trim()) || existingFiles.length > 0 || newFiles.length > 0;
    if (!form.title || (!form.content.trim() && !hasMedia)) {
      toast.error("Poné un título y agregá contenido, un video o archivos");
      return;
    }
    const videoUrl = form.video_url.trim() ? safeExternalUrl(form.video_url) : null;
    if (form.video_url.trim() && !videoUrl) {
      toast.error("El link del video tiene que empezar con https://");
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
      video_url: videoUrl,
    };
    const media = { newFiles, removed: removedFiles };
    const nextPosition = existingFiles.reduce((max, f) => Math.max(max, f.position + 1), 0);

    try {
      if (editingId) {
        await updatePost.mutateAsync({ id: editingId, ...payload, media, nextPosition });
        toast.success("Post actualizado");
      } else {
        await createPost.mutateAsync({ ...payload, media });
        toast.success("Post creado");
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!confirm("¿Eliminar este post y sus archivos?")) return;
    try {
      await deletePost.mutateAsync(post);
      toast.success("Post eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    try {
      await updatePost.mutateAsync({ id: post.id, status: newStatus });
      toast.success(newStatus === "published" ? "Publicado" : "Despublicado");
    } catch {
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
                    {(post.blog_post_attachments?.length ?? 0) > 0 && `${post.blog_post_attachments.length} archivo(s) • `}
                    {post.video_url && "Video • "}
                    Slug: /comunidad/{post.slug} • {format(new Date(post.created_at), "dd/MM/yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleTogglePublish(post)} className="p-2 rounded-lg hover:bg-muted transition-colors" title={post.status === "published" ? "Despublicar" : "Publicar"}>
                    {post.status === "published" ? <EyeOff size={18} className="text-muted-foreground" /> : <Eye size={18} className="text-green-600" />}
                  </button>
                  <button onClick={() => openEdit(post)} className="p-2 rounded-lg hover:bg-muted transition-colors"><Edit size={18} className="text-muted-foreground" /></button>
                  <button onClick={() => handleDelete(post)} className="p-2 rounded-lg hover:bg-muted transition-colors"><Trash2 size={18} className="text-destructive" /></button>
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
                <label className="text-sm font-medium text-foreground">Contenido</label>
                <textarea className="input-kipper mt-1 min-h-[200px] text-sm" value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="blog-video-url">Video de YouTube o Vimeo (opcional)</label>
                <input
                  id="blog-video-url"
                  className="input-kipper mt-1"
                  value={form.video_url}
                  onChange={e => setForm({...form, video_url: e.target.value})}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Archivos (PDF, Word, Excel, PowerPoint, imágenes, videos)</span>
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    <Paperclip size={14} /> Agregar
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    accept={BLOG_ACCEPT}
                    className="hidden"
                    onChange={e => addFiles(e.target.files)}
                  />
                </div>
                {existingFiles.length === 0 && newFiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Hasta 50 MB por archivo. La primera imagen se usa como portada.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {existingFiles.map(f => {
                      const Icon = isImageAttachment(f) ? ImageIcon : isVideoAttachment(f) ? Film : FileText;
                      return (
                        <li key={f.id} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                          <Icon size={14} className="shrink-0 text-primary" />
                          <span className="min-w-0 flex-1 truncate">{f.file_name}</span>
                          <span className="text-xs text-muted-foreground">{formatBytes(f.size_bytes)}</span>
                          <button
                            type="button"
                            aria-label={`Quitar ${f.file_name}`}
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setExistingFiles(prev => prev.filter(x => x.id !== f.id));
                              setRemovedFiles(prev => [...prev, f]);
                            }}
                          >
                            <X size={14} />
                          </button>
                        </li>
                      );
                    })}
                    {newFiles.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 px-3 py-2 text-sm">
                        <Paperclip size={14} className="shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate">{f.name}</span>
                        <span className="text-xs text-muted-foreground">{formatBytes(f.size)} · nuevo</span>
                        <button
                          type="button"
                          aria-label={`Quitar ${f.name}`}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setNewFiles(prev => prev.filter((_, j) => j !== i))}
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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
                {createPost.isPending || updatePost.isPending ? (newFiles.length ? "Subiendo archivos..." : "Guardando...") : editingId ? "Actualizar" : "Crear Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBlog;
