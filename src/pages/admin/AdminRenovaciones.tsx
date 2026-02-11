import { usePolicies } from "@/hooks/usePolicies";
import { LoadingState, EmptyState } from "@/components/ui/loading-state";
import { format, addDays, isBefore } from "date-fns";

const AdminRenovaciones = () => {
  const { data: policies = [], isLoading } = usePolicies();

  const today = new Date();
  const in30 = addDays(today, 30);
  const in60 = addDays(today, 60);

  const renew30 = policies.filter(p => {
    const end = new Date(p.end_date);
    return p.status === 'activa' && !isBefore(end, today) && isBefore(end, in30);
  });
  const renew60 = policies.filter(p => {
    const end = new Date(p.end_date);
    return p.status === 'activa' && !isBefore(end, in30) && isBefore(end, in60);
  });

  if (isLoading) return <LoadingState text="Cargando renovaciones..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Renovaciones</h1>
        <p className="text-muted-foreground">Pólizas próximas a vencer</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-amber-600">{renew30.length}</p>
          <p className="text-xs text-muted-foreground">Vencen en 30 días</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-foreground">{renew60.length}</p>
          <p className="text-xs text-muted-foreground">Vencen en 60 días</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Próximas a vencer (30 días)</h2>
        {renew30.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin renovaciones próximas</p>
        ) : (
          <div className="space-y-3">
            {renew30.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
                <div>
                  <p className="font-medium text-foreground">{p.policy_type} #{p.policy_number || p.id.slice(0,8)}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.insurance_company?.name || '—'} • {p.vehicle_brand || ''} {p.vehicle_model || ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">Vence: {format(new Date(p.end_date), 'dd/MM/yyyy')}</p>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">Renovar</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Próximas 31-60 días</h2>
        {renew60.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin renovaciones</p>
        ) : (
          <div className="space-y-3">
            {renew60.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div>
                  <p className="font-medium text-foreground">{p.policy_type} #{p.policy_number || p.id.slice(0,8)}</p>
                  <p className="text-sm text-muted-foreground">{p.insurance_company?.name || '—'}</p>
                </div>
                <p className="text-sm text-muted-foreground">Vence: {format(new Date(p.end_date), 'dd/MM/yyyy')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRenovaciones;
