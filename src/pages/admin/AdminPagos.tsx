import { useState } from "react";
import { Search, CheckCircle, Clock, AlertCircle, X, FileCheck } from "lucide-react";
import { useInstallments, useUpdateInstallment } from "@/hooks/useInstallments";
import { usePaymentProofs, useReviewPaymentProof } from "@/hooks/usePaymentProofs";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { writeAuditLog } from "@/hooks/useAuditLogs";
import { format, isBefore } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminPagos = () => {
  const [tab, setTab] = useState<"installments" | "proofs">("installments");
  const { data: installments = [], isLoading, error } = useInstallments();
  const updateInstallment = useUpdateInstallment();
  const { data: proofs = [], isLoading: loadingProofs } = usePaymentProofs();
  const reviewProof = useReviewPaymentProof();
  const [filter, setFilter] = useState<string>("");
  const [marking, setMarking] = useState<string | null>(null);

  const today = new Date();

  const filtered = installments.filter(i => {
    if (!filter) return true;
    if (filter === 'atrasada') return i.status === 'atrasada' || (i.status === 'pendiente' && isBefore(new Date(i.due_date), today));
    return i.status === filter;
  });

  const handleMarkPaid = async (id: string) => {
    setMarking(id);
    try {
      await updateInstallment.mutateAsync({
        id,
        status: 'pagado',
        paid_at: new Date().toISOString(),
        payment_method: 'manual',
      });
      await writeAuditLog({
        action: 'installment.paid',
        entity_type: 'installment',
        entity_id: id,
        metadata: { method: 'manual', paid_at: new Date().toISOString() },
      });
      toast.success("Cuota marcada como pagada");
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setMarking(null);
    }
  };

  const exportCSV = () => {
    const headers = ['Cuota', 'Monto', 'Vencimiento', 'Estado', 'Pago', 'Método'];
    const rows = filtered.map(i => [
      i.installment_number,
      i.amount,
      i.due_date,
      i.status,
      i.paid_at || '',
      i.payment_method || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pagos-${format(today, 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  if (isLoading) return <LoadingState text="Cargando pagos..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar los pagos" />;

  const overdueCount = installments.filter(i => i.status === 'atrasada' || (i.status === 'pendiente' && isBefore(new Date(i.due_date), today))).length;
  const paidCount = installments.filter(i => i.status === 'pagado').length;
  const pendingCount = installments.filter(i => i.status === 'pendiente').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pagos</h1>
          <p className="text-muted-foreground">Gestión de cuotas e installments</p>
        </div>
        <button onClick={exportCSV} className="btn-hero-outline text-sm px-4 py-2">Exportar CSV</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-green-600">{paidCount}</p>
          <p className="text-xs text-muted-foreground">Pagadas</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pendientes</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-destructive">{overdueCount}</p>
          <p className="text-xs text-muted-foreground">Atrasadas</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button onClick={() => setTab("installments")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === "installments" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          Cuotas
        </button>
        <button onClick={() => setTab("proofs")}
          className={`px-4 py-2 text-sm font-medium border-b-2 inline-flex items-center gap-2 ${tab === "proofs" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          <FileCheck size={14} /> Comprobantes ({proofs.filter(p => p.status === 'pendiente').length})
        </button>
      </div>

      {tab === "installments" && (
        <>
          <div className="flex gap-2">
            {[
              { value: '', label: 'Todos' },
              { value: 'pendiente', label: 'Pendientes' },
              { value: 'atrasada', label: 'Atrasadas' },
              { value: 'pagado', label: 'Pagadas' },
            ].map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}
              >{f.label}</button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="Sin cuotas" description="No hay cuotas que coincidan" />
          ) : (
            <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Cuota</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Monto</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Vencimiento</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Pagado</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(i => {
                      const isOverdue = i.status === 'atrasada' || (i.status === 'pendiente' && isBefore(new Date(i.due_date), today));
                      return (
                        <tr key={i.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                          <td className="p-4 text-sm font-medium">#{i.installment_number}</td>
                          <td className="p-4 text-sm font-medium">${Number(i.amount).toLocaleString('es-AR')}</td>
                          <td className="p-4 text-sm text-muted-foreground">{format(new Date(i.due_date), 'dd/MM/yyyy')}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              i.status === 'pagado' ? 'bg-green-100 text-green-700' :
                              isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {isOverdue && i.status !== 'pagado' ? 'atrasada' : i.status}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">{i.paid_at ? format(new Date(i.paid_at), 'dd/MM/yy') : '—'}</td>
                          <td className="p-4">
                            {i.status !== 'pagado' && (
                              <button onClick={() => handleMarkPaid(i.id)} disabled={marking === i.id}
                                className="text-sm text-primary font-medium hover:underline">
                                {marking === i.id ? "..." : "Marcar pagada"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "proofs" && (
        loadingProofs ? <LoadingState text="Cargando comprobantes..." /> :
        proofs.length === 0 ? <EmptyState title="Sin comprobantes" description="Aún no se recibieron comprobantes" /> : (
          <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Monto</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Archivo</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proofs.map(p => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-4 text-sm">{format(new Date(p.created_at), 'dd/MM/yy')}</td>
                    <td className="p-4 text-sm">{p.amount ? `$${Number(p.amount).toLocaleString('es-AR')}` : '—'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.status === 'aprobado' ? 'bg-green-100 text-green-700' :
                        p.status === 'rechazado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>{p.status}</span>
                    </td>
                    <td className="p-4 text-sm">
                      <button onClick={async () => {
                        const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(p.file_path, 60);
                        if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                      }} className="text-primary hover:underline">Ver comprobante</button>
                    </td>
                    <td className="p-4 text-sm space-x-2">
                      {p.status === 'pendiente' && (
                        <>
                          <button onClick={() => reviewProof.mutate({ id: p.id, status: 'aprobado' }, { onSuccess: () => toast.success('Aprobado') })}
                            className="text-green-700 hover:underline">Aprobar</button>
                          <button onClick={() => reviewProof.mutate({ id: p.id, status: 'rechazado' }, { onSuccess: () => toast.success('Rechazado') })}
                            className="text-destructive hover:underline">Rechazar</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

export default AdminPagos;
