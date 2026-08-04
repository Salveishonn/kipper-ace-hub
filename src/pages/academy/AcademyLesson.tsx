import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LoadingState } from "@/components/ui/loading-state";

/** Internal Academy lesson. Rendered inside ProductorLayout at /productor/academy/:moduleSlug/:lessonSlug. */
const AcademyLesson = () => {
  const { moduleSlug, lessonSlug } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["academy_lesson", moduleSlug, lessonSlug],
    queryFn: async () => {
      const { data: mod } = await supabase
        .from("academy_modules")
        .select("id, title, slug")
        .eq("slug", moduleSlug!)
        .eq("published", true)
        .single();
      if (!mod) return null;

      const { data: lessons, error } = await supabase
        .from("academy_lessons")
        .select("*")
        .eq("module_id", mod.id)
        .eq("published", true)
        .order("sort_order", { ascending: true });
      if (error || !lessons?.length) return null;

      const index = lessons.findIndex((l) => l.slug === lessonSlug);
      if (index < 0) return null;

      return {
        lesson: lessons[index],
        module: mod,
        prev: index > 0 ? lessons[index - 1] : null,
        next: index < lessons.length - 1 ? lessons[index + 1] : null,
        position: index + 1,
        total: lessons.length,
      };
    },
    enabled: !!moduleSlug && !!lessonSlug,
  });

  if (isLoading) return <LoadingState text="Cargando lección..." />;

  if (!data?.lesson) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Lección no encontrada</h1>
        <Link to="/productor/academy" className="text-primary hover:underline">
          Volver a Academy
        </Link>
      </div>
    );
  }

  const { lesson, module: mod, prev, next, position, total } = data;

  const getVideoEmbedUrl = (url: string) => {
    try {
      if (url.includes("youtube.com/watch")) {
        const id = new URL(url).searchParams.get("v");
        return `https://www.youtube.com/embed/${id}`;
      }
      if (url.includes("youtu.be/")) {
        const id = url.split("youtu.be/")[1]?.split("?")[0];
        return `https://www.youtube.com/embed/${id}`;
      }
      if (url.includes("vimeo.com/")) {
        const id = url.split("vimeo.com/")[1]?.split("?")[0];
        return `https://player.vimeo.com/video/${id}`;
      }
    } catch {
      /* keep raw url */
    }
    return url;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <nav className="text-sm text-muted-foreground mb-3 flex flex-wrap items-center gap-1">
          <Link to="/productor/academy" className="hover:text-primary">
            Academy
          </Link>
          <span>/</span>
          <span className="text-foreground/80">{mod.title}</span>
        </nav>
        <p className="text-xs font-medium text-primary mb-1">
          Lección {position} de {total}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{lesson.title}</h1>
      </div>

      {lesson.type === "video" && lesson.video_url && (
        <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-soft border border-border/40">
          <iframe
            src={getVideoEmbedUrl(lesson.video_url)}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media"
            title={lesson.title}
          />
        </div>
      )}

      {lesson.type === "chat" && lesson.content_text && (
        <div className="bg-card rounded-2xl border border-border/60 shadow-soft p-6 sm:p-8">
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
            {lesson.content_text}
          </div>
        </div>
      )}

      {lesson.type === "pdf" && (
        <div className="bg-card rounded-2xl border border-border/60 shadow-soft p-8 text-center">
          <FileText size={48} className="text-primary mx-auto mb-4" aria-hidden />
          <p className="text-foreground font-medium mb-2">Documento PDF</p>
          <p className="text-sm text-muted-foreground mb-4">
            Abrí o descargá el material de esta lección.
          </p>
          {lesson.file_path ? (
            <a
              href={lesson.file_path}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hero text-sm px-6 py-2 inline-flex"
            >
              Abrir PDF
            </a>
          ) : (
            <p className="text-muted-foreground">Archivo no disponible aún</p>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-between pt-2 border-t border-border">
        {prev ? (
          <Link
            to={`/productor/academy/${mod.slug}/${prev.slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <ArrowLeft size={16} aria-hidden />
            <span className="truncate max-w-[220px]">{prev.title}</span>
          </Link>
        ) : (
          <Link
            to="/productor/academy"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft size={16} aria-hidden /> Volver a Academy
          </Link>
        )}
        {next && (
          <Link
            to={`/productor/academy/${mod.slug}/${next.slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline sm:ml-auto"
          >
            <span className="truncate max-w-[220px]">{next.title}</span>
            <ArrowRight size={16} aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
};

export default AcademyLesson;
