import { useParams, Navigate, Link } from "react-router-dom";
import { ArrowLeft, Video, MessageSquare, FileText } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LoadingState } from "@/components/ui/loading-state";

const AcademyLesson = () => {
  const { moduleSlug, lessonSlug } = useParams();
  const { isProductor, isAdmin, user, loading, rolesLoaded } = useAuth();
  const hasAccess = isProductor || isAdmin;

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["academy_lesson", moduleSlug, lessonSlug],
    queryFn: async () => {
      // First get module
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
    enabled: hasAccess && !!moduleSlug && !!lessonSlug,
  });

  if (loading || !rolesLoaded) return <LoadingState text="Cargando..." />;
  if (!user || !hasAccess) return <Navigate to="/academy" replace />;

  if (isLoading) return <MainLayout><LoadingState text="Cargando lección..." /></MainLayout>;

  if (!lesson) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Lección no encontrada</h1>
          <Link to="/academy/contenido" className="text-primary hover:underline">Volver a Academy</Link>
        </div>
      </MainLayout>
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
    <MainLayout>
      <section className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <Link to="/academy/contenido" className="inline-flex items-center gap-2 text-sm opacity-80 hover:opacity-100 mb-4">
            <ArrowLeft size={16} /> Volver a Academy
          </Link>
          <p className="text-sm opacity-70 mb-1">{lesson.module?.title}</p>
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {lesson.type === "video" && lesson.video_url && (
            <div className="aspect-video bg-black rounded-2xl overflow-hidden mb-8">
              <iframe
                src={getVideoEmbedUrl(lesson.video_url)}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media"
              />
            </div>
          )}

          {lesson.type === "chat" && lesson.content_text && (
            <div className="bg-card rounded-2xl shadow-soft p-8">
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                {lesson.content_text}
              </div>
            </div>
          )}

          {lesson.type === "pdf" && (
            <div className="bg-card rounded-2xl shadow-soft p-8 text-center">
              <FileText size={48} className="text-primary mx-auto mb-4" />
              <p className="text-foreground font-medium mb-4">Documento PDF</p>
              {lesson.file_path ? (
                <a href={lesson.file_path} target="_blank" rel="noopener noreferrer" className="btn-hero text-sm px-6 py-2">
                  Descargar PDF
                </a>
              ) : (
                <p className="text-muted-foreground">Archivo no disponible aún</p>
              )}
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
};

export default AcademyLesson;
