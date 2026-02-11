import { Link } from "react-router-dom";
import {
  TrendingUp, Users, FileText, AlertTriangle,
  Clock, CheckCircle, ListChecks
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLeads } from "@/hooks/useLeads";
import { usePolicies } from "@/hooks/usePolicies";
import { useInstallments } from "@/hooks/useInstallments";
import { useMyTasks } from "@/hooks/useTasks";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { addDays, isBefore, format } from "date-fns";

const ProductorDashboard = () => {
  const { user, profile } = useAuth();
  const { data: leads, isLoading: ll } = useLeads();
  const { data: policies, isLoading: lp } = usePolicies();
  const { data: installments = [], isLoading: li } = useInstallments();
  const { data: tasks = [], isLoading: lt } = useMyTasks();

  const myLeads = leads?.filter(l => l.assigned_productor_id === user?.id) || [];
  const newLeads = myLeads.filter(l => l.status === 'nuevo');
  const pendingLeads = myLeads.filter(l => ['contactado', 'cotizado'].includes(l.status));

  const myPolicies = policies?.filter(p => p.assigned_productor_id === user?.id) || [];
  const activePolicies = myPolicies.filter(p => p.status === 'activa');

  // Get installments for my policies
  const myPolicyIds = new Set(myPolicies.map(p => p.id));
  const myInstallments = installments.filter(i => myPolicyIds.has(i.policy_id));
  const today = new Date();
  const in7 = addDays(today, 7);
  const overdueInst = myInstallments.filter(i => (i.status === 'pendiente' || i.status === 'atrasada') && isBefore(new Date(i.due_date), today));
  const dueSoon = myInstallments.filter(i => {
    const d = new Date(i.due_date);
    return i.status === 'pendiente' && !isBefore(d, today) && isBefore(d, in7);
  });

  const isLoading = ll || lp || li || lt;
  if (isLoading) return <LoadingState text="Cargando dashboard..." />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          ¡Hola, {profile?.full_name?.split(" ")[0] || "Productor"}!
        </h1>
        <p className="text-muted-foreground">Acá está el resumen de tu actividad</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card p-5 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted-foreground">Leads Nuevos</p>
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-foreground">{newLeads.length}</p>
        </div>
        <div className="bg-card p-5 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted-foreground">En Gestión</p>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-foreground">{pendingLeads.length}</p>
        </div>
        <div className="bg-card p-5 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted-foreground">Pólizas Activas</p>
            <FileText size={18} className="text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground">{activePolicies.length}</p>
        </div>
        <div className="bg-card p-5 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted-foreground">Cuotas Atrasadas</p>
            <AlertTriangle size={18} className="text-destructive" />
          </div>
          <p className="text-3xl font-bold text-destructive">{overdueInst.length}</p>
        </div>
        <div className="bg-card p-5 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted-foreground">Tareas Pend.</p>
            <ListChecks size={18} className="text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground">{tasks.length}</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="bg-card rounded-2xl shadow-soft p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Mis Tareas</h2>
            <Link to="/productor/tareas" className="text-sm text-primary font-medium hover:underline">Ver todas</Link>
          </div>
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Sin tareas pendientes</p>
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div>
                    <p className="font-medium text-foreground text-sm">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.due_date ? format(new Date(t.due_date), 'dd/MM') : '—'}</p>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leads */}
        <div className="bg-card rounded-2xl shadow-soft p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Leads Recientes</h2>
            <Link to="/productor/leads" className="text-sm text-emerald-600 font-medium hover:underline">Ver todos</Link>
          </div>
          {myLeads.length === 0 ? (
            <EmptyState title="Sin leads asignados" description="Cuando te asignen leads aparecerán aquí" />
          ) : (
            <div className="space-y-3">
              {myLeads.slice(0, 5).map(lead => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-sm">
                      {lead.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{lead.full_name}</p>
                      <p className="text-xs text-muted-foreground">{lead.vehicle_type || '—'} • {lead.vehicle_brand || ''}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    lead.status === 'nuevo' ? 'bg-emerald-100 text-emerald-700' :
                    lead.status === 'contactado' ? 'bg-amber-100 text-amber-700' :
                    lead.status === 'cotizado' ? 'bg-blue-100 text-blue-700' :
                    'bg-muted text-muted-foreground'
                  }`}>{lead.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/productor/leads" className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center">
          <TrendingUp className="mx-auto mb-2 text-emerald-600" size={24} />
          <span className="text-sm font-medium text-foreground">Ver Leads</span>
        </Link>
        <Link to="/productor/tareas" className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center">
          <ListChecks className="mx-auto mb-2 text-primary" size={24} />
          <span className="text-sm font-medium text-foreground">Mis Tareas</span>
        </Link>
        <Link to="/productor/polizas" className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center">
          <FileText className="mx-auto mb-2 text-emerald-600" size={24} />
          <span className="text-sm font-medium text-foreground">Pólizas</span>
        </Link>
        <Link to="/productor/siniestros" className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center">
          <AlertTriangle className="mx-auto mb-2 text-emerald-600" size={24} />
          <span className="text-sm font-medium text-foreground">Siniestros</span>
        </Link>
      </div>
    </div>
  );
};

export default ProductorDashboard;
