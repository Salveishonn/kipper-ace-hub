import { useProducers } from "@/hooks/useProducers";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { Search, Users } from "lucide-react";
import { useState } from "react";

const AdminProductores = () => {
  const { data: producers, isLoading, error } = useProducers();
  const [search, setSearch] = useState("");

  const filtered = producers?.filter(p => {
    const q = search.toLowerCase();
    return (
      p.profile?.full_name?.toLowerCase().includes(q) ||
      p.profile?.email?.toLowerCase().includes(q)
    );
  }) || [];

  if (isLoading) return <LoadingState text="Cargando productores..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar los productores" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Productores PAS</h1>
        <p className="text-muted-foreground">Cuentas activas con rol productor</p>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} className="input-kipper pl-10" />
      </div>

      <div className="bg-card p-4 rounded-xl shadow-soft inline-flex items-center gap-3">
        <Users className="text-primary" />
        <div>
          <p className="text-2xl font-bold">{producers?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Productores activos</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Sin productores" description="Los productores aparecen acá después de aprobar su solicitud PAS." />
      ) : (
        <div className="space-y-4">
          {filtered.map(producer => (
            <div key={producer.id} className="bg-card rounded-2xl shadow-soft p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                  {producer.profile?.full_name?.charAt(0) || "P"}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{producer.profile?.full_name || "Sin nombre"}</h3>
                  <p className="text-sm text-muted-foreground">{producer.profile?.email}</p>
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
