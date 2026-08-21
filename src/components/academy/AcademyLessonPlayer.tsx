import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Download, FileSpreadsheet, FileText, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { getAcademyFileSignedUrl, isAcademyFileType } from "@/lib/fileUploads";
import { useAuth } from "@/hooks/useAuth";
import type { AcademyLessonRow } from "@/components/academy/types";

function officeEmbedUrl(signedUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;
}

function getVideoEmbedUrl(url: string) {
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
}

export type AcademyLessonPayload = {
  lesson: AcademyLessonRow;
  module: { id: string; title: string; slug: string; published: boolean };
  prev: AcademyLessonRow | null;
  next: AcademyLessonRow | null;
  position: number;
  total: number;
};

export function useAcademyLesson(moduleSlug?: string, lessonSlug?: string) {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ["academy_lesson", moduleSlug, lessonSlug, isAdmin],
    queryFn: async (): Promise<AcademyLessonPayload | null> => {
      let moduleQuery = supabase
        .from("academy_modules")
        .select("id, title, slug, published")
        .eq("slug", moduleSlug!);
      if (!isAdmin) {
        moduleQuery = moduleQuery.eq("published", true);
      }
      const { data: mod } = await moduleQuery.maybeSingle();
      if (!mod) return null;

      let lessonsQuery = supabase
        .from("academy_lessons")
        .select("*")
        .eq("module_id", mod.id)
        .order("sort_order", { ascending: true });
      if (!isAdmin) {
        lessonsQuery = lessonsQuery.eq("published", true);
      }
      const { data: lessons, error } = await lessonsQuery;
      if (error || !lessons?.length) return null;

      const index = lessons.findIndex((l) => l.slug === lessonSlug);
      if (index < 0) return null;

      return {
        lesson: lessons[index] as AcademyLessonRow,
        module: mod,
        prev: index > 0 ? (lessons[index - 1] as AcademyLessonRow) : null,
        next: index < lessons.length - 1 ? (lessons[index + 1] as AcademyLessonRow) : null,
        position: index + 1,
        total: lessons.length,
      };
    },
    enabled: !!moduleSlug && !!lessonSlug,
  });
}

type AcademyLessonPlayerProps = {
  basePath: string;
  moduleSlug: string;
  lessonSlug: string;
  libraryHref?: string;
  moduleHref?: string;
};

export function AcademyLessonPlayer({
  basePath,
  moduleSlug,
  lessonSlug,
  libraryHref,
  moduleHref,
}: AcademyLessonPlayerProps) {
  const { isAdmin } = useAuth();
  const backHref = libraryHref ?? basePath;
  const { data, isLoading } = useAcademyLesson(moduleSlug, lessonSlug);

  const lesson = data?.lesson;
  const filePath = lesson?.file_path ?? null;
  const isFileLesson = !!lesson && isAcademyFileType(lesson.type);

  const { data: signedUrl, isLoading: fileLoading } = useQuery({
    queryKey: ["academy_file_url", filePath],
    queryFn: () => getAcademyFileSignedUrl(filePath!),
    enabled: isFileLesson && !!filePath,
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) return <LoadingState text="Cargando lección..." />;

  if (!data?.lesson) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Lección no encontrada</h1>
        <Link to={backHref} className="text-primary hover:underline">
          Volver a Academy
        </Link>
      </div>
    );
  }

  const { lesson: current, module: mod, prev, next, position, total } = data;
  const downloadName = current.file_name || current.title;

  const handleDownload = () => {
    if (!signedUrl) return;
    const a = document.createElement("a");
    a.href = signedUrl;
    a.download = downloadName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  const FileIcon =
    current.type === "excel" ? FileSpreadsheet : current.type === "image" ? Image : FileText;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <nav className="text-sm text-muted-foreground mb-3 flex flex-wrap items-center gap-1">
          <Link to={backHref} className="hover:text-primary">
            Academy
          </Link>
          <span>/</span>
          {moduleHref ? (
            <Link to={moduleHref} className="text-foreground/80 hover:text-primary">
              {mod.title}
            </Link>
          ) : (
            <span className="text-foreground/80">{mod.title}</span>
          )}
        </nav>
        <p className="text-xs font-medium text-primary mb-1">
          Lección {position} de {total}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{current.title}</h1>
        {isAdmin && (!mod.published || !current.published) && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            Borrador: los productores no ven este contenido hasta que lo publiques.
          </p>
        )}
      </div>

      {current.type === "video" && current.video_url && (
        <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-soft border border-border/40">
          <iframe
            src={getVideoEmbedUrl(current.video_url)}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media"
            title={current.title}
          />
        </div>
      )}

      {current.type === "chat" && current.content_text && (
        <div className="bg-card rounded-2xl border border-border/60 shadow-soft p-6 sm:p-8">
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
            {current.content_text}
          </div>
        </div>
      )}

      {isFileLesson && (
        <div className="bg-card rounded-2xl border border-border/60 shadow-soft overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <FileIcon size={18} className="text-primary shrink-0" aria-hidden />
              <p className="font-medium truncate">{downloadName}</p>
            </div>
            {signedUrl && (
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download size={14} className="mr-1.5" aria-hidden /> Descargar
              </Button>
            )}
          </div>
          <div className="p-4 min-h-[40vh] bg-muted/30">
            {!filePath ? (
              <p className="text-center text-muted-foreground py-16">Archivo no disponible aún</p>
            ) : fileLoading ? (
              <LoadingState text="Cargando archivo..." />
            ) : !signedUrl ? (
              <p className="text-center text-muted-foreground py-16">No se pudo cargar el archivo</p>
            ) : current.type === "image" ? (
              <img
                src={signedUrl}
                alt={current.title}
                className="max-w-full max-h-[70vh] mx-auto object-contain rounded-lg"
              />
            ) : current.type === "pdf" ? (
              <iframe
                title={current.title}
                src={signedUrl}
                className="w-full h-[70vh] rounded-lg bg-white"
              />
            ) : current.type === "word" || current.type === "excel" ? (
              <iframe
                title={current.title}
                src={officeEmbedUrl(signedUrl)}
                className="w-full h-[70vh] rounded-lg bg-white"
              />
            ) : null}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-between pt-2 border-t border-border">
        {prev ? (
          <Link
            to={`${basePath}/${mod.slug}/${prev.slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            <ArrowLeft size={16} aria-hidden />
            <span className="truncate max-w-[220px]">{prev.title}</span>
          </Link>
        ) : (
          <Link
            to={backHref}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft size={16} aria-hidden /> Volver a Academy
          </Link>
        )}
        {next && (
          <Link
            to={`${basePath}/${mod.slug}/${next.slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline sm:ml-auto"
          >
            <span className="truncate max-w-[220px]">{next.title}</span>
            <ArrowRight size={16} aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
