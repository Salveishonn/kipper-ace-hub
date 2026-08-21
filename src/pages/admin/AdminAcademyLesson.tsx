import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit } from "lucide-react";
import { AcademyLessonPlayer, useAcademyLesson } from "@/components/academy/AcademyLessonPlayer";
import { AcademyLessonForm } from "@/components/academy/AcademyLessonForm";
import { ADMIN_ACADEMY_BASE } from "@/components/academy/types";

const AdminAcademyLesson = () => {
  const { moduleSlug, lessonSlug } = useParams();
  const navigate = useNavigate();
  const { data } = useAcademyLesson(moduleSlug, lessonSlug);
  const [editing, setEditing] = useState(false);

  if (!moduleSlug || !lessonSlug) return null;

  const moduleHref = `${ADMIN_ACADEMY_BASE}/${moduleSlug}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to={ADMIN_ACADEMY_BASE}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft size={16} aria-hidden /> Volver a la lista
        </Link>
        {data?.lesson && (
          <button
            type="button"
            onClick={() => setEditing((open) => !open)}
            className="btn-hero-outline text-sm px-4 py-2 inline-flex items-center gap-2"
          >
            <Edit size={16} aria-hidden /> {editing ? "Ocultar editor" : "Editar lección"}
          </button>
        )}
      </div>

      {editing && data?.lesson && (
        <AcademyLessonForm
          moduleId={data.lesson.module_id}
          lesson={data.lesson}
          onCancel={() => setEditing(false)}
          onSaved={({ slug }) => {
            setEditing(false);
            if (slug !== lessonSlug) {
              navigate(`${ADMIN_ACADEMY_BASE}/${moduleSlug}/${slug}`, { replace: true });
            }
          }}
        />
      )}

      <AcademyLessonPlayer
        basePath={ADMIN_ACADEMY_BASE}
        moduleSlug={moduleSlug}
        lessonSlug={lessonSlug}
        libraryHref={ADMIN_ACADEMY_BASE}
        moduleHref={moduleHref}
      />
    </div>
  );
};

export default AdminAcademyLesson;
