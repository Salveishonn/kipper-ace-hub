import { 
  TrendingUp, Users, FileText, CreditCard, 
  AlertTriangle, Clock, ArrowUp, ArrowDown
} from "lucide-react";

// Mock data
const mockStats = {
  newLeadsToday: 5,
  pendingPayments: 12,
  openClaims: 3,
  totalClients: 847,
  monthlyGrowth: 8.5,
  conversionRate: 32,
};

const recentLeads = [
  { id: 1, name: "María García", type: "Auto", date: "Hace 10 min", status: "nuevo" },
  { id: 2, name: "Pedro López", type: "Hogar", date: "Hace 30 min", status: "contactado" },
  { id: 3, name: "Ana Fernández", type: "Auto", date: "Hace 1 hora", status: "nuevo" },
  { id: 4, name: "Luis Martínez", type: "Moto", date: "Hace 2 horas", status: "cotizado" },
];

const recentActivity = [
  { id: 1, text: "Nuevo lead de Auto recibido", time: "10 min" },
  { id: 2, text: "Pago confirmado - Póliza #1234", time: "25 min" },
  { id: 3, text: "Siniestro #567 actualizado a 'En gestión'", time: "1 hora" },
  { id: 4, text: "Nuevo cliente registrado: Juan Demo", time: "2 horas" },
];

const AdminDashboard = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Resumen de actividad de hoy</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Leads Hoy</p>
            <TrendingUp size={20} className="text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground">{mockStats.newLeadsToday}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
            <ArrowUp size={14} />
            <span>+23% vs ayer</span>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Pagos Pendientes</p>
            <CreditCard size={20} className="text-destructive" />
          </div>
          <p className="text-3xl font-bold text-foreground">{mockStats.pendingPayments}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-destructive">
            <ArrowUp size={14} />
            <span>3 nuevos hoy</span>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Siniestros Abiertos</p>
            <AlertTriangle size={20} className="text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-foreground">{mockStats.openClaims}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <Clock size={14} />
            <span>1 nuevo esta semana</span>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total Clientes</p>
            <Users size={20} className="text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground">{mockStats.totalClients}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
            <ArrowUp size={14} />
            <span>+{mockStats.monthlyGrowth}% este mes</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads */}
        <div className="lg:col-span-2 bg-card rounded-2xl shadow-soft p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Leads Recientes</h2>
            <a href="/admin/leads" className="text-sm text-primary font-medium hover:underline">
              Ver todos
            </a>
          </div>

          <div className="space-y-4">
            {recentLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    {lead.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">{lead.type} • {lead.date}</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    lead.status === "nuevo"
                      ? "bg-primary/10 text-primary"
                      : lead.status === "contactado"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {lead.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="bg-card rounded-2xl shadow-soft p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Actividad Reciente</h2>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-foreground">{activity.text}</p>
                  <p className="text-xs text-muted-foreground">Hace {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl shadow-soft p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Conversión de Leads</h2>
          <div className="flex items-end gap-4">
            <div className="text-5xl font-bold text-primary">{mockStats.conversionRate}%</div>
            <div className="text-sm text-muted-foreground pb-2">
              de leads convertidos a clientes este mes
            </div>
          </div>
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${mockStats.conversionRate}%` }}
            />
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-soft p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Distribución por Tipo</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Auto</span>
              <span className="text-sm font-medium">65%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "65%" }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Hogar</span>
              <span className="text-sm font-medium">20%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full" style={{ width: "20%" }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Otros</span>
              <span className="text-sm font-medium">15%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary/40 rounded-full" style={{ width: "15%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
