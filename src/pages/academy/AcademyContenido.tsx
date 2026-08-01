import { Link } from "react-router-dom";
import { Video, MessageSquare, FileText, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LoadingState, EmptyState } from "@/components/ui/loading-state";

const typeIcon = { video: Video, chat: MessageSquare, pdf: FileText };

/** Internal Academy library. Rendered inside ProductorLayout at /productor/academy. */
const AcademyContenido = () => {
  const { data: modules, isLoading } = useQuery({
    queryKey: ["academy_modules_published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_modules")
        .select("*, academy_lessons(*)")
        .eq("published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Academy</h1>
        <p className="text-muted-foreground">Tu biblioteca de capacitación profesional</p>
      </div>

      {isLoading ? (
        <LoadingState text="Cargando módulos..." />
      ) : !modules?.length ? (
        <EmptyState
          title="Sin contenido aún"
          description="Próximamente habrá módulos de capacitación disponibles."
        />
      ) : (
        <div className="space-y-6">
          {modules.map((mod: any) => {
            const lessons = (mod.academy_lessons || []).filter((l: any) => l.published);
            return (
              <div key={mod.id} className="bg-card rounded-xl border border-border/60 shadow-soft overflow-hidden">
                <div className="p-5 border-b border-border">
                  <h2 className="text-lg font-bold text-foreground">{mod.title}</h2>
                  {mod.description && <p className="text-muted-foreground mt-1 text-sm">{mod.description}</p>}
                  <p className="text-xs text-muted-foreground mt-2">
                    {lessons.length} {lessons.length === 1 ? "lección" : "lecciones"}
                  </p>
                </div>
                {lessons.length > 0 && (
                  <div className="divide-y divide-border">
                    {lessons.map((lesson: any) => {
                      const Icon = typeIcon[lesson.type as keyof typeof typeIcon] || Video;
                      return (
                        <Link
                          key={lesson.id}
                          to={`/productor/academy/${mod.slug}/${lesson.slug}`}
                          className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                        >
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Icon size={18} className="text-primary" aria-hidden />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{lesson.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">{lesson.type}</p>
                          </div>
                          <ChevronRight size={18} className="text-muted-foreground" aria-hidden />
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
  );
};

export default AcademyContenido;
