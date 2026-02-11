import { useState } from "react";
import { Search, Users, TrendingUp, FileText } from "lucide-react";
import { useProducers } from "@/hooks/useProducers";
import { usePolicies } from "@/hooks/usePolicies";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";

const AdminProductores = () => {
  const { data: producers, isLoading, error } = useProducers();
  const { data: policies } = usePolicies();
  const [search, setSearch] = useState("");

  const filtered = producers?.filter(p => {
    const q = search.toLowerCase();
    return (
      p.profile?.full_name?.toLowerCase().includes(q) ||
      p.profile?.email?.toLowerCase().includes(q)
    );
  }) || [];

  const getPoliciesCount = (userId: string) =>
    policies?.filter(p => p.assigned_productor_id === userId).length || 0;

  const getActivePoliciesCount = (userId: string) =>
    policies?.filter(p => p.assigned_productor_id === userId && p.status === "activa").length || 0;

  if (isLoading) return <LoadingState text="Cargando productores..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar los productores" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Productores</h1>
        <p className="text-muted-foreground">Equipo de productores PAS</p>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} className="input-kipper pl-10" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-foreground">{producers?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Total productores</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-primary">{producers?.reduce((acc, p) => acc + (p.leadsCount || 0), 0) || 0}</p>
          <p className="text-xs text-muted-foreground">Total leads asignados</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-green-600">{policies?.filter(p => p.status === "activa" && p.assigned_productor_id).length || 0}</p>
          <p className="text-xs text-muted-foreground">Pólizas activas</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Sin productores" description="No se encontraron productores. Asigná el rol 'productor' desde Configuración." />
      ) : (
        <div className="space-y-4">
          {filtered.map(producer => (
            <div key={producer.id} className="bg-card rounded-2xl shadow-soft p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                    {producer.profile?.full_name?.charAt(0) || "P"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{producer.profile?.full_name || "Sin nombre"}</h3>
                    <p className="text-sm text-muted-foreground">{producer.profile?.email}</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <TrendingUp size={14} />
                      <span className="text-lg font-bold text-foreground">{producer.leadsCount || 0}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Leads</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <FileText size={14} />
                      <span className="text-lg font-bold text-foreground">{getPoliciesCount(producer.user_id)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Pólizas</p>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-green-600">{getActivePoliciesCount(producer.user_id)}</span>
                    <p className="text-xs text-muted-foreground">Activas</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProductores;
