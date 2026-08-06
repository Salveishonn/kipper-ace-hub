import { Link } from "react-router-dom";
import {
  Video,
  MessageSquare,
  FileText,
  ChevronRight,
  BookOpen,
  Image,
  FileSpreadsheet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LoadingState, EmptyState } from "@/components/ui/loading-state";

const typeIcon = {
  video: Video,
  chat: MessageSquare,
  pdf: FileText,
  word: FileText,
  excel: FileSpreadsheet,
  image: Image,
};
const typeLabel = {
  video: "Video",
  chat: "Texto",
  pdf: "PDF",
  word: "Word",
  excel: "Excel",
  image: "Imagen",
};

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
      return data || [];
    },
  });

  const visibleModules = (modules || [])
    .map((mod) => {
      const lessons = [...(mod.academy_lessons || [])]
        .filter((l) => l.published)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      return { ...mod, lessons };
    })
    .filter((mod) => mod.lessons.length > 0);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-background to-background border border-border/60 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <BookOpen className="text-primary" size={22} aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Academy</h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Tu biblioteca de capacitación profesional. Avanzá módulo por módulo con videos, guías y
              material descargable.
            </p>
            {!isLoading && (
              <p className="text-sm text-muted-foreground mt-3">
                {visibleModules.length}{" "}
                {visibleModules.length === 1 ? "módulo disponible" : "módulos disponibles"}
                {" · "}
                {visibleModules.reduce((n, m) => n + m.lessons.length, 0)} lecciones
              </p>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState text="Cargando módulos..." />
      ) : !visibleModules.length ? (
        <EmptyState
          title="Sin contenido aún"
          description="Próximamente habrá módulos de capacitación disponibles."
        />
      ) : (
        <div className="space-y-6">
          {visibleModules.map((mod) => {
            const counts = mod.lessons.reduce(
              (acc, l) => {
                acc[l.type] = (acc[l.type] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>,
            );
            return (
              <section
                key={mod.id}
                className="bg-card rounded-2xl border border-border/60 shadow-soft overflow-hidden"
              >
                <div className="p-5 sm:p-6 border-b border-border bg-muted/20">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">{mod.title}</h2>
                  {mod.description && (
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {mod.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                      {mod.lessons.length}{" "}
                      {mod.lessons.length === 1 ? "lección" : "lecciones"}
                    </span>
                    {Object.entries(counts).map(([type, n]) => (
                      <span
                        key={type}
                        className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
                      >
                        {n} {typeLabel[type as keyof typeof typeLabel] || type}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {mod.lessons.map((lesson, index) => {
                    const Icon = typeIcon[lesson.type as keyof typeof typeIcon] || Video;
                    return (
                      <Link
                        key={lesson.id}
                        to={`/productor/academy/${mod.slug}/${lesson.slug}`}
                        className="flex items-center gap-4 p-4 sm:px-6 hover:bg-muted/40 transition-colors"
                      >
                        <span className="text-xs font-semibold text-muted-foreground w-6 tabular-nums">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon size={18} className="text-primary" aria-hidden />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{lesson.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {typeLabel[lesson.type as keyof typeof typeLabel] || lesson.type}
                          </p>
                        </div>
                        <ChevronRight size={18} className="text-muted-foreground" aria-hidden />
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AcademyContenido;
