import { useState } from "react";
import { Search, Plus, FileText, Calendar, RefreshCw, ChevronDown, X } from "lucide-react";
import { usePolicies } from "@/hooks/usePolicies";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const statusColors: Record<string, string> = {
  activa: "bg-green-100 text-green-700",
  vencida: "bg-red-100 text-red-700",
  anulada: "bg-muted text-muted-foreground",
  pendiente: "bg-amber-100 text-amber-700",
};

const AdminPolizas = () => {
  const { data: policies, isLoading, error } = usePolicies();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    policy_number: "",
    policy_type: "auto",
    coverage_type: "",
    status: "activa",
    start_date: "",
    end_date: "",
    premium_amount: "",
    vehicle_brand: "",
    vehicle_model: "",
    vehicle_plate: "",
    vehicle_year: "",
    payment_frequency: "mensual",
    notes: "",
  });

  const filtered = policies?.filter(p => {
    const q = search.toLowerCase();
    const matchSearch =
      p.policy_number?.toLowerCase().includes(q) ||
      p.policy_type?.toLowerCase().includes(q) ||
      p.vehicle_brand?.toLowerCase().includes(q) ||
      p.vehicle_plate?.toLowerCase().includes(q);
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  }) || [];

  const handleCreate = async () => {
    if (!form.start_date || !form.end_date || !form.policy_type) {
      toast.error("Completá los campos obligatorios");
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from("policies").insert([{
        policy_number: form.policy_number || null,
        policy_type: form.policy_type,
        coverage_type: form.coverage_type || null,
        status: form.status,
        start_date: form.start_date,
        end_date: form.end_date,
        premium_amount: form.premium_amount ? Number(form.premium_amount) : null,
        vehicle_brand: form.vehicle_brand || null,
        vehicle_model: form.vehicle_model || null,
        vehicle_plate: form.vehicle_plate || null,
        vehicle_year: form.vehicle_year ? Number(form.vehicle_year) : null,
        payment_frequency: form.payment_frequency,
        notes: form.notes || null,
      }]);
      if (error) throw error;
      toast.success("Póliza creada");
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    } catch (err: any) {
      toast.error(err.message || "Error al crear póliza");
    } finally {
      setCreating(false);
    }
  };

  const handleSync = () => {
    toast.info("Sincronización con Federación Patronal — Próximamente");
  };

  const selected = selectedId ? policies?.find(p => p.id === selectedId) : null;

  if (isLoading) return <LoadingState text="Cargando pólizas..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar las pólizas" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pólizas</h1>
          <p className="text-muted-foreground">Gestión interna de pólizas</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSync} className="btn-hero-outline text-sm px-4 py-2 inline-flex items-center gap-2">
            <RefreshCw size={16} /> Sincronizar (Próximamente FedPat)
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-hero text-sm px-4 py-2 inline-flex items-center gap-2">
            <Plus size={16} /> Crear póliza
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar por número, tipo, marca, patente..." value={search} onChange={e => setSearch(e.target.value)} className="input-kipper pl-10" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-kipper max-w-xs">
          <option value="">Todos</option>
          <option value="activa">Activas</option>
          <option value="vencida">Vencidas</option>
          <option value="anulada">Anuladas</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", count: policies?.length || 0 },
          { label: "Activas", count: policies?.filter(p => p.status === "activa").length || 0 },
          { label: "Vencidas", count: policies?.filter(p => p.status === "vencida").length || 0 },
          { label: "Anuladas", count: policies?.filter(p => p.status === "anulada").length || 0 },
        ].map(s => (
          <div key={s.label} className="bg-card p-4 rounded-xl shadow-soft text-center">
            <p className="text-2xl font-bold text-foreground">{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState title="Sin pólizas" description="No hay pólizas que coincidan con tu búsqueda" />
      ) : (
        <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Nro</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Vehículo</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Vigencia</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Prima</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Sync</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} onClick={() => setSelectedId(p.id)} className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors">
                    <td className="p-4 text-sm font-medium">{p.policy_number || "—"}</td>
                    <td className="p-4 text-sm">{p.policy_type}</td>
                    <td className="p-4 text-sm">{p.vehicle_brand ? `${p.vehicle_brand} ${p.vehicle_model || ""}` : "—"}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {format(new Date(p.start_date), "dd/MM/yy")} - {format(new Date(p.end_date), "dd/MM/yy")}
                    </td>
                    <td className="p-4 text-sm font-medium">{p.premium_amount ? `$${p.premium_amount.toLocaleString()}` : "—"}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[p.status] || "bg-muted"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {(p as any).sync_status === "synced" ? "✓" : "manual"}
                    </td>
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
              <h2 className="text-xl font-bold text-foreground">Detalle de Póliza</h2>
              <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Número</p><p className="font-medium">{selected.policy_number || "—"}</p></div>
                <div><p className="text-muted-foreground">Tipo</p><p className="font-medium">{selected.policy_type}</p></div>
                <div><p className="text-muted-foreground">Cobertura</p><p className="font-medium">{selected.coverage_type || "—"}</p></div>
                <div><p className="text-muted-foreground">Estado</p><p className="font-medium">{selected.status}</p></div>
                <div><p className="text-muted-foreground">Vigencia</p><p className="font-medium">{format(new Date(selected.start_date), "dd/MM/yyyy")} - {format(new Date(selected.end_date), "dd/MM/yyyy")}</p></div>
                <div><p className="text-muted-foreground">Prima</p><p className="font-medium">{selected.premium_amount ? `$${selected.premium_amount.toLocaleString()}` : "—"}</p></div>
                <div><p className="text-muted-foreground">Vehículo</p><p className="font-medium">{selected.vehicle_brand || "—"} {selected.vehicle_model || ""}</p></div>
                <div><p className="text-muted-foreground">Patente</p><p className="font-medium">{selected.vehicle_plate || "—"}</p></div>
                <div><p className="text-muted-foreground">Aseguradora</p><p className="font-medium">{selected.insurance_company?.name || "—"}</p></div>
                <div><p className="text-muted-foreground">Frecuencia pago</p><p className="font-medium">{selected.payment_frequency || "mensual"}</p></div>
              </div>
              {selected.notes && (
                <div><p className="text-sm text-muted-foreground">Notas</p><p className="text-sm">{selected.notes}</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl shadow-elevated max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Crear Póliza</h2>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Número</label>
                  <input className="input-kipper mt-1" value={form.policy_number} onChange={e => setForm({...form, policy_number: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Tipo *</label>
                  <select className="input-kipper mt-1" value={form.policy_type} onChange={e => setForm({...form, policy_type: e.target.value})}>
                    <option value="auto">Auto</option>
                    <option value="moto">Moto</option>
                    <option value="hogar">Hogar</option>
                    <option value="vida">Vida</option>
                    <option value="ap">Accidentes Personales</option>
                    <option value="comercio">Comercio / PyME</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Inicio *</label>
                  <input type="date" className="input-kipper mt-1" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Fin *</label>
                  <input type="date" className="input-kipper mt-1" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Prima ($)</label>
                  <input type="number" className="input-kipper mt-1" value={form.premium_amount} onChange={e => setForm({...form, premium_amount: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Cobertura</label>
                  <input className="input-kipper mt-1" value={form.coverage_type} onChange={e => setForm({...form, coverage_type: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Marca</label>
                  <input className="input-kipper mt-1" value={form.vehicle_brand} onChange={e => setForm({...form, vehicle_brand: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Modelo</label>
                  <input className="input-kipper mt-1" value={form.vehicle_model} onChange={e => setForm({...form, vehicle_model: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Patente</label>
                  <input className="input-kipper mt-1" value={form.vehicle_plate} onChange={e => setForm({...form, vehicle_plate: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Año</label>
                  <input type="number" className="input-kipper mt-1" value={form.vehicle_year} onChange={e => setForm({...form, vehicle_year: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Notas</label>
                <textarea className="input-kipper mt-1 min-h-[80px]" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
              <button onClick={handleCreate} disabled={creating} className="btn-hero w-full text-sm py-3">
                {creating ? "Creando..." : "Crear Póliza"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPolizas;
