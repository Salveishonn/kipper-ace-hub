import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LoadingState } from "@/components/ui/loading-state";

/** Internal Academy lesson. Rendered inside ProductorLayout at /productor/academy/:moduleSlug/:lessonSlug. */
const AcademyLesson = () => {
  const { moduleSlug, lessonSlug } = useParams();

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["academy_lesson", moduleSlug, lessonSlug],
    queryFn: async () => {
      const { data: mod } = await supabase
        .from("academy_modules")
        .select("id, title, slug")
        .eq("slug", moduleSlug!)
        .eq("published", true)
        .single();
      if (!mod) return null;

      const { data, error } = await supabase
        .from("academy_lessons")
        .select("*")
        .eq("module_id", mod.id)
        .eq("slug", lessonSlug!)
        .eq("published", true)
        .single();
      if (error) return null;
      return { ...data, module: mod };
    },
    enabled: !!moduleSlug && !!lessonSlug,
  });

  if (isLoading) return <LoadingState text="Cargando lección..." />;

  if (!lesson) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Lección no encontrada</h1>
        <Link to="/productor/academy" className="text-primary hover:underline">
          Volver a Academy
        </Link>
      </div>
    );
  }

  const getVideoEmbedUrl = (url: string) => {
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
    return url;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link
          to="/productor/academy"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-3"
        >
          <ArrowLeft size={16} aria-hidden /> Volver a Academy
        </Link>
        <p className="text-sm text-muted-foreground mb-1">{lesson.module?.title}</p>
        <h1 className="text-2xl font-bold text-foreground">{lesson.title}</h1>
      </div>

      {lesson.type === "video" && lesson.video_url && (
        <div className="aspect-video bg-black rounded-xl overflow-hidden">
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
        <div className="bg-card rounded-xl border border-border/60 shadow-soft p-8">
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
            {lesson.content_text}
          </div>
        </div>
      )}

      {lesson.type === "pdf" && (
        <div className="bg-card rounded-xl border border-border/60 shadow-soft p-8 text-center">
          <FileText size={48} className="text-primary mx-auto mb-4" aria-hidden />
          <p className="text-foreground font-medium mb-4">Documento PDF</p>
          {lesson.file_path ? (
            <a
              href={lesson.file_path}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hero text-sm px-6 py-2"
            >
              Descargar PDF
            </a>
          ) : (
            <p className="text-muted-foreground">Archivo no disponible aún</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AcademyLesson;
