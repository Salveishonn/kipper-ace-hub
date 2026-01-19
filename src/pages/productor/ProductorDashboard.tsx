import { Link } from "react-router-dom";
import { 
  TrendingUp, Users, FileText, AlertTriangle, 
  ArrowUp, Clock, CheckCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLeads } from "@/hooks/useLeads";
import { usePolicies } from "@/hooks/usePolicies";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";

const ProductorDashboard = () => {
  const { user, profile } = useAuth();
  const { data: leads, isLoading: leadsLoading, error: leadsError } = useLeads();
  const { data: policies, isLoading: policiesLoading, error: policiesError } = usePolicies();

  // Filter leads assigned to this producer
  const myLeads = leads?.filter(l => l.assigned_productor_id === user?.id) || [];
  const newLeads = myLeads.filter(l => l.status === 'nuevo');
  const pendingLeads = myLeads.filter(l => ['contactado', 'cotizado'].includes(l.status));

  // Filter policies assigned to this producer
  const myPolicies = policies?.filter(p => p.assigned_productor_id === user?.id) || [];
  const activePolicies = myPolicies.filter(p => p.status === 'activa');

  if (leadsLoading || policiesLoading) {
    return <LoadingState text="Cargando dashboard..." />;
  }

  if (leadsError || policiesError) {
    return <ErrorState title="Error al cargar datos" message="Intenta recargar la página" />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          ¡Hola, {profile?.full_name?.split(" ")[0] || "Productor"}!
        </h1>
        <p className="text-muted-foreground">Acá está el resumen de tu actividad</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Leads Nuevos</p>
            <TrendingUp size={20} className="text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-foreground">{newLeads.length}</p>
          <p className="text-sm text-muted-foreground mt-2">Pendientes de contactar</p>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">En Gestión</p>
            <Clock size={20} className="text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-foreground">{pendingLeads.length}</p>
          <p className="text-sm text-muted-foreground mt-2">Leads en proceso</p>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Pólizas Activas</p>
            <FileText size={20} className="text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground">{activePolicies.length}</p>
          <p className="text-sm text-muted-foreground mt-2">Bajo tu gestión</p>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Clientes</p>
            <Users size={20} className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-foreground">
            {new Set(myPolicies.map(p => p.user_id)).size}
          </p>
          <p className="text-sm text-muted-foreground mt-2">Clientes asignados</p>
        </div>
      </div>

      {/* Leads List */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Leads Recientes</h2>
          <Link to="/productor/leads" className="text-sm text-emerald-600 font-medium hover:underline">
            Ver todos
          </Link>
        </div>

        {myLeads.length === 0 ? (
          <EmptyState
            title="Sin leads asignados"
            description="Cuando te asignen leads aparecerán aquí"
          />
        ) : (
          <div className="space-y-4">
            {myLeads.slice(0, 5).map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                    {lead.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{lead.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {lead.vehicle_type} • {lead.vehicle_brand} {lead.vehicle_model}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    lead.status === "nuevo"
                      ? "bg-emerald-100 text-emerald-700"
                      : lead.status === "contactado"
                      ? "bg-amber-100 text-amber-700"
                      : lead.status === "cotizado"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {lead.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/productor/leads"
          className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center"
        >
          <TrendingUp className="mx-auto mb-2 text-emerald-600" size={24} />
          <span className="text-sm font-medium text-foreground">Ver Leads</span>
        </Link>
        <Link
          to="/productor/clientes"
          className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center"
        >
          <Users className="mx-auto mb-2 text-emerald-600" size={24} />
          <span className="text-sm font-medium text-foreground">Mis Clientes</span>
        </Link>
        <Link
          to="/productor/polizas"
          className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center"
        >
          <FileText className="mx-auto mb-2 text-emerald-600" size={24} />
          <span className="text-sm font-medium text-foreground">Pólizas</span>
        </Link>
        <Link
          to="/productor/siniestros"
          className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center"
        >
          <AlertTriangle className="mx-auto mb-2 text-emerald-600" size={24} />
          <span className="text-sm font-medium text-foreground">Siniestros</span>
        </Link>
      </div>
    </div>
  );
};

export default ProductorDashboard;
