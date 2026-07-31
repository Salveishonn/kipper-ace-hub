import { useInstallments } from "@/hooks/useInstallments";
import { LoadingState, EmptyState } from "@/components/ui/loading-state";
import { format, addDays, isBefore, isAfter } from "date-fns";

const AdminVencimientos = () => {
  const { data: installments = [], isLoading } = useInstallments();

  const today = new Date();
  const in7 = addDays(today, 7);
  const in30 = addDays(today, 30);

  const overdue = installments.filter(i =>
    (i.status === 'pendiente' || i.status === 'atrasada') && isBefore(new Date(i.due_date), today)
  );
  const due7 = installments.filter(i => {
    const d = new Date(i.due_date);
    return i.status === 'pendiente' && !isBefore(d, today) && isBefore(d, in7);
  });
  const due30 = installments.filter(i => {
    const d = new Date(i.due_date);
    return i.status === 'pendiente' && isAfter(d, in7) && isBefore(d, in30);
  });

  if (isLoading) return <LoadingState text="Cargando vencimientos..." />;

  const renderList = (title: string, items: typeof installments, color: string) => (
    <div className="bg-card rounded-2xl shadow-soft p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">{title} ({items.length})</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Sin cuotas</p>
      ) : (
        <div className="space-y-3">
          {items.map(i => (
            <div key={i.id} className={`flex items-center justify-between p-3 ${color} rounded-xl`}>
              <div>
                <p className="font-medium text-foreground text-sm">Cuota #{i.installment_number}</p>
                <p className="text-xs text-muted-foreground">Vence: {format(new Date(i.due_date), 'dd/MM/yyyy')}</p>
              </div>
              <p className="font-bold text-foreground">${Number(i.amount).toLocaleString('es-AR')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vencimientos</h1>
        <p className="text-muted-foreground">Cuotas próximas a vencer y atrasadas</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-destructive">{overdue.length}</p>
          <p className="text-xs text-muted-foreground">Atrasadas</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-amber-600">{due7.length}</p>
          <p className="text-xs text-muted-foreground">Próximos 7 días</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-foreground">{due30.length}</p>
          <p className="text-xs text-muted-foreground">Próximos 30 días</p>
        </div>
      </div>

      <div className="space-y-6">
        {renderList("⚠️ Atrasadas", overdue, "bg-destructive/5")}
        {renderList("🔔 Próximos 7 días", due7, "bg-amber-50")}
        {renderList("📅 Próximos 30 días", due30, "bg-muted/30")}
      </div>
    </div>
  );
};

export default AdminVencimientos;
