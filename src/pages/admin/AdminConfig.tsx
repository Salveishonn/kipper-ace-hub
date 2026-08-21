import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Loader2, Star, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useGoogleReviews, useRefreshGoogleReviews } from "@/hooks/useGoogleReviews";
import { AvatarUpload } from "@/components/shared/AvatarUpload";
import { Button } from "@/components/ui/button";

function AdminDisplayNameEditor() {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  const handleSave = async () => {
    if (!profile?.user_id) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Ingresá tu nombre para mostrarlo en consultas");
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: trimmed })
        .eq("user_id", profile.user_id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Nombre actualizado");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el nombre");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-end">
      <div className="flex-1">
        <label className="text-sm font-medium" htmlFor="admin-display-name">
          Nombre visible en consultas
        </label>
        <input
          id="admin-display-name"
          className="input-kipper mt-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. María Kipper"
        />
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Guardando..." : "Guardar nombre"}
      </Button>
    </div>
  );
}

const AdminConfig = () => {
  const { isAdmin } = useAuth();

  const reviewsQuery = useGoogleReviews();
  const refreshReviews = useRefreshGoogleReviews();

  const handleDiagnosticRetry = async () => {
    try {
      const result = await refreshReviews.mutateAsync();
      if (result.warning) {
        toast.warning(result.warning, {
          description: result.message || undefined,
        });
      } else {
        toast.success("Cache de reseñas actualizado", {
          description: result.fetched_at
            ? `Última actualización: ${new Date(result.fetched_at).toLocaleString("es-AR")}`
            : undefined,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al actualizar reseñas";
      toast.error(message);
    }
  };

  const hasCache = Boolean(reviewsQuery.data?.fetched_at);
  const lastFetched = hasCache
    ? new Date(reviewsQuery.data!.fetched_at!).toLocaleString("es-AR")
    : "Sin cache todavía";
  const cacheStatus = hasCache
    ? `OK · ${(reviewsQuery.data?.reviews.length ?? 0)} destacadas en cache`
    : "Vacía · esperando primera actualización automática";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración del sitio</h1>
        <p className="text-muted-foreground">Gestión de accesos y ajustes generales</p>
      </div>

      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <User size={20} className="text-primary" /> Mi perfil
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Tu nombre y foto aparecen en el Portal Consultas cuando respondés a productores.
        </p>
        <AvatarUpload />
        <AdminDisplayNameEditor />
      </div>

      {isAdmin && (
        <div className="bg-card rounded-2xl shadow-soft p-6" data-admin-google-reviews>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Star size={20} className="text-primary" /> Reseñas de Google
          </h2>

          <dl className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <dt className="text-muted-foreground">Actualización automática</dt>
              <dd className="font-medium text-foreground">Cada 12 horas</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fuente</dt>
              <dd className="font-medium text-foreground">Places API (New)</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Reseñas disponibles</dt>
              <dd className="font-medium text-foreground">Hasta 5 destacadas</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Estado de la caché</dt>
              <dd className="font-medium text-foreground" data-cache-status>
                {cacheStatus}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Última actualización exitosa</dt>
              <dd className="font-medium text-foreground">{lastFetched}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Promedio / total en Google</dt>
              <dd className="font-medium text-foreground">
                {reviewsQuery.data?.rating != null
                  ? `${Number(reviewsQuery.data.rating).toFixed(1)} ★`
                  : "—"}
                {reviewsQuery.data?.user_ratings_total != null &&
                  ` · ${reviewsQuery.data.user_ratings_total} reseñas`}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-muted-foreground mb-3">
            El sitio público lee solo <code>google_reviews_cache</code>. El refresh normal lo hace
            el cron; este botón es diagnóstico.
          </p>

          {refreshReviews.isError && (
            <p className="mb-3 text-sm text-destructive whitespace-pre-wrap" role="alert" data-reviews-error>
              {(refreshReviews.error as Error)?.message || "Error al actualizar"}
            </p>
          )}

          <button
            type="button"
            onClick={handleDiagnosticRetry}
            disabled={refreshReviews.isPending}
            className="btn-hero-outline text-sm px-4 py-2 inline-flex items-center gap-2"
            data-reviews-retry
            aria-label="Actualizar reseñas de Google"
          >
            {refreshReviews.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden />
                Actualizando…
              </>
            ) : refreshReviews.isError ? (
              "Reintentar ahora"
            ) : (
              "Actualizar ahora"
            )}
          </button>
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
          <Shield size={20} className="text-primary" /> Administradores
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Para asignar o quitar el rol admin, usá la pantalla de administradores. No reemplaza otros roles.
        </p>
        <Link to="/admin/administradores" className="btn-hero text-sm px-4 py-2 inline-flex">
          Gestionar administradores
        </Link>
      </div>
    </div>
  );
};

export default AdminConfig;
