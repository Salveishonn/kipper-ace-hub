import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  MessageSquare,
  Newspaper,
  Palette,
  Play,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LoadingState, EmptyState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { AcademyMaterials } from "@/components/academy/AcademyMaterials";
import {
  countLabel,
  lessonIcon,
  lessonLabel,
  lessonThumbnail,
  lessonTypeCount,
  materialLessons,
  moduleCover,
  normalizeSearch,
} from "@/components/academy/academyLessonMeta";
import {
  countCompleted,
  findResumePoint,
  progressLabel,
  useAcademyProgress,
  type AcademyProgress,
} from "@/components/academy/academyProgress";
import type { AcademyLessonRow, AcademyModuleRow } from "@/components/academy/types";

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

type LibraryModule = AcademyModuleRow & { lessons: AcademyLessonRow[] };

const portalLinks = [
  { href: "/productor/recursos", label: "Recursos gráficos", description: "Plantillas para redes", icon: Palette },
  { href: "/productor/novedades", label: "Novedades", description: "Actualizaciones semanales", icon: Newspaper },
  { href: "/productor/consultas", label: "Consultas", description: "Casos con el equipo Kipper", icon: MessageSquare },
];

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
  const progress = useAcademyProgress();
  const backHref = notFoundHref ?? basePath;

  const allModules: LibraryModule[] = (modules || []).map((mod) => {
    const lessons = [...(mod.academy_lessons || [])]
      .filter((l) => isAdmin || l.published)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return { ...mod, lessons };
  });

  if (isLoading) return <LoadingState text="Cargando módulos..." />;

  if (moduleSlug) {
    const mod = allModules.find((m) => m.slug === moduleSlug);
    if (!mod) {
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
      <ModuleView
        mod={mod}
        basePath={basePath}
        isAdmin={isAdmin}
        showBreadcrumb={showIntro}
        progress={progress}
      />
    );
  }

  return (
    <ClassroomView
      modules={allModules.filter((m) => m.lessons.length > 0)}
      basePath={basePath}
      isAdmin={isAdmin}
      progress={progress}
    />
  );
}

function ClassroomView({
  modules,
  basePath,
  isAdmin,
  progress,
}: {
  modules: LibraryModule[];
  basePath: string;
  isAdmin: boolean;
  progress: AcademyProgress;
}) {
  const [search, setSearch] = useState("");
  const lessons = modules.flatMap((m) => m.lessons);
  const materials = modules.flatMap((m) =>
    materialLessons(m.lessons).map((lesson) => ({ lesson, moduleSlug: m.slug, moduleTitle: m.title })),
  );
  const resume = findResumePoint(
    modules.flatMap((m) => m.lessons.map((lesson) => ({ id: lesson.id, lesson, mod: m }))),
    progress.completed,
  );
  const completedCount = countCompleted(lessons, progress.completed);

  const videoCount = lessons.filter((l) => l.type === "video").length;
  const stats = [
    { label: modules.length === 1 ? "Módulo" : "Módulos", value: modules.length },
    { label: lessons.length === 1 ? "Lección" : "Lecciones", value: lessons.length },
    { label: videoCount === 1 ? "Video" : "Videos", value: videoCount },
    { label: materials.length === 1 ? "Material" : "Materiales", value: materials.length },
  ];

  const term = normalizeSearch(search);
  const results = term
    ? modules.flatMap((m) =>
        m.lessons
          .filter((l) => normalizeSearch(`${l.title} ${l.file_name ?? ""}`).includes(term))
          .map((lesson) => ({ lesson, mod: m })),
      )
    : [];

  return (
    <div className="space-y-8">
      <header className="kipper-header-bar rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-80">
              <GraduationCap size={16} aria-hidden /> Aula virtual
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-2">Academy</h1>
            <p className="mt-2 opacity-90">
              Tu biblioteca de capacitación profesional. Avanzá módulo por módulo con videos, guías y
              material descargable.
            </p>
            {isAdmin && (
              <p className="text-sm mt-3 opacity-90">
                Vista previa de administrador: ves los módulos y lecciones como en el portal, incluidos
                borradores.
              </p>
            )}
          </div>
          {resume && !progress.loading && (
            <Link
              to={`${basePath}/${resume.lesson.mod.slug}/${resume.lesson.lesson.slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-background text-primary font-semibold px-5 py-3 text-sm shrink-0 sm:max-w-xs hover:bg-background/90 transition-colors"
            >
              <Play size={16} className="shrink-0" aria-hidden />
              {!progress.tracked ? (
                "Ir a la primera lección"
              ) : resume.status === "start" ? (
                "Empezar primera lección"
              ) : resume.status === "done" ? (
                "Repasar desde el inicio"
              ) : (
                <span className="min-w-0">
                  <span className="block">Continuar</span>
                  <span className="block truncate text-xs font-normal">{resume.lesson.lesson.title}</span>
                </span>
              )}
            </Link>
          )}
        </div>
        {progress.tracked && modules.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium mb-1.5">{progressLabel(completedCount, lessons.length)}</p>
            <Progress
              value={(completedCount / lessons.length) * 100}
              aria-label="Progreso en Academy"
              className="h-2 bg-primary-foreground/20 [&>div]:bg-primary-foreground"
            />
          </div>
        )}
        {modules.length > 0 && (
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-row-reverse justify-end items-baseline gap-2 sm:flex-col-reverse sm:items-start sm:gap-0 rounded-xl bg-primary-foreground/10 px-3 py-2 sm:px-4 sm:py-3"
              >
                <dt className="text-xs opacity-80">{stat.label}</dt>
                <dd className="text-lg sm:text-2xl font-bold tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      {!modules.length ? (
        <EmptyState
          title="Sin contenido aún"
          description="Próximamente habrá módulos de capacitación disponibles."
        />
      ) : (
        <div className="grid xl:grid-cols-[minmax(0,1fr)_20rem] gap-8 items-start">
          <div className="space-y-6 min-w-0">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar lecciones o materiales"
                aria-label="Buscar lecciones o materiales"
                className="pl-9 bg-card"
              />
            </div>

            {term ? (
              <section aria-label="Resultados de búsqueda" aria-live="polite">
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  {countLabel(results.length, "resultado", "resultados")}
                </h2>
                {results.length > 0 && (
                  <ul className="workspace-card !p-0 divide-y divide-border overflow-hidden">
                    {results.map(({ lesson, mod }) => (
                      <li key={lesson.id}>
                        <LessonRow
                          lesson={lesson}
                          href={`${basePath}/${mod.slug}/${lesson.slug}`}
                          detail={mod.title}
                          isAdmin={isAdmin}
                          completed={progress.completed.has(lesson.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : (
              <section aria-labelledby="academy-modules-title">
                <h2 id="academy-modules-title" className="text-lg font-bold text-foreground mb-4">
                  Módulos
                </h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  {modules.map((mod, index) => (
                    <ModuleCard
                      key={mod.id}
                      mod={mod}
                      position={index + 1}
                      basePath={basePath}
                      isAdmin={isAdmin}
                      progress={progress}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6 min-w-0">
            <AcademyMaterials title="Material de estudio" materials={materials} basePath={basePath} />
            <section className="workspace-card !p-0 overflow-hidden" aria-label="Más en el portal">
              <h2 className="font-semibold text-sm px-4 py-3 border-b border-border">Más en el portal</h2>
              <ul className="divide-y divide-border">
                {portalLinks.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
                    >
                      <item.icon size={16} className="text-primary shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">{item.label}</span>
                        <span className="block text-xs text-muted-foreground">{item.description}</span>
                      </span>
                      <ChevronRight size={16} className="text-muted-foreground shrink-0" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

function CoverImage({ src, className }: { src: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`bg-gradient-to-br from-primary/20 via-primary/10 to-muted flex items-center justify-center ${className ?? ""}`}
      >
        <BookOpen className="text-primary/60" size={32} aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className ?? ""}`}
    />
  );
}

function DraftBadge() {
  return (
    <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">Borrador</span>
  );
}

function TypeCounts({ lessons }: { lessons: AcademyLessonRow[] }) {
  const counts = lessons.reduce<Record<string, number>>((acc, l) => {
    acc[l.type] = (acc[l.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
        {countLabel(lessons.length, "lección", "lecciones")}
      </span>
      {Object.entries(counts).map(([type, n]) => (
        <span key={type} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
          {lessonTypeCount(type, n)}
        </span>
      ))}
    </div>
  );
}

const CARD_PREVIEW_LESSONS = 3;

function ModuleCard({
  mod,
  position,
  basePath,
  isAdmin,
  progress,
}: {
  mod: LibraryModule;
  position: number;
  basePath: string;
  isAdmin: boolean;
  progress: AcademyProgress;
}) {
  const hiddenLessons = mod.lessons.length - CARD_PREVIEW_LESSONS;
  const completedCount = countCompleted(mod.lessons, progress.completed);
  const isComplete = completedCount === mod.lessons.length;

  return (
    <Link
      to={`${basePath}/${mod.slug}`}
      className="group flex flex-col bg-card rounded-2xl border border-border/60 shadow-soft overflow-hidden hover:border-primary/30 hover:shadow-card transition-[border-color,box-shadow]"
    >
      <CoverImage src={moduleCover(mod, mod.lessons)} className="aspect-video w-full" />
      <div className="flex flex-col flex-1 p-5">
        <p className="text-xs font-semibold text-primary">Módulo {position}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <h3 className="font-bold text-foreground leading-snug">{mod.title}</h3>
          {isAdmin && !mod.published && <DraftBadge />}
        </div>
        {mod.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{mod.description}</p>
        )}
        <ul className="mt-4 space-y-1.5">
          {mod.lessons.slice(0, CARD_PREVIEW_LESSONS).map((lesson) => {
            const Icon = lessonIcon(lesson.type);
            return (
              <li key={lesson.id} className="flex items-center gap-2 text-sm text-foreground/80">
                {progress.completed.has(lesson.id) ? (
                  <CheckCircle2 size={14} className="text-primary shrink-0" role="img" aria-label="Completada" />
                ) : (
                  <Icon size={14} className="text-muted-foreground shrink-0" aria-hidden />
                )}
                <span className="truncate">{lesson.title}</span>
              </li>
            );
          })}
        </ul>
        {hiddenLessons > 0 && (
          <p className="text-xs text-muted-foreground mt-1.5">y {hiddenLessons} más</p>
        )}
        <div className="mt-auto" />
        {progress.tracked && (
          <Progress
            value={(completedCount / mod.lessons.length) * 100}
            aria-label={`Progreso en ${mod.title}`}
            className="h-1.5 mt-4"
          />
        )}
        <div className="flex items-center justify-between gap-3 pt-4">
          <span className="text-xs text-muted-foreground">
            {!progress.tracked
              ? countLabel(mod.lessons.length, "lección", "lecciones")
              : isComplete
                ? "Módulo completado"
                : progressLabel(completedCount, mod.lessons.length)}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            Ver módulo
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

function ModuleView({
  mod,
  basePath,
  isAdmin,
  showBreadcrumb,
  progress,
}: {
  mod: LibraryModule;
  basePath: string;
  isAdmin: boolean;
  showBreadcrumb: boolean;
  progress: AcademyProgress;
}) {
  const resume = findResumePoint(mod.lessons, progress.completed);
  const completedCount = countCompleted(mod.lessons, progress.completed);
  const materials = materialLessons(mod.lessons).map((lesson) => ({ lesson, moduleSlug: mod.slug }));

  return (
    <div className="space-y-6">
      {showBreadcrumb && (
        <nav className="text-sm text-muted-foreground flex flex-wrap items-center gap-1" aria-label="Ruta">
          <Link to={basePath} className="hover:text-primary">
            Academy
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground/80">{mod.title}</span>
        </nav>
      )}

      <header className="bg-card rounded-2xl border border-border/60 shadow-soft overflow-hidden grid md:grid-cols-[16rem_minmax(0,1fr)]">
        <CoverImage src={moduleCover(mod, mod.lessons)} className="aspect-video md:aspect-auto w-full md:h-full" />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{mod.title}</h1>
            {isAdmin && !mod.published && <DraftBadge />}
          </div>
          {mod.description && (
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed max-w-prose">{mod.description}</p>
          )}
          <div className="mt-3">
            <TypeCounts lessons={mod.lessons} />
          </div>
          {progress.tracked && mod.lessons.length > 0 && (
            <div className="mt-4 max-w-md">
              <p className="text-sm font-medium text-foreground mb-1.5">
                {progressLabel(completedCount, mod.lessons.length)}
              </p>
              <Progress
                value={(completedCount / mod.lessons.length) * 100}
                aria-label={`Progreso en ${mod.title}`}
                className="h-2"
              />
            </div>
          )}
          {resume && !progress.loading && (
            <Link
              to={`${basePath}/${mod.slug}/${resume.lesson.slug}`}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold px-5 py-2.5 text-sm hover:bg-primary/90 transition-colors"
            >
              <Play size={16} aria-hidden />
              {resume.status === "continue"
                ? "Continuar módulo"
                : resume.status === "done"
                  ? "Repasar módulo"
                  : "Empezar módulo"}
            </Link>
          )}
        </div>
      </header>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
        <section
          className="bg-card rounded-2xl border border-border/60 shadow-soft overflow-hidden min-w-0"
          aria-labelledby="academy-lessons-title"
        >
          <h2 id="academy-lessons-title" className="font-semibold text-sm px-4 sm:px-6 py-3 border-b border-border">
            Lecciones
          </h2>
          {mod.lessons.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 sm:px-6">Sin lecciones aún</p>
          ) : (
            <ol className="divide-y divide-border">
              {mod.lessons.map((lesson, index) => (
                <li key={lesson.id}>
                  <LessonRow
                    lesson={lesson}
                    href={`${basePath}/${mod.slug}/${lesson.slug}`}
                    position={index + 1}
                    isAdmin={isAdmin}
                    completed={progress.completed.has(lesson.id)}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>
        <aside className="min-w-0">
          <AcademyMaterials title="Materiales del módulo" materials={materials} basePath={basePath} />
        </aside>
      </div>
    </div>
  );
}

function LessonRow({
  lesson,
  href,
  position,
  detail,
  isAdmin,
  completed,
}: {
  lesson: AcademyLessonRow;
  href: string;
  position?: number;
  detail?: string;
  isAdmin: boolean;
  completed: boolean;
}) {
  const Icon = lessonIcon(lesson.type);
  const thumbnail = lessonThumbnail(lesson);

  return (
    <Link to={href} className="flex items-center gap-3 sm:gap-4 p-4 sm:px-6 hover:bg-muted/40 transition-colors">
      {position !== undefined && (
        <span className="text-xs font-semibold text-muted-foreground w-5 tabular-nums shrink-0">
          {String(position).padStart(2, "0")}
        </span>
      )}
      {thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          loading="lazy"
          className="hidden sm:block w-20 aspect-video object-cover rounded-lg shrink-0 bg-muted"
        />
      ) : null}
      <div
        className={`w-10 h-10 bg-primary/10 rounded-lg items-center justify-center shrink-0 ${
          thumbnail ? "flex sm:hidden" : "flex"
        }`}
      >
        <Icon size={18} className="text-primary" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground line-clamp-2">{lesson.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {lessonLabel(lesson.type)}
          {detail ? ` · ${detail}` : ""}
          {isAdmin && !lesson.published ? " · borrador" : ""}
        </p>
      </div>
      {completed && (
        <CheckCircle2 size={18} className="text-primary shrink-0" role="img" aria-label="Completada" />
      )}
      <ChevronRight size={18} className="text-muted-foreground shrink-0" aria-hidden />
    </Link>
  );
}
