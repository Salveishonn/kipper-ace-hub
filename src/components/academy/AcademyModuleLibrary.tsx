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
import { useAuth } from "@/hooks/useAuth";
import type { AcademyLessonRow, AcademyModuleRow } from "@/components/academy/types";

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

export function useAcademyLibrary() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ["academy_modules_library", isAdmin],
    queryFn: async () => {
      let query = supabase
        .from("academy_modules")
        .select("*, academy_lessons(*)")
        .order("sort_order", { ascending: true });
      if (!isAdmin) {
        query = query.eq("published", true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AcademyModuleRow[];
    },
  });
}

type AcademyModuleLibraryProps = {
  basePath: string;
  moduleSlug?: string;
  showIntro?: boolean;
  notFoundHref?: string;
};

export function AcademyModuleLibrary({
  basePath,
  moduleSlug,
  showIntro = true,
  notFoundHref,
}: AcademyModuleLibraryProps) {
  const { isAdmin } = useAuth();
  const { data: modules, isLoading } = useAcademyLibrary();
  const backHref = notFoundHref ?? basePath;

  const visibleModules = (modules || [])
    .map((mod) => {
      const lessons = [...(mod.academy_lessons || [])]
        .filter((l) => isAdmin || l.published)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      return { ...mod, lessons };
    })
    .filter((mod) => (moduleSlug ? mod.slug === moduleSlug : mod.lessons.length > 0));

  if (isLoading) return <LoadingState text="Cargando módulos..." />;

  if (moduleSlug && !visibleModules.length) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Módulo no encontrado</h1>
        <Link to={backHref} className="text-primary hover:underline">
          Volver a Academy
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {showIntro && (
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
              {isAdmin && (
                <p className="text-sm text-primary mt-2">
                  Vista previa de administrador: ves los módulos y lecciones como en el portal, incluidos
                  borradores.
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-3">
                {visibleModules.length}{" "}
                {visibleModules.length === 1 ? "módulo disponible" : "módulos disponibles"}
                {" · "}
                {visibleModules.reduce((n, m) => n + m.lessons.length, 0)} lecciones
              </p>
            </div>
          </div>
        </div>
      )}

      {!visibleModules.length ? (
        <EmptyState
          title="Sin contenido aún"
          description="Próximamente habrá módulos de capacitación disponibles."
        />
      ) : (
        <div className="space-y-6">
          {visibleModules.map((mod) => (
            <ModuleSection key={mod.id} mod={mod} basePath={basePath} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleSection({
  mod,
  basePath,
  isAdmin,
}: {
  mod: AcademyModuleRow & { lessons: AcademyLessonRow[] };
  basePath: string;
  isAdmin: boolean;
}) {
  const counts = mod.lessons.reduce(
    (acc, l) => {
      acc[l.type] = (acc[l.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <section className="bg-card rounded-2xl border border-border/60 shadow-soft overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-border bg-muted/20">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{mod.title}</h2>
          {isAdmin && !mod.published && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
              Borrador
            </span>
          )}
        </div>
        {mod.description && (
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{mod.description}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
            {mod.lessons.length} {mod.lessons.length === 1 ? "lección" : "lecciones"}
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
        {mod.lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 sm:px-6">Sin lecciones aún</p>
        ) : (
          mod.lessons.map((lesson, index) => {
            const Icon = typeIcon[lesson.type as keyof typeof typeIcon] || Video;
            return (
              <Link
                key={lesson.id}
                to={`${basePath}/${mod.slug}/${lesson.slug}`}
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
                    {isAdmin && !lesson.published ? " · borrador" : ""}
                  </p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" aria-hidden />
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
