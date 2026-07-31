import { useState } from "react";
import { Search, FileText, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePolicies } from "@/hooks/usePolicies";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { Link } from "react-router-dom";

function useClients() {
  return useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      // Get all users with cliente role
      const { data: clientRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'cliente');
      if (!clientRoles || clientRoles.length === 0) return [];

      const userIds = clientRoles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, phone, dni, city')
        .in('user_id', userIds);

      return profiles || [];
    }
  });
}

const AdminClientes = () => {
  const { data: clients = [], isLoading, error } = useClients();
  const { data: policies = [] } = usePolicies();
  const [search, setSearch] = useState("");

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return c.full_name?.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.dni?.includes(q);
  });

  const getPoliciesForUser = (userId: string) => policies.filter(p => p.user_id === userId);

  if (isLoading) return <LoadingState text="Cargando clientes..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar los clientes" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground">Asegurados registrados en la plataforma</p>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Buscar por nombre, email o DNI..." value={search} onChange={e => setSearch(e.target.value)} className="input-kipper pl-10" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-foreground">{clients.length}</p>
          <p className="text-xs text-muted-foreground">Total clientes</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-green-600">
            {new Set(policies.filter(p => p.status === 'activa' && p.user_id).map(p => p.user_id)).size}
          </p>
          <p className="text-xs text-muted-foreground">Con póliza activa</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Sin clientes" description="No hay clientes registrados. Convertí un lead o invitá a registrarse." />
      ) : (
        <div className="space-y-4">
          {filtered.map(client => {
            const userPolicies = getPoliciesForUser(client.user_id);
            const active = userPolicies.filter(p => p.status === 'activa');
            return (
              <div key={client.user_id} className="bg-card rounded-2xl shadow-soft p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                      {client.full_name?.charAt(0) || "C"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{client.full_name || "Sin nombre"}</h3>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                      {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{userPolicies.length}</p>
                      <p className="text-xs text-muted-foreground">Pólizas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">{active.length}</p>
                      <p className="text-xs text-muted-foreground">Activas</p>
                    </div>
                    <Link to="/admin/polizas" className="btn-hero-outline text-sm px-4 py-2">
                      Crear póliza
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminClientes;
