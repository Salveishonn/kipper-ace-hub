import { useState } from "react";
import { Search, Shield, Loader2, Star, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useGoogleReviews, useRefreshGoogleReviews } from "@/hooks/useGoogleReviews";
import { AvatarUpload } from "@/components/shared/AvatarUpload";

const AdminConfig = () => {
  const { isAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [foundUser, setFoundUser] = useState<{ user_id: string; email: string; full_name: string | null; roles: string[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [updating, setUpdating] = useState(false);

  const reviewsQuery = useGoogleReviews();
  const refreshReviews = useRefreshGoogleReviews();

  const searchUser = async () => {
    if (!email.trim()) return;
    setSearching(true);
    setFoundUser(null);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .eq("email", email.trim())
        .single();

      if (!profile) {
        toast.error("No se encontró un usuario con ese email");
        setSearching(false);
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id);

      setFoundUser({
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        roles: roles?.map((r) => r.role) || [],
      });
    } catch {
      toast.error("Error buscando usuario");
    } finally {
      setSearching(false);
    }
  };

  const setRole = async (role: "admin") => {
    if (!foundUser) return;
    setUpdating(true);
    try {
      await supabase.from("user_roles").delete().eq("user_id", foundUser.user_id);
      const { error } = await supabase.from("user_roles").insert({ user_id: foundUser.user_id, role });
      if (error) throw error;
      setFoundUser({ ...foundUser, roles: [role] });
      toast.success(`Rol actualizado a "${role}"`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al actualizar rol";
      toast.error(message);
    } finally {
      setUpdating(false);
    }
  };

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
          Tu foto aparece en el Portal Consultas cuando respondés a productores.
        </p>
        <AvatarUpload />
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
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield size={20} className="text-primary" /> Gestión de Roles
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Buscá un usuario por email para asignar rol <strong>admin</strong> (uso excepcional).
          Los productores PAS se registran desde <strong>Sumate</strong> y se aprueban en <strong>Solicitudes PAS</strong>.
        </p>

        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              placeholder="email@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchUser()}
              className="input-kipper pl-10"
            />
          </div>
          <button onClick={searchUser} disabled={searching} className="btn-hero text-sm px-6 py-2">
            {searching ? <Loader2 size={16} className="animate-spin" /> : "Buscar"}
          </button>
        </div>

        {foundUser && (
          <div className="bg-muted/30 rounded-xl p-4 space-y-4">
            <div>
              <p className="font-medium text-foreground">{foundUser.full_name || "Sin nombre"}</p>
              <p className="text-sm text-muted-foreground">{foundUser.email}</p>
              <p className="text-xs text-muted-foreground mt-1">ID: {foundUser.user_id}</p>
              <p className="text-sm mt-2">
                Roles actuales:{" "}
                <span className="font-medium text-primary">
                  {foundUser.roles.join(", ") || "ninguno"}
                </span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRole("admin")}
                disabled={updating}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  foundUser.roles.includes("admin")
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                admin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminConfig;
