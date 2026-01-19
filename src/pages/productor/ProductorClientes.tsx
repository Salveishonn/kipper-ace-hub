import { useState } from "react";
import { Search, User, FileText, Phone, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePolicies } from "@/hooks/usePolicies";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const ProductorClientes = () => {
  const { user } = useAuth();
  const { data: policies, isLoading: policiesLoading, error: policiesError } = usePolicies();
  const [search, setSearch] = useState("");

  // Get unique client IDs from policies assigned to this producer
  const myPolicies = policies?.filter(p => p.assigned_productor_id === user?.id) || [];
  const clientIds = [...new Set(myPolicies.map(p => p.user_id).filter(Boolean))];

  // Fetch profiles for these clients
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['producer-clients', clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', clientIds);
      if (error) throw error;
      return data;
    },
    enabled: clientIds.length > 0
  });

  const filteredClients = clients?.filter(client => {
    const searchLower = search.toLowerCase();
    return (
      client.full_name?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.dni?.includes(search)
    );
  }) || [];

  const getPoliciesForClient = (userId: string) => {
    return myPolicies.filter(p => p.user_id === userId);
  };

  if (policiesLoading || clientsLoading) {
    return <LoadingState text="Cargando clientes..." />;
  }

  if (policiesError) {
    return <ErrorState title="Error al cargar clientes" message="Intenta recargar la página" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Clientes</h1>
        <p className="text-muted-foreground">Clientes con pólizas asignadas a vos</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre, email o DNI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-kipper pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <User size={24} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{clients?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Clientes activos</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <FileText size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{myPolicies.length}</p>
              <p className="text-sm text-muted-foreground">Pólizas gestionadas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <EmptyState
          title="Sin clientes"
          description={search ? "No encontramos clientes con esa búsqueda" : "Cuando gestiones pólizas, tus clientes aparecerán aquí"}
        />
      ) : (
        <div className="space-y-4">
          {filteredClients.map((client) => {
            const clientPolicies = getPoliciesForClient(client.user_id);
            const activePolicies = clientPolicies.filter(p => p.status === 'activa');
            
            return (
              <div key={client.id} className="bg-card rounded-2xl shadow-soft p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg flex-shrink-0">
                      {client.full_name?.charAt(0) || "C"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">
                        {client.full_name || "Sin nombre"}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                        <a href={`mailto:${client.email}`} className="flex items-center gap-1 hover:text-emerald-600">
                          <Mail size={14} />
                          {client.email}
                        </a>
                        {client.phone && (
                          <a href={`tel:${client.phone}`} className="flex items-center gap-1 hover:text-emerald-600">
                            <Phone size={14} />
                            {client.phone}
                          </a>
                        )}
                        {client.dni && (
                          <span>DNI: {client.dni}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center px-4">
                      <p className="text-xl font-bold text-foreground">{activePolicies.length}</p>
                      <p className="text-xs text-muted-foreground">Pólizas activas</p>
                    </div>
                  </div>
                </div>

                {/* Policies Summary */}
                {clientPolicies.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="text-sm font-medium text-foreground mb-2">Pólizas</h4>
                    <div className="grid gap-2">
                      {clientPolicies.map(policy => (
                        <div key={policy.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <span className="font-medium text-foreground">
                              {policy.policy_type}
                            </span>
                            {policy.policy_number && (
                              <span className="text-muted-foreground ml-2">
                                #{policy.policy_number}
                              </span>
                            )}
                            {policy.vehicle_brand && (
                              <span className="text-muted-foreground ml-2">
                                • {policy.vehicle_brand} {policy.vehicle_model}
                              </span>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            policy.status === 'activa' 
                              ? 'bg-green-100 text-green-700'
                              : policy.status === 'vencida'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {policy.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductorClientes;
