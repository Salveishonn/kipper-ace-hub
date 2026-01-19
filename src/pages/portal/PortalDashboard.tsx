import { Link } from "react-router-dom";
import { 
  FileText, CreditCard, AlertTriangle, ArrowRight, 
  AlertCircle, CheckCircle, Clock 
} from "lucide-react";

// Mock data
const mockStats = {
  activePolices: 2,
  pendingPayments: 1,
  nextExpiration: "15/02/2025",
  openClaims: 0,
};

const mockPolicies = [
  {
    id: 1,
    type: "Auto",
    company: "La Segunda",
    vehicle: "Ford Focus 2021",
    status: "active",
    nextPayment: "01/02/2025",
    amount: 45000,
  },
  {
    id: 2,
    type: "Hogar",
    company: "Sancor",
    address: "Av. Corrientes 1234",
    status: "active",
    nextPayment: "15/02/2025",
    amount: 18000,
  },
];

const PortalDashboard = () => {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">¡Hola, Juan!</h1>
        <p className="text-muted-foreground">Acá podés ver el estado de tus seguros</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pólizas Activas</p>
              <p className="text-3xl font-bold text-foreground">{mockStats.activePolices}</p>
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
              <p className="text-3xl font-bold text-foreground">{mockStats.pendingPayments}</p>
            </div>
            <div className="p-3 bg-destructive/10 rounded-xl text-destructive">
              <CreditCard size={24} />
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Próx. Vencimiento</p>
              <p className="text-2xl font-bold text-foreground">{mockStats.nextExpiration}</p>
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
              <p className="text-3xl font-bold text-foreground">{mockStats.openClaims}</p>
            </div>
            <div className="p-3 bg-muted rounded-xl text-muted-foreground">
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Alert */}
      {mockStats.pendingPayments > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-4">
          <AlertCircle className="text-destructive flex-shrink-0" size={24} />
          <div className="flex-1">
            <p className="font-medium text-foreground">Tenés pagos pendientes</p>
            <p className="text-sm text-muted-foreground">Regularizá tu situación para mantener la cobertura activa</p>
          </div>
          <Link to="/portal/pagos" className="btn-hero text-sm px-4 py-2">
            Pagar ahora
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

        <div className="space-y-4">
          {mockPolicies.map((policy) => (
            <div
              key={policy.id}
              className="bg-card rounded-2xl shadow-soft p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
                  {policy.type === "Auto" ? "🚗" : "🏠"}
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {policy.type} - {policy.company}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {policy.vehicle || policy.address}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
                  <CheckCircle size={14} />
                  Activa
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  Próximo pago: {policy.nextPayment}
                </p>
              </div>

              <Link
                to={`/portal/polizas/${policy.id}`}
                className="btn-hero-outline text-sm px-4 py-2 hidden sm:inline-flex"
              >
                Ver detalle
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/portal/siniestros/nuevo"
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
            <span className="text-sm font-medium text-foreground">Descargar Póliza</span>
          </Link>
          <Link
            to="/contacto"
            className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center"
          >
            <span className="mx-auto mb-2 text-primary text-2xl block">💬</span>
            <span className="text-sm font-medium text-foreground">Contactar</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PortalDashboard;
