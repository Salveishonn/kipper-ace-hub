import { Link } from "react-router-dom";
import { BookOpen, Video, MessageSquare, FileText, ChevronRight, Lock } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LoadingState, EmptyState } from "@/components/ui/loading-state";
import { Navigate } from "react-router-dom";

const typeIcon = { video: Video, chat: MessageSquare, pdf: FileText };

const AcademyContenido = () => {
  const { isProductor, isAdmin, user, loading, rolesLoaded } = useAuth();
  const hasAccess = isProductor || isAdmin;

  const { data: modules, isLoading } = useQuery({
    queryKey: ["academy_modules_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_modules")
        .select("*, academy_lessons(*)")
        .eq("published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: hasAccess,
  });

  if (loading || !rolesLoaded) return <LoadingState text="Cargando..." />;

  if (!user || !hasAccess) {
    return <Navigate to="/academy" replace />;
  }

  return (
    <MainLayout>
      <section className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={24} />
            <h1 className="text-3xl font-bold">Kipper Academy — Contenido</h1>
          </div>
          <p className="text-lg opacity-90">Tu biblioteca de capacitación profesional</p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <LoadingState text="Cargando módulos..." />
          ) : !modules?.length ? (
            <EmptyState title="Sin contenido aún" description="Próximamente habrá módulos de capacitación disponibles" />
          ) : (
            <div className="space-y-8">
              {modules.map((mod: any) => {
                const lessons = (mod.academy_lessons || []).filter((l: any) => l.published);
                return (
                  <div key={mod.id} className="bg-card rounded-2xl shadow-soft overflow-hidden">
                    <div className="p-6 border-b border-border">
                      <h2 className="text-xl font-bold text-foreground">{mod.title}</h2>
                      {mod.description && <p className="text-muted-foreground mt-1">{mod.description}</p>}
                      <p className="text-sm text-muted-foreground mt-2">{lessons.length} lecciones</p>
                    </div>
                    {lessons.length > 0 && (
                      <div className="divide-y divide-border">
                        {lessons.map((lesson: any) => {
                          const Icon = typeIcon[lesson.type as keyof typeof typeIcon] || Video;
                          return (
                            <Link
                              key={lesson.id}
                              to={`/academy/${mod.slug}/${lesson.slug}`}
                              className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                            >
                              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Icon size={18} className="text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{lesson.title}</p>
                                <p className="text-xs text-muted-foreground capitalize">{lesson.type}</p>
                              </div>
                              <ChevronRight size={18} className="text-muted-foreground" />
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
};

export default AcademyContenido;
