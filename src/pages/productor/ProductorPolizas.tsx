import { useState } from "react";
import { Search, FileText, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePolicies } from "@/hooks/usePolicies";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig = {
  activa: { label: 'Activa', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  vencida: { label: 'Vencida', color: 'bg-red-100 text-red-700', icon: XCircle },
  anulada: { label: 'Anulada', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

const ProductorPolizas = () => {
  const { user } = useAuth();
  const { data: policies, isLoading, error } = usePolicies();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Filter policies assigned to this producer
  const myPolicies = policies?.filter(p => p.assigned_productor_id === user?.id) || [];

  const filteredPolicies = myPolicies.filter(policy => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      policy.policy_number?.toLowerCase().includes(searchLower) ||
      policy.policy_type?.toLowerCase().includes(searchLower) ||
      policy.vehicle_brand?.toLowerCase().includes(searchLower) ||
      policy.vehicle_model?.toLowerCase().includes(searchLower);
    const matchesStatus = !statusFilter || policy.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return <LoadingState text="Cargando pólizas..." />;
  }

  if (error) {
    return <ErrorState title="Error al cargar pólizas" message="Intenta recargar la página" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pólizas</h1>
        <p className="text-muted-foreground">Pólizas de clientes bajo tu gestión</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por número, tipo o vehículo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-kipper pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-kipper max-w-xs"
        >
          <option value="">Todos los estados</option>
          <option value="activa">Activas</option>
          <option value="vencida">Vencidas</option>
          <option value="anulada">Anuladas</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-green-600">
            {myPolicies.filter(p => p.status === 'activa').length}
          </p>
          <p className="text-xs text-muted-foreground">Activas</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-red-600">
            {myPolicies.filter(p => p.status === 'vencida').length}
          </p>
          <p className="text-xs text-muted-foreground">Vencidas</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-gray-600">
            {myPolicies.filter(p => p.status === 'anulada').length}
          </p>
          <p className="text-xs text-muted-foreground">Anuladas</p>
        </div>
      </div>

      {/* Policies List */}
      {filteredPolicies.length === 0 ? (
        <EmptyState
          title="Sin pólizas"
          description={search || statusFilter ? "No encontramos pólizas con esos filtros" : "Las pólizas de tus clientes aparecerán aquí"}
        />
      ) : (
        <div className="space-y-4">
          {filteredPolicies.map((policy) => {
            const config = statusConfig[policy.status as keyof typeof statusConfig] || statusConfig.activa;
            const StatusIcon = config.icon;

            return (
              <div key={policy.id} className="bg-card rounded-2xl shadow-soft p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary flex-shrink-0">
                      <FileText size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground text-lg">
                          {policy.policy_type}
                        </h3>
                        {policy.policy_number && (
                          <span className="text-muted-foreground">
                            #{policy.policy_number}
                          </span>
                        )}
                      </div>
                      {policy.vehicle_brand && (
                        <p className="text-sm text-foreground mt-1">
                          {policy.vehicle_brand} {policy.vehicle_model} 
                          {policy.vehicle_year && ` (${policy.vehicle_year})`}
                        </p>
                      )}
                      {policy.vehicle_plate && (
                        <p className="text-sm text-muted-foreground">
                          Patente: {policy.vehicle_plate}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          Vigencia: {format(new Date(policy.start_date), "dd/MM/yy", { locale: es })} - {format(new Date(policy.end_date), "dd/MM/yy", { locale: es })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {policy.premium_amount && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">
                          ${policy.premium_amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {policy.payment_frequency || 'mensual'}
                        </p>
                      </div>
                    )}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${config.color}`}>
                      <StatusIcon size={14} />
                      {config.label}
                    </span>
                  </div>
                </div>

                {policy.coverage_type && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm">
                      <span className="font-medium text-foreground">Cobertura:</span>
                      <span className="text-muted-foreground ml-2">{policy.coverage_type}</span>
                    </p>
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

export default ProductorPolizas;
