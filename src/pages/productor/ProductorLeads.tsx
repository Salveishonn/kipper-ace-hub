import { useState } from "react";
import { Search, Filter, Phone, Mail, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLeads, useUpdateLead } from "@/hooks/useLeads";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusOptions = [
  { value: 'nuevo', label: 'Nuevo', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'contactado', label: 'Contactado', color: 'bg-amber-100 text-amber-700' },
  { value: 'cotizado', label: 'Cotizado', color: 'bg-blue-100 text-blue-700' },
  { value: 'cerrado', label: 'Cerrado', color: 'bg-green-100 text-green-700' },
  { value: 'perdido', label: 'Perdido', color: 'bg-gray-100 text-gray-700' },
];

const ProductorLeads = () => {
  const { user } = useAuth();
  const { data: leads, isLoading, error } = useLeads();
  const updateLead = useUpdateLead();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  // Filter leads assigned to this producer
  const myLeads = leads?.filter(l => l.assigned_productor_id === user?.id) || [];

  const filteredLeads = myLeads.filter(lead => {
    const matchesSearch = lead.full_name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      (lead.phone && lead.phone.includes(search));
    const matchesStatus = !statusFilter || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateLead.mutateAsync({ id: leadId, status: newStatus });
      toast.success("Estado actualizado");
    } catch (err) {
      toast.error("Error al actualizar estado");
    }
  };

  const handleSaveNotes = async (leadId: string) => {
    try {
      await updateLead.mutateAsync({ id: leadId, notes });
      toast.success("Notas guardadas");
      setSelectedLead(null);
      setNotes("");
    } catch (err) {
      toast.error("Error al guardar notas");
    }
  };

  if (isLoading) {
    return <LoadingState text="Cargando leads..." />;
  }

  if (error) {
    return <ErrorState title="Error al cargar leads" message="Intenta recargar la página" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Leads</h1>
        <p className="text-muted-foreground">Gestiona los leads que te fueron asignados</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-kipper pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-kipper max-w-xs"
        >
          <option value="">Todos los estados</option>
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {statusOptions.map(status => {
          const count = myLeads.filter(l => l.status === status.value).length;
          return (
            <button
              key={status.value}
              onClick={() => setStatusFilter(statusFilter === status.value ? "" : status.value)}
              className={`p-4 rounded-xl text-center transition-all ${
                statusFilter === status.value
                  ? "ring-2 ring-emerald-500 bg-card"
                  : "bg-card hover:bg-muted/50"
              }`}
            >
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground">{status.label}</p>
            </button>
          );
        })}
      </div>

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <EmptyState
          title="No hay leads"
          description={search || statusFilter ? "Probá ajustando los filtros" : "Cuando te asignen leads aparecerán aquí"}
        />
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="bg-card rounded-2xl shadow-soft overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg flex-shrink-0">
                      {lead.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{lead.full_name}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-emerald-600">
                            <Mail size={14} />
                            {lead.email}
                          </a>
                        )}
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-emerald-600">
                            <Phone size={14} />
                            {lead.phone}
                          </a>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {format(new Date(lead.created_at), "d MMM yyyy", { locale: es })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-2">
                        <span className="font-medium">{lead.vehicle_type}</span>
                        {lead.vehicle_brand && ` • ${lead.vehicle_brand}`}
                        {lead.vehicle_model && ` ${lead.vehicle_model}`}
                        {lead.vehicle_year && ` (${lead.vehicle_year})`}
                      </p>
                      {lead.coverage_type && (
                        <p className="text-sm text-muted-foreground">
                          Cobertura: {lead.coverage_type}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border-0 cursor-pointer ${
                        statusOptions.find(s => s.value === lead.status)?.color || 'bg-gray-100'
                      }`}
                    >
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        setSelectedLead(selectedLead === lead.id ? null : lead.id);
                        setNotes(lead.notes || "");
                      }}
                      className="btn-hero-outline text-sm px-4 py-2"
                    >
                      {selectedLead === lead.id ? "Cerrar" : "Notas"}
                    </button>
                  </div>
                </div>

                {/* Notes Section */}
                {selectedLead === lead.id && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Notas internas
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Agregá notas sobre el seguimiento de este lead..."
                      className="input-kipper min-h-[100px]"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => handleSaveNotes(lead.id)}
                        className="btn-hero text-sm px-4 py-2"
                        disabled={updateLead.isPending}
                      >
                        Guardar notas
                      </button>
                    </div>
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

export default ProductorLeads;
