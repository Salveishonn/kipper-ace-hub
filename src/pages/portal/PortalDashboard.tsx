import { Link } from "react-router-dom";
import { 
  FileText, CreditCard, AlertTriangle, ArrowRight, 
  AlertCircle, CheckCircle, Clock, Plus
} from "lucide-react";
import { useMyPolicies } from "@/hooks/usePolicies";
import { usePendingInstallments } from "@/hooks/useInstallments";
import { useMyClaims } from "@/hooks/useClaims";
import { useAuth } from "@/hooks/useAuth";
import { format, addDays, isBefore } from "date-fns";
import { es } from "date-fns/locale";

const PortalDashboard = () => {
  const { profile } = useAuth();
  const { data: policies = [], isLoading: loadingPolicies } = useMyPolicies();
  const { data: pendingInstallments = [], isLoading: loadingInstallments } = usePendingInstallments();
  const { data: claims = [], isLoading: loadingClaims } = useMyClaims();

  const activePolicies = policies.filter(p => p.status === 'activa');
  const openClaims = claims.filter(c => c.status !== 'cerrado');
  
  // Find upcoming due dates (next 7 days)
  const today = new Date();
  const upcomingDue = pendingInstallments.filter(i => {
    const dueDate = new Date(i.due_date);
    return isBefore(dueDate, addDays(today, 7));
  });

  const overduePayments = pendingInstallments.filter(i => {
    const dueDate = new Date(i.due_date);
    return isBefore(dueDate, today);
  });

  const isLoading = loadingPolicies || loadingInstallments || loadingClaims;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          ¡Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'}!
        </h1>
        <p className="text-muted-foreground">Acá podés ver el estado de tus seguros</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pólizas Activas</p>
              <p className="text-3xl font-bold text-foreground">{activePolicies.length}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <FileText size={24} />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pagos Pendientes</p>
              <p className="text-3xl font-bold text-foreground">{pendingInstallments.length}</p>
            </div>
            <div className={`p-3 rounded-xl ${pendingInstallments.length > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
              <CreditCard size={24} />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Próx. Vencimiento</p>
              <p className="text-xl font-bold text-foreground">
                {upcomingDue.length > 0 
                  ? format(new Date(upcomingDue[0].due_date), 'dd/MM/yyyy')
                  : '-'}
              </p>
            </div>
            <div className="p-3 bg-accent rounded-xl text-accent-foreground">
              <Clock size={24} />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Siniestros Abiertos</p>
              <p className="text-3xl font-bold text-foreground">{openClaims.length}</p>
            </div>
            <div className={`p-3 rounded-xl ${openClaims.length > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-muted text-muted-foreground'}`}>
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {overduePayments.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-4">
          <AlertCircle className="text-destructive flex-shrink-0" size={24} />
          <div className="flex-1">
            <p className="font-medium text-foreground">Tenés {overduePayments.length} pago(s) vencido(s)</p>
            <p className="text-sm text-muted-foreground">Regularizá tu situación para mantener la cobertura activa</p>
          </div>
          <Link to="/portal/pagos" className="btn-hero text-sm px-4 py-2 whitespace-nowrap">
            Pagar ahora
          </Link>
        </div>
      )}

      {upcomingDue.length > 0 && overduePayments.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-4">
          <Clock className="text-yellow-600 flex-shrink-0" size={24} />
          <div className="flex-1">
            <p className="font-medium text-foreground">Tenés pagos próximos a vencer</p>
            <p className="text-sm text-muted-foreground">
              {upcomingDue.length} cuota(s) vencen en los próximos 7 días
            </p>
          </div>
          <Link to="/portal/pagos" className="btn-hero-outline text-sm px-4 py-2 whitespace-nowrap">
            Ver pagos
          </Link>
        </div>
      )}

      {/* Policies */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Mis Pólizas</h2>
          <Link to="/portal/polizas" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>

        {activePolicies.length === 0 ? (
          <div className="bg-card rounded-2xl shadow-soft p-8 text-center">
            <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No tenés pólizas activas</p>
            <Link to="/portal/solicitudes" className="btn-hero inline-flex items-center gap-2">
              <Plus size={18} /> Solicitar seguro
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {activePolicies.slice(0, 3).map((policy) => (
              <div
                key={policy.id}
                className="bg-card rounded-2xl shadow-soft p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
                    {policy.policy_type === "auto" ? "🚗" : 
                     policy.policy_type === "moto" ? "🏍️" :
                     policy.policy_type === "hogar" ? "🏠" : "📋"}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {policy.policy_type.charAt(0).toUpperCase() + policy.policy_type.slice(1)} 
                      {policy.insurance_company && ` - ${policy.insurance_company.name}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {policy.vehicle_brand && policy.vehicle_model 
                        ? `${policy.vehicle_brand} ${policy.vehicle_model} ${policy.vehicle_year || ''}`
                        : `Póliza #${policy.policy_number || policy.id.slice(0, 8)}`}
                    </p>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
                    <CheckCircle size={14} />
                    Activa
                  </span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vence: {format(new Date(policy.end_date), 'dd/MM/yyyy')}
                  </p>
                </div>

                <Link
                  to={`/portal/polizas`}
                  className="btn-hero-outline text-sm px-4 py-2 hidden sm:inline-flex"
                >
                  Ver detalle
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/portal/siniestros"
            className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center"
          >
            <AlertTriangle className="mx-auto mb-2 text-primary" size={24} />
            <span className="text-sm font-medium text-foreground">Reportar Siniestro</span>
          </Link>
          <Link
            to="/portal/pagos"
            className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center"
          >
            <CreditCard className="mx-auto mb-2 text-primary" size={24} />
            <span className="text-sm font-medium text-foreground">Pagar Cuota</span>
          </Link>
          <Link
            to="/portal/polizas"
            className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center"
          >
            <FileText className="mx-auto mb-2 text-primary" size={24} />
            <span className="text-sm font-medium text-foreground">Ver Pólizas</span>
          </Link>
          <Link
            to="/portal/solicitudes"
            className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center"
          >
            <Plus className="mx-auto mb-2 text-primary" size={24} />
            <span className="text-sm font-medium text-foreground">Nueva Solicitud</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PortalDashboard;
