import { useState } from "react";
import { Search, Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminConfig = () => {
  const [email, setEmail] = useState("");
  const [foundUser, setFoundUser] = useState<{ user_id: string; email: string; full_name: string | null; roles: string[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [updating, setUpdating] = useState(false);

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
        roles: roles?.map(r => r.role) || [],
      });
    } catch (err) {
      toast.error("Error buscando usuario");
    } finally {
      setSearching(false);
    }
  };

  const setRole = async (role: "admin") => {
    if (!foundUser) return;
    setUpdating(true);
    try {
      // Remove existing roles
      await supabase.from("user_roles").delete().eq("user_id", foundUser.user_id);
      // Insert new role
      const { error } = await supabase.from("user_roles").insert({ user_id: foundUser.user_id, role });
      if (error) throw error;
      setFoundUser({ ...foundUser, roles: [role] });
      toast.success(`Rol actualizado a "${role}"`);
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar rol");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración del sitio</h1>
        <p className="text-muted-foreground">Gestión de accesos y ajustes generales</p>
      </div>

      {/* Role Manager */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield size={20} className="text-primary" /> Gestión de Roles
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Buscá un usuario por email para asignar rol <strong>admin</strong> (uso excepcional).
          Los productores PAS deben crearse desde <strong>Solicitudes PAS</strong> con invitación por email.
        </p>

        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              placeholder="email@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchUser()}
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
                Roles actuales: <span className="font-medium text-primary">{foundUser.roles.join(", ") || "ninguno"}</span>
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
