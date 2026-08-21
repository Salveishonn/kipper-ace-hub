import { useState } from "react";
import { Loader2, Search, Shield, ShieldOff, ShieldPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  useAdminUsers,
  useGrantAdminRole,
  useRevokeAdminRole,
  useSearchUserByEmail,
  type AdminUser,
} from "@/hooks/useAdminUsers";
import { LoadingState, ErrorState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";

const AdminAdministradores = () => {
  const { user } = useAuth();
  const { data: admins, isLoading, error } = useAdminUsers();
  const searchUser = useSearchUserByEmail();
  const grant = useGrantAdminRole();
  const revoke = useRevokeAdminRole();
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<AdminUser | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFound(null);
    try {
      const result = await searchUser.mutateAsync(email);
      setFound(result);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo buscar");
    }
  };

  const handleGrant = async (target: AdminUser) => {
    try {
      await grant.mutateAsync(target.user_id);
      toast.success(`${target.email} ahora es administrador`);
      setFound({ ...target, roles: Array.from(new Set([...target.roles, "admin"])) });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo asignar");
    }
  };

  const handleRevoke = async (target: AdminUser) => {
    if (!confirm(`¿Quitar el acceso de administrador a ${target.email}?`)) return;
    try {
      await revoke.mutateAsync(target.user_id);
      toast.success(`Se quitó el rol admin de ${target.email}`);
      if (found?.user_id === target.user_id) {
        setFound({ ...found, roles: found.roles.filter((r) => r !== "admin") });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo quitar");
    }
  };

  if (isLoading) return <LoadingState text="Cargando administradores..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar los administradores" />;

  const onlyOneAdmin = (admins?.length ?? 0) <= 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Administradores</h1>
        <p className="text-muted-foreground">
          Asigná o quitá el rol admin. El resto de los roles (como productor) se mantienen.
        </p>
      </div>

      <section className="bg-card rounded-2xl shadow-soft border border-border/60 p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield size={20} className="text-primary" aria-hidden />
          Equipo actual
        </h2>
        {!admins?.length ? (
          <p className="text-sm text-muted-foreground">No hay administradores.</p>
        ) : (
          <ul className="divide-y divide-border">
            {admins.map((admin) => {
              const isSelf = admin.user_id === user?.id;
              const canRevoke = !isSelf && !onlyOneAdmin;
              return (
                <li key={admin.user_id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{admin.full_name || "Sin nombre"}</p>
                    <p className="text-sm text-muted-foreground truncate">{admin.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Roles: {admin.roles.join(", ")}
                      {isSelf ? " · vos" : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canRevoke || revoke.isPending}
                    onClick={() => void handleRevoke(admin)}
                    title={
                      isSelf
                        ? "No podés quitarte el rol a vos mismo"
                        : onlyOneAdmin
                          ? "Tiene que quedar al menos un administrador"
                          : "Quitar admin"
                    }
                  >
                    <ShieldOff size={16} className="mr-2" aria-hidden />
                    Quitar admin
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bg-card rounded-2xl shadow-soft border border-border/60 p-6">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <ShieldPlus size={20} className="text-primary" aria-hidden />
          Asignar administrador
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Buscá una cuenta ya registrada por email. No reemplaza otros roles.
        </p>

        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              className="input-kipper pl-10"
              required
            />
          </div>
          <button type="submit" disabled={searchUser.isPending} className="btn-hero text-sm px-6 py-2">
            {searchUser.isPending ? <Loader2 size={16} className="animate-spin" /> : "Buscar"}
          </button>
        </form>

        {found && (
          <div className="bg-muted/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{found.full_name || "Sin nombre"}</p>
              <p className="text-sm text-muted-foreground">{found.email}</p>
              <p className="text-sm mt-1">
                Roles actuales:{" "}
                <span className="font-medium text-primary">{found.roles.join(", ") || "ninguno"}</span>
              </p>
            </div>
            {found.roles.includes("admin") ? (
              <p className="text-sm text-muted-foreground">Ya es administrador.</p>
            ) : (
              <Button
                type="button"
                onClick={() => void handleGrant(found)}
                disabled={grant.isPending}
              >
                {grant.isPending ? "Asignando..." : "Asignar admin"}
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminAdministradores;
