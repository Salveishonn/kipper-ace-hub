import { Link, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Calendar, ArrowRight, Tag, Search } from "lucide-react";
import { useBlogPosts, useBlogPost } from "@/hooks/useBlogPosts";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Blog post detail sub-component
const BlogPostDetail = ({ slug }: { slug: string }) => {
  const { data: post, isLoading, error } = useBlogPost(slug);

  if (isLoading) return <MainLayout><LoadingState text="Cargando artículo..." /></MainLayout>;
  if (error || !post) return (
    <MainLayout>
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Artículo no encontrado</h1>
        <Link to="/comunidad" className="text-primary hover:underline">Volver a Comunidad</Link>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-3xl mx-auto px-4">
          <Link to="/comunidad" className="text-sm opacity-80 hover:opacity-100 mb-4 inline-block">← Volver a Comunidad</Link>
          <div className="flex gap-2 mb-4">
            {(post.tags || []).map(tag => (
              <span key={tag} className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">{tag}</span>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>
          {post.published_at && (
            <p className="text-sm opacity-80">{format(new Date(post.published_at), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
          )}
        </div>
      </section>
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-card rounded-2xl shadow-soft p-8">
            <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
              {post.content}
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

// Main listing
const ComunidadPage = () => {
  const { slug } = useParams();

  // If we have a slug, show the detail view
  if (slug) {
    return <BlogPostDetail slug={slug} />;
  }

  return <ComunidadListing />;
};

const ComunidadListing = () => {
  const { data: posts, isLoading, error } = useBlogPosts(true);

  // Fallback mock data when no DB posts exist
  const mockPosts = [
    { id: "1", title: "¿Cuándo comienza la cobertura de una póliza?", excerpt: "Conocé el día y horario de inicio de tu cobertura.", tags: ["Tips"], slug: "cuando-comienza-cobertura", published_at: "2025-01-15", status: "published" },
    { id: "2", title: "Cómo conducir con niebla", excerpt: "Consejos para manejar con seguridad.", tags: ["KipperTips"], slug: "conducir-con-niebla", published_at: "2025-01-12", status: "published" },
    { id: "3", title: "Mitos sobre el seguro de auto", excerpt: "Desmintiendo creencias populares.", tags: ["Mitos"], slug: "mitos-seguro-auto", published_at: "2025-01-10", status: "published" },
  ];

  const displayPosts = posts && posts.length > 0 ? posts : mockPosts;

  return (
    <MainLayout>
      <section className="bg-primary text-primary-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Comunidad Kipper</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Tips, novedades y todo lo que necesitás saber sobre seguros.
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <LoadingState text="Cargando artículos..." />
          ) : error ? (
            <ErrorState title="Error" message="No se pudieron cargar los artículos" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayPosts.map((post: any) => (
                <article key={post.id} className="bg-card rounded-2xl shadow-soft overflow-hidden group hover:shadow-card transition-shadow">
                  <div className="h-48 bg-muted flex items-center justify-center">
                    <span className="text-6xl">📰</span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-3">
                      {(post.tags || []).map((tag: string) => (
                        <span key={tag} className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                          <Tag size={12} /> {tag}
                        </span>
                      ))}
                      {post.published_at && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar size={12} />
                          {format(new Date(post.published_at), "d MMM yyyy", { locale: es })}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{post.title}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{post.excerpt}</p>
                    <Link to={`/comunidad/${post.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      Leer más <ArrowRight size={14} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
};

export default ComunidadPage;
