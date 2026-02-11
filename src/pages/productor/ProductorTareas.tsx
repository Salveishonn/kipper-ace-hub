import { useState } from "react";
import { useTasks, useUpdateTask, useMyTasks } from "@/hooks/useTasks";
import { writeAuditLog } from "@/hooks/useAuditLogs";
import { LoadingState, EmptyState } from "@/components/ui/loading-state";
import { format } from "date-fns";
import { toast } from "sonner";

const typeLabels: Record<string, string> = {
  vencimiento: '📅 Vencimiento',
  renovacion: '🔄 Renovación',
  siniestro: '⚠️ Siniestro',
  cobranza: '💰 Cobranza',
  seguimiento_lead: '📞 Seguimiento',
};

const ProductorTareas = () => {
  const { data: tasks = [], isLoading } = useMyTasks();
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

  if (isLoading) return <LoadingState text="Cargando tareas..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Tareas</h1>
        <p className="text-muted-foreground">Recordatorios y seguimiento</p>
      </div>

      <div className="flex gap-2">
        {['pendiente', 'en_progreso', ''].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}
          >{f || 'Todos'}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Sin tareas" description="No tenés tareas pendientes" />
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <div key={task.id} className="bg-card rounded-xl shadow-soft p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-sm">{typeLabels[task.type] || task.type}</span>
                  <p className="font-medium text-foreground">{task.title}</p>
                  {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                  {task.due_date && <p className="text-xs text-muted-foreground mt-1">Vence: {format(new Date(task.due_date), 'dd/MM/yyyy')}</p>}
                </div>
                {task.status === 'pendiente' && (
                  <button onClick={() => handleComplete(task.id)} className="btn-hero text-sm px-4 py-2">Completar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductorTareas;
