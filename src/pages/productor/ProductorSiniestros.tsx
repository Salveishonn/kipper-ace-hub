import { useState } from "react";
import { Search, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useClaims } from "@/hooks/useClaims";
import { usePolicies } from "@/hooks/usePolicies";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig = {
  recibido: { label: 'Recibido', color: 'bg-blue-100 text-blue-700', icon: AlertTriangle },
  en_gestion: { label: 'En gestión', color: 'bg-amber-100 text-amber-700', icon: Clock },
  resuelto: { label: 'Resuelto', color: 'bg-green-100 text-green-700', icon: CheckCircle },
};

const ProductorSiniestros = () => {
  const { user } = useAuth();
  const { data: claims, isLoading: claimsLoading, error: claimsError } = useClaims();
  const { data: policies } = usePolicies();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Get policy IDs assigned to this producer
  const myPolicyIds = policies?.filter(p => p.assigned_productor_id === user?.id).map(p => p.id) || [];
  
  // Filter claims for policies assigned to this producer
  const myClaims = claims?.filter(c => myPolicyIds.includes(c.policy_id)) || [];

  const filteredClaims = myClaims.filter(claim => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      claim.claim_number?.toLowerCase().includes(searchLower) ||
      claim.description?.toLowerCase().includes(searchLower);
    const matchesStatus = !statusFilter || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getPolicy = (policyId: string) => {
    return policies?.find(p => p.id === policyId);
  };

  if (claimsLoading) {
    return <LoadingState text="Cargando siniestros..." />;
  }

  if (claimsError) {
    return <ErrorState title="Error al cargar siniestros" message="Intenta recargar la página" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Siniestros</h1>
        <p className="text-muted-foreground">Siniestros de tus clientes</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por número o descripción..."
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
          <option value="recibido">Recibidos</option>
          <option value="en_gestion">En gestión</option>
          <option value="resuelto">Resueltos</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-blue-600">
            {myClaims.filter(c => c.status === 'recibido').length}
          </p>
          <p className="text-xs text-muted-foreground">Recibidos</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-amber-600">
            {myClaims.filter(c => c.status === 'en_gestion').length}
          </p>
          <p className="text-xs text-muted-foreground">En gestión</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-green-600">
            {myClaims.filter(c => c.status === 'resuelto').length}
          </p>
          <p className="text-xs text-muted-foreground">Resueltos</p>
        </div>
      </div>

      {/* Claims List */}
      {filteredClaims.length === 0 ? (
        <EmptyState
          title="Sin siniestros"
          description={search || statusFilter ? "No encontramos siniestros con esos filtros" : "Los siniestros de tus clientes aparecerán aquí"}
        />
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((claim) => {
            const config = statusConfig[claim.status as keyof typeof statusConfig] || statusConfig.recibido;
            const StatusIcon = config.icon;
            const policy = getPolicy(claim.policy_id);

            return (
              <div key={claim.id} className="bg-card rounded-2xl shadow-soft p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      claim.status === 'recibido' ? 'bg-blue-100 text-blue-600' :
                      claim.status === 'en_gestion' ? 'bg-amber-100 text-amber-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      <StatusIcon size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground text-lg">
                          Siniestro {claim.claim_number ? `#${claim.claim_number}` : ''}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Fecha del incidente: {format(new Date(claim.incident_date), "d 'de' MMMM 'de' yyyy", { locale: es })}
                        {claim.incident_location && ` • ${claim.incident_location}`}
                      </p>
                      <p className="text-sm text-foreground mt-2">
                        {claim.description}
                      </p>
                      {policy && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Póliza: {policy.policy_type} 
                          {policy.policy_number && ` #${policy.policy_number}`}
                          {policy.vehicle_brand && ` - ${policy.vehicle_brand} ${policy.vehicle_model}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${config.color} whitespace-nowrap`}>
                    <StatusIcon size={14} />
                    {config.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductorSiniestros;
