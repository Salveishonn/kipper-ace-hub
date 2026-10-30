import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAcademyFileSignedUrl } from "@/lib/fileUploads";
import { lessonIcon, lessonLabel } from "@/components/academy/academyLessonMeta";
import type { AcademyLessonRow } from "@/components/academy/types";

export type AcademyMaterial = { lesson: AcademyLessonRow; moduleSlug: string; moduleTitle?: string };

const COLLAPSED_COUNT = 5;

/** Side panel listing a set of file lessons, each one openable and downloadable from here. */
export function AcademyMaterials({
  title,
  materials,
  basePath,
  onSelectLesson,
}: {
  title: string;
  materials: AcademyMaterial[];
  basePath: string;
  onSelectLesson?: (moduleSlug: string, lessonSlug: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!materials.length) return null;

  const visible = expanded ? materials : materials.slice(0, COLLAPSED_COUNT);

  return (
    <section className="workspace-card !p-0 overflow-hidden" aria-label={title}>
      <h2 className="font-semibold text-sm px-4 py-3 border-b border-border">{title}</h2>
      <ul className="divide-y divide-border">
        {visible.map((material) => (
          <MaterialRow
            key={material.lesson.id}
            material={material}
            basePath={basePath}
            onSelectLesson={onSelectLesson}
          />
        ))}
      </ul>
      {materials.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full px-4 py-2.5 text-sm font-medium text-primary hover:bg-muted/40 border-t border-border transition-colors"
        >
          {expanded ? "Ver menos" : `Ver todos (${materials.length})`}
        </button>
      )}
    </section>
  );
}

function MaterialRow({
  material: { lesson, moduleSlug, moduleTitle },
  basePath,
  onSelectLesson,
}: {
  material: AcademyMaterial;
  basePath: string;
  onSelectLesson?: (moduleSlug: string, lessonSlug: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const Icon = lessonIcon(lesson.type);

  const handleDownload = async () => {
    if (!lesson.file_path) return;
    setDownloading(true);
    try {
      const url = await getAcademyFileSignedUrl(lesson.file_path);
      const a = document.createElement("a");
      a.href = url;
      a.download = lesson.file_name || lesson.title;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch {
      toast.error("No se pudo descargar el archivo");
    } finally {
      setDownloading(false);
    }
  };

  const body = (
    <>
      <Icon size={16} className="text-primary shrink-0" aria-hidden />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground line-clamp-2">{lesson.title}</span>
        <span className="block text-xs text-muted-foreground truncate">
          {lessonLabel(lesson.type)}
          {moduleTitle ? ` · ${moduleTitle}` : ""}
        </span>
      </span>
    </>
  );
  const bodyClass =
    "flex-1 min-w-0 flex items-center gap-3 py-2.5 pl-4 text-left hover:text-primary transition-colors";

  return (
    <li className="flex items-center gap-1 pr-2 hover:bg-muted/40 transition-colors">
      {onSelectLesson ? (
        <button type="button" onClick={() => onSelectLesson(moduleSlug, lesson.slug)} className={bodyClass}>
          {body}
        </button>
      ) : (
        <Link to={`${basePath}/${moduleSlug}/${lesson.slug}`} className={bodyClass}>
          {body}
        </Link>
      )}
      {lesson.file_path && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          aria-label={`Descargar ${lesson.title}`}
          className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-60 transition-colors"
        >
          {downloading ? (
            <Loader2 size={16} className="animate-spin" aria-hidden />
          ) : (
            <Download size={16} aria-hidden />
          )}
        </button>
      )}
    </li>
  );
}
