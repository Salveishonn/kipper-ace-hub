import { useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, Users, FileText, CreditCard,
  AlertTriangle, Clock, CheckCircle, Calendar,
  ArrowRight, Play, RefreshCw, ListChecks
} from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { usePolicies } from "@/hooks/usePolicies";
import { useInstallments } from "@/hooks/useInstallments";
import { useClaims } from "@/hooks/useClaims";
import { useTasks } from "@/hooks/useTasks";
import { useRecentActivity } from "@/hooks/useAuditLogs";
import { LoadingState } from "@/components/ui/loading-state";
import { runDailyChecks } from "@/lib/dailyChecks";
import { toast } from "sonner";
import { format, addDays, isBefore } from "date-fns";
import { es } from "date-fns/locale";

const AdminDashboard = () => {
  const { data: leads = [], isLoading: ll } = useLeads();
  const { data: policies = [], isLoading: lp } = usePolicies();
  const { data: installments = [], isLoading: li } = useInstallments();
  const { data: claims = [], isLoading: lc } = useClaims();
  const { data: tasks = [], isLoading: lt } = useTasks({ status: 'pendiente' });
  const { data: activity = [] } = useRecentActivity();
  const [runningChecks, setRunningChecks] = useState(false);

  const today = new Date();
  const in7days = addDays(today, 7);
  const in30days = addDays(today, 30);
  const todayStr = format(today, 'yyyy-MM-dd');

  const overdueInstallments = installments.filter(i => i.status === 'atrasada' || (i.status === 'pendiente' && isBefore(new Date(i.due_date), today)));
  const dueSoon = installments.filter(i => {
    const d = new Date(i.due_date);
    return i.status === 'pendiente' && !isBefore(d, today) && isBefore(d, in7days);
  });
  const renewalPolicies = policies.filter(p => {
    const end = new Date(p.end_date);
    return p.status === 'activa' && !isBefore(end, today) && isBefore(end, in30days);
  });
  const openClaims = claims.filter(c => c.status !== 'cerrado');
  const newLeads = leads.filter(l => l.status === 'nuevo');

  const handleDailyChecks = async () => {
    setRunningChecks(true);
    try {
      const result = await runDailyChecks();
      toast.success(`Chequeo completado: ${result.overdueMarked} atrasadas, ${result.tasksCreated} tareas, ${result.renewalAlerts} renovaciones`);
    } catch (err: any) {
      toast.error(err.message || "Error al ejecutar chequeo");
    } finally {
      setRunningChecks(false);
    }
  };

  const isLoading = ll || lp || li || lc || lt;
  if (isLoading) return <LoadingState text="Cargando dashboard..." />;

  const actionLabel = (a: string) => {
    const map: Record<string, string> = {
      'lead.status_updated': 'Lead actualizado',
      'lead.converted': 'Lead convertido a cliente',
      'policy.created': 'Póliza creada',
      'installment.paid': 'Cuota pagada',
      'installment.generated': 'Cuotas generadas',
      'claim.status_updated': 'Siniestro actualizado',
      'system.daily_checks': 'Chequeo diario ejecutado',
      'task.completed': 'Tarea completada',
    };
    return map[a] || a;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Resumen operativo — {format(today, "d 'de' MMMM yyyy", { locale: es })}</p>
        </div>
        <button onClick={handleDailyChecks} disabled={runningChecks} className="btn-hero text-sm px-4 py-2 inline-flex items-center gap-2">
          <RefreshCw size={16} className={runningChecks ? "animate-spin" : ""} />
          {runningChecks ? "Ejecutando..." : "Ejecutar chequeo diario"}
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card p-5 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted-foreground">Leads Nuevos</p>
            <TrendingUp size={18} className="text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground">{newLeads.length}</p>
        </div>
        <div className="bg-card p-5 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted-foreground">Cuotas Atrasadas</p>
            <AlertTriangle size={18} className="text-destructive" />
          </div>
          <p className="text-3xl font-bold text-destructive">{overdueInstallments.length}</p>
        </div>
        <div className="bg-card p-5 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted-foreground">Venc. 7 días</p>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-foreground">{dueSoon.length}</p>
        </div>
        <div className="bg-card p-5 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted-foreground">Renovaciones</p>
            <Calendar size={18} className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-foreground">{renewalPolicies.length}</p>
        </div>
        <div className="bg-card p-5 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted-foreground">Siniestros</p>
            <AlertTriangle size={18} className="text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-foreground">{openClaims.length}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/admin/polizas" className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center">
          <FileText className="mx-auto mb-2 text-primary" size={24} />
          <span className="text-sm font-medium text-foreground">Crear Póliza</span>
        </Link>
        <Link to="/admin/vencimientos" className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center">
          <Clock className="mx-auto mb-2 text-amber-600" size={24} />
          <span className="text-sm font-medium text-foreground">Ver Vencimientos</span>
        </Link>
        <Link to="/admin/tareas" className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center">
          <ListChecks className="mx-auto mb-2 text-primary" size={24} />
          <span className="text-sm font-medium text-foreground">Tareas Pendientes</span>
        </Link>
        <Link to="/admin/renovaciones" className="bg-card p-4 rounded-xl shadow-soft hover:shadow-card transition-shadow text-center">
          <RefreshCw className="mx-auto mb-2 text-blue-600" size={24} />
          <span className="text-sm font-medium text-foreground">Renovaciones</span>
        </Link>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overdue installments */}
        <div className="lg:col-span-2 bg-card rounded-2xl shadow-soft p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Cuotas Atrasadas</h2>
            <Link to="/admin/pagos" className="text-sm text-primary font-medium hover:underline">Ver todas</Link>
          </div>
          {overdueInstallments.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
              <p className="text-muted-foreground">No hay cuotas atrasadas 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueInstallments.slice(0, 5).map(inst => (
                <div key={inst.id} className="flex items-center justify-between p-3 bg-destructive/5 rounded-xl">
                  <div>
                    <p className="font-medium text-foreground text-sm">Cuota {inst.installment_number}</p>
                    <p className="text-xs text-muted-foreground">Venc: {format(new Date(inst.due_date), 'dd/MM/yyyy')}</p>
                  </div>
                  <p className="font-bold text-destructive">${Number(inst.amount).toLocaleString('es-AR')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="bg-card rounded-2xl shadow-soft p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Actividad Reciente</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin actividad registrada</p>
          ) : (
            <div className="space-y-3">
              {activity.slice(0, 8).map(a => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-foreground">{actionLabel(a.action)}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), "dd/MM HH:mm")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Renewal alerts + tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl shadow-soft p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Renovaciones (30d)</h2>
            <Link to="/admin/renovaciones" className="text-sm text-primary font-medium hover:underline">Ver todas</Link>
          </div>
          {renewalPolicies.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Sin renovaciones próximas</p>
          ) : (
            <div className="space-y-3">
              {renewalPolicies.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <div>
                    <p className="font-medium text-foreground text-sm">{p.policy_type} #{p.policy_number || p.id.slice(0,8)}</p>
                    <p className="text-xs text-muted-foreground">Vence: {format(new Date(p.end_date), 'dd/MM/yyyy')}</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Renovar</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl shadow-soft p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Tareas Pendientes</h2>
            <Link to="/admin/tareas" className="text-sm text-primary font-medium hover:underline">Ver todas</Link>
          </div>
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Sin tareas pendientes</p>
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div>
                    <p className="font-medium text-foreground text-sm">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.type} • {t.due_date ? format(new Date(t.due_date), 'dd/MM') : '—'}</p>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-2xl shadow-soft text-center">
          <p className="text-3xl font-bold text-foreground">{policies.length}</p>
          <p className="text-xs text-muted-foreground">Total Pólizas</p>
        </div>
        <div className="bg-card p-5 rounded-2xl shadow-soft text-center">
          <p className="text-3xl font-bold text-foreground">{leads.length}</p>
          <p className="text-xs text-muted-foreground">Total Leads</p>
        </div>
        <div className="bg-card p-5 rounded-2xl shadow-soft text-center">
          <p className="text-3xl font-bold text-green-600">
            {policies.filter(p => p.status === 'activa').length}
          </p>
          <p className="text-xs text-muted-foreground">Pólizas Activas</p>
        </div>
        <div className="bg-card p-5 rounded-2xl shadow-soft text-center">
          <p className="text-3xl font-bold text-foreground">
            {new Set(policies.filter(p => p.user_id).map(p => p.user_id)).size}
          </p>
          <p className="text-xs text-muted-foreground">Clientes con Póliza</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
