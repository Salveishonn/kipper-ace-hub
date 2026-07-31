import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { LoadingState, EmptyState } from "@/components/ui/loading-state";
import { writeAuditLog } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

const typeLabels: Record<string, string> = {
  vencimiento: '📅 Vencimiento',
  renovacion: '🔄 Renovación',
  siniestro: '⚠️ Siniestro',
  cobranza: '💰 Cobranza',
  seguimiento_lead: '📞 Seguimiento',
};

const AdminTareas = () => {
  const { data: tasks = [], isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const [filter, setFilter] = useState('pendiente');

  const filtered = tasks.filter(t => !filter || t.status === filter);

  const handleComplete = async (id: string) => {
    try {
      await updateTask.mutateAsync({ id, status: 'hecho' });
      await writeAuditLog({ action: 'task.completed', entity_type: 'task', entity_id: id });
      toast.success("Tarea completada");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await updateTask.mutateAsync({ id, status: 'descartado' });
      toast.success("Tarea descartada");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) return <LoadingState text="Cargando tareas..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tareas</h1>
        <p className="text-muted-foreground">Recordatorios y seguimiento operativo</p>
      </div>

      <div className="flex gap-2">
        {['pendiente', 'en_progreso', 'hecho', 'descartado', ''].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}
          >{f || 'Todos'}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Sin tareas" description="Ejecutá el chequeo diario para generar tareas automáticas" />
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <div key={task.id} className="bg-card rounded-xl shadow-soft p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{typeLabels[task.type] || task.type}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      task.status === 'hecho' ? 'bg-green-100 text-green-700' :
                      task.status === 'descartado' ? 'bg-muted text-muted-foreground' :
                      'bg-amber-100 text-amber-700'
                    }`}>{task.status}</span>
                  </div>
                  <p className="font-medium text-foreground">{task.title}</p>
                  {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                  {task.due_date && <p className="text-xs text-muted-foreground mt-1">Vence: {format(new Date(task.due_date), 'dd/MM/yyyy')}</p>}
                </div>
                {task.status === 'pendiente' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleComplete(task.id)} className="btn-hero text-sm px-4 py-2">Completar</button>
                    <button onClick={() => handleDismiss(task.id)} className="btn-hero-outline text-sm px-4 py-2">Descartar</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTareas;
