import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapAdminRoleError } from "@/lib/adminRoles";

export type AdminUser = {
  user_id: string;
  email: string;
  full_name: string | null;
  roles: string[];
};

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin_users"],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data: roleRows, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (rolesError) throw rolesError;

      const ids = Array.from(new Set((roleRows ?? []).map((r) => r.user_id)));
      if (ids.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .in("user_id", ids);
      if (profilesError) throw profilesError;

      const { data: allRoles, error: allRolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      if (allRolesError) throw allRolesError;

      const rolesByUser = new Map<string, string[]>();
      for (const row of allRoles ?? []) {
        const list = rolesByUser.get(row.user_id) ?? [];
        list.push(row.role);
        rolesByUser.set(row.user_id, list);
      }

      return (profiles ?? [])
        .map((p) => ({
          user_id: p.user_id,
          email: p.email,
          full_name: p.full_name,
          roles: rolesByUser.get(p.user_id) ?? ["admin"],
        }))
        .sort((a, b) => a.email.localeCompare(b.email, "es"));
    },
  });
}

export function useSearchUserByEmail() {
  return useMutation({
    mutationFn: async (email: string): Promise<AdminUser> => {
      const trimmed = email.trim();
      if (!trimmed) throw new Error("Ingresá un email");
      if (/[%_]/.test(trimmed)) throw new Error("Email inválido");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .ilike("email", trimmed)
        .maybeSingle();

      if (error) throw error;
      if (!profile) throw new Error("No se encontró un usuario con ese email");

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id);
      if (rolesError) throw rolesError;

      return {
        user_id: profile.user_id,
        email: profile.email,
        full_name: profile.full_name,
        roles: (roles ?? []).map((r) => r.role),
      };
    },
  });
}

export function useGrantAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await supabase.rpc("grant_admin_role", { p_user_id: user_id });
      if (error) throw new Error(mapAdminRoleError(error.message));
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    },
  });
}

export function useRevokeAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await supabase.rpc("revoke_admin_role", { p_user_id: user_id });
      if (error) throw new Error(mapAdminRoleError(error.message));
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    },
  });
}
