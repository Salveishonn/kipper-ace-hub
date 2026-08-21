import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit } from "lucide-react";
import { AcademyModuleLibrary, useAcademyLibrary } from "@/components/academy/AcademyModuleLibrary";
import { AcademyModuleForm } from "@/components/academy/AcademyModuleForm";
import { ADMIN_ACADEMY_BASE } from "@/components/academy/types";
import { LoadingState } from "@/components/ui/loading-state";

const AdminAcademyModule = () => {
  const { moduleSlug } = useParams();
  const navigate = useNavigate();
  const { data: modules, isLoading } = useAcademyLibrary();
  const [editing, setEditing] = useState(false);

  const mod = modules?.find((m) => m.slug === moduleSlug);

  if (!moduleSlug) return null;
  if (isLoading) return <LoadingState text="Cargando módulo..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to={ADMIN_ACADEMY_BASE}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft size={16} aria-hidden /> Volver a la lista
        </Link>
        {mod && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn-hero-outline text-sm px-4 py-2 inline-flex items-center gap-2"
          >
            <Edit size={16} aria-hidden /> Editar módulo
          </button>
        )}
      </div>

      <AcademyModuleLibrary
        basePath={ADMIN_ACADEMY_BASE}
        moduleSlug={moduleSlug}
        showIntro={false}
        notFoundHref={ADMIN_ACADEMY_BASE}
      />

      {editing && mod && (
        <AcademyModuleForm
          module={mod}
          onCancel={() => setEditing(false)}
          onSaved={({ slug }) => {
            setEditing(false);
            if (slug !== moduleSlug) {
              navigate(`${ADMIN_ACADEMY_BASE}/${slug}`, { replace: true });
            }
          }}
        />
      )}
    </div>
  );
};

export default AdminAcademyModule;
