import { useState } from "react";
import {
  Search, Plus, Phone, Mail, X, ChevronDown, UserPlus
} from "lucide-react";
import { useLeads, useUpdateLead } from "@/hooks/useLeads";
import { useProducers } from "@/hooks/useProducers";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { writeAuditLog } from "@/hooks/useAuditLogs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusColors: Record<string, string> = {
  nuevo: "bg-primary/10 text-primary",
  contactado: "bg-yellow-100 text-yellow-700",
  cotizado: "bg-blue-100 text-blue-700",
  cerrado: "bg-green-100 text-green-700",
  perdido: "bg-muted text-muted-foreground",
};

const AdminLeads = () => {
  const { data: leads, isLoading, error } = useLeads();
  const { data: producers = [] } = useProducers();
  const updateLead = useUpdateLead();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const filtered = leads?.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = l.full_name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  }) || [];

  const selected = selectedId ? leads?.find(l => l.id === selectedId) : null;

  const statusCounts = {
    nuevo: leads?.filter(l => l.status === 'nuevo').length || 0,
    contactado: leads?.filter(l => l.status === 'contactado').length || 0,
    cotizado: leads?.filter(l => l.status === 'cotizado').length || 0,
    cerrado: leads?.filter(l => l.status === 'cerrado').length || 0,
    perdido: leads?.filter(l => l.status === 'perdido').length || 0,
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateLead.mutateAsync({ id: leadId, status: newStatus });
      await writeAuditLog({
        action: 'lead.status_updated',
        entity_type: 'lead',
        entity_id: leadId,
        metadata: { new_status: newStatus },
      });
      toast.success(`Estado actualizado a "${newStatus}"`);
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar");
    }
  };

  const handleAssignProducer = async (leadId: string, producerId: string) => {
    try {
      await updateLead.mutateAsync({ id: leadId, assigned_productor_id: producerId });
      await writeAuditLog({
        action: 'lead.producer_assigned',
        entity_type: 'lead',
        entity_id: leadId,
        metadata: { producer_id: producerId },
      });
      toast.success("Productor asignado");
    } catch (err: any) {
      toast.error(err.message || "Error al asignar");
    }
  };

  const handleConvertToClient = async () => {
    if (!selected) return;
    setConverting(true);
    try {
      // Check if profile exists with this email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', selected.email)
        .single();

      if (existingProfile) {
        // Link the lead to existing user
        await updateLead.mutateAsync({ id: selected.id, status: 'cerrado' });
        await writeAuditLog({
          action: 'lead.converted',
          entity_type: 'lead',
          entity_id: selected.id,
          metadata: { linked_user_id: existingProfile.user_id, method: 'existing_user' },
        });
        toast.success("Lead vinculado a cliente existente. ¡Creá una póliza ahora!");
      } else {
        // Create a contact record and mark as converted
        await supabase.from('contacts').upsert([{
          email: selected.email,
          full_name: selected.full_name,
          phone: selected.phone || null,
          origin: 'lead_conversion',
          tags: ['cliente'],
        }], { onConflict: 'email' });

        await updateLead.mutateAsync({ id: selected.id, status: 'cerrado' });
        await writeAuditLog({
          action: 'lead.converted',
          entity_type: 'lead',
          entity_id: selected.id,
          metadata: { method: 'new_contact', note: 'Pendiente invitación de registro' },
        });
        toast.success("Lead convertido. Contacto creado. Invitalo a registrarse para vincular su cuenta.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al convertir");
    } finally {
      setConverting(false);
    }
  };

  if (isLoading) return <LoadingState text="Cargando leads..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar los leads" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground">Pipeline de prospectos</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} className="input-kipper pl-10" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-kipper max-w-xs">
          <option value="all">Todos</option>
          <option value="nuevo">Nuevo</option>
          <option value="contactado">Contactado</option>
          <option value="cotizado">Cotizado</option>
          <option value="cerrado">Cerrado</option>
          <option value="perdido">Perdido</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(statusCounts).map(([label, count]) => (
          <div key={label} className="bg-card rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[label]}`}>{label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState title="Sin leads" description="No hay leads que coincidan" />
      ) : (
        <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Lead</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Origen</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr key={lead.id} onClick={() => setSelectedId(lead.id)} className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-foreground">{lead.full_name}</p>
                      <p className="text-sm text-muted-foreground">{lead.email}</p>
                    </td>
                    <td className="p-4 text-sm">{lead.vehicle_type || '—'} {lead.vehicle_brand || ''}</td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[lead.status]}`}>{lead.status}</span></td>
                    <td className="p-4 text-sm text-muted-foreground">{lead.origin || '—'}</td>
                    <td className="p-4 text-sm text-muted-foreground">{format(new Date(lead.created_at), 'dd/MM/yy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setSelectedId(null)}>
          <div className="bg-card rounded-2xl shadow-elevated max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Detalle del Lead</h2>
              <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl font-bold">
                  {selected.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{selected.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{selected.email}</p>
                  {selected.phone && <p className="text-sm text-muted-foreground">{selected.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Tipo</p><p className="font-medium">{selected.vehicle_type || '—'}</p></div>
                <div><p className="text-muted-foreground">Marca/Modelo</p><p className="font-medium">{selected.vehicle_brand || '—'} {selected.vehicle_model || ''}</p></div>
                <div><p className="text-muted-foreground">Cobertura</p><p className="font-medium">{selected.coverage_type || '—'}</p></div>
                <div><p className="text-muted-foreground">Origen</p><p className="font-medium">{selected.origin || '—'}</p></div>
                <div><p className="text-muted-foreground">DNI</p><p className="font-medium">{selected.dni || '—'}</p></div>
                <div><p className="text-muted-foreground">Localidad</p><p className="font-medium">{selected.locality || '—'}</p></div>
              </div>

              {/* Status Buttons */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Estado</p>
                <div className="flex gap-2 flex-wrap">
                  {["nuevo", "contactado", "cotizado", "cerrado", "perdido"].map(s => (
                    <button key={s} onClick={() => handleStatusChange(selected.id, s)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selected.status === s ? statusColors[s] : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {/* Assign Producer */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Asignar Productor</p>
                <select className="input-kipper" value={selected.assigned_productor_id || ''} onChange={e => handleAssignProducer(selected.id, e.target.value)}>
                  <option value="">Sin asignar</option>
                  {producers.map(p => (
                    <option key={p.user_id} value={p.user_id}>{p.profile?.full_name || p.profile?.email}</option>
                  ))}
                </select>
              </div>

              {selected.notes && (
                <div><p className="text-sm text-muted-foreground">Notas</p><p className="text-sm">{selected.notes}</p></div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button onClick={handleConvertToClient} disabled={converting || selected.status === 'cerrado'}
                  className="btn-hero flex-1 inline-flex items-center justify-center gap-2">
                  <UserPlus size={16} /> {converting ? "Convirtiendo..." : "Convertir a Cliente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeads;
