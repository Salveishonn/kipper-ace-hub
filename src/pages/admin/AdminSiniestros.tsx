import { useState } from "react";
import { Search, X } from "lucide-react";
import { useClaims, useUpdateClaim } from "@/hooks/useClaims";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { writeAuditLog } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  recibido: "bg-blue-100 text-blue-700",
  "en gestión": "bg-amber-100 text-amber-700",
  pendiente: "bg-yellow-100 text-yellow-700",
  cerrado: "bg-green-100 text-green-700",
};

const AdminSiniestros = () => {
  const { data: claims = [], isLoading, error } = useClaims();
  const updateClaim = useUpdateClaim();
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const filtered = claims.filter(c => !filter || c.status === filter);
  const selected = selectedId ? claims.find(c => c.id === selectedId) : null;

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateClaim.mutateAsync({ id, status });
      await writeAuditLog({
        action: 'claim.status_updated',
        entity_type: 'claim',
        entity_id: id,
        metadata: { new_status: status },
      });
      toast.success(`Estado actualizado a "${status}"`);
    } catch (err: any) {
      toast.error(err.message || "Error");
    }
  };

  const handleAddNotes = async () => {
    if (!selected || !notes.trim()) return;
    try {
      await updateClaim.mutateAsync({ id: selected.id, resolution_notes: notes });
      await writeAuditLog({
        action: 'claim.notes_added',
        entity_type: 'claim',
        entity_id: selected.id,
        metadata: { notes },
      });
      toast.success("Notas guardadas");
      setNotes("");
    } catch (err: any) {
      toast.error(err.message || "Error");
    }
  };

  if (isLoading) return <LoadingState text="Cargando siniestros..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar los siniestros" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Siniestros</h1>
        <p className="text-muted-foreground">Gestión de reclamos</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {['recibido', 'en gestión', 'pendiente', 'cerrado'].map(s => (
          <div key={s} className="bg-card p-4 rounded-xl shadow-soft text-center">
            <p className="text-2xl font-bold text-foreground">{claims.filter(c => c.status === s).length}</p>
            <p className="text-xs text-muted-foreground capitalize">{s}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {['', 'recibido', 'en gestión', 'pendiente', 'cerrado'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}
          >{f || 'Todos'}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Sin siniestros" description="No hay siniestros registrados" />
      ) : (
        <div className="space-y-4">
          {filtered.map(claim => (
            <div key={claim.id} onClick={() => { setSelectedId(claim.id); setNotes(claim.resolution_notes || ""); }}
              className="bg-card rounded-2xl shadow-soft p-6 cursor-pointer hover:shadow-card transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">#{claim.claim_number || claim.id.slice(0,8)}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[claim.status] || 'bg-muted'}`}>{claim.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{claim.description.slice(0, 100)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Incidente: {format(new Date(claim.incident_date), 'dd/MM/yyyy')}
                    {claim.policy && ` • ${claim.policy.policy_type} ${claim.policy.insurance_company?.name || ''}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setSelectedId(null)}>
          <div className="bg-card rounded-2xl shadow-elevated max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Siniestro #{selected.claim_number || selected.id.slice(0,8)}</h2>
              <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm">{selected.description}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Fecha incidente</p><p className="font-medium">{format(new Date(selected.incident_date), 'dd/MM/yyyy')}</p></div>
                <div><p className="text-muted-foreground">Ubicación</p><p className="font-medium">{selected.incident_location || '—'}</p></div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Estado</p>
                <div className="flex gap-2 flex-wrap">
                  {['recibido', 'en gestión', 'pendiente', 'cerrado'].map(s => (
                    <button key={s} onClick={() => handleStatusUpdate(selected.id, s)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selected.status === s ? statusColors[s] : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                    >{s}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Notas internas</p>
                <textarea className="input-kipper min-h-[80px]" value={notes} onChange={e => setNotes(e.target.value)} />
                <button onClick={handleAddNotes} className="btn-hero text-sm px-4 py-2 mt-2">Guardar notas</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSiniestros;
