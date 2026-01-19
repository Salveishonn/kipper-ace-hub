import { useState } from "react";
import { 
  Search, Filter, Plus, MoreHorizontal, Phone, Mail, 
  MessageSquare, ChevronDown, User, Car, Home, Calendar
} from "lucide-react";

// Mock leads data
const mockLeads = [
  {
    id: 1,
    name: "María García",
    email: "maria@email.com",
    phone: "11-5555-1234",
    type: "Auto",
    vehicle: "Ford Focus 2022",
    coverage: "Todo Riesgo",
    status: "nuevo",
    producer: null,
    date: "2025-01-19",
    source: "Cotizador",
  },
  {
    id: 2,
    name: "Pedro López",
    email: "pedro@email.com",
    phone: "11-5555-5678",
    type: "Hogar",
    address: "Av. Corrientes 1234",
    coverage: "Integral",
    status: "contactado",
    producer: "Juan Kipper",
    date: "2025-01-18",
    source: "Contacto Web",
  },
  {
    id: 3,
    name: "Ana Fernández",
    email: "ana@email.com",
    phone: "11-5555-9012",
    type: "Auto",
    vehicle: "Chevrolet Cruze 2021",
    coverage: "Terceros Completo",
    status: "cotizado",
    producer: "María Kipper",
    date: "2025-01-17",
    source: "Cotizador",
  },
  {
    id: 4,
    name: "Luis Martínez",
    email: "luis@email.com",
    phone: "11-5555-3456",
    type: "Moto",
    vehicle: "Honda CB250 2023",
    coverage: "Todo Riesgo",
    status: "cerrado",
    producer: "Juan Kipper",
    date: "2025-01-15",
    source: "Referido",
  },
  {
    id: 5,
    name: "Carolina Díaz",
    email: "caro@email.com",
    phone: "11-5555-7890",
    type: "Auto",
    vehicle: "Toyota Corolla 2020",
    coverage: "Terceros",
    status: "perdido",
    producer: "María Kipper",
    date: "2025-01-14",
    source: "Cotizador",
  },
];

const statusColors: Record<string, string> = {
  nuevo: "bg-primary/10 text-primary",
  contactado: "bg-yellow-100 text-yellow-700",
  cotizado: "bg-blue-100 text-blue-700",
  cerrado: "bg-green-100 text-green-700",
  perdido: "bg-muted text-muted-foreground",
};

const AdminLeads = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<typeof mockLeads[0] | null>(null);

  const filteredLeads = mockLeads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground">Gestión de prospectos</p>
        </div>
        <button className="btn-hero inline-flex items-center gap-2 text-sm">
          <Plus size={18} />
          Nuevo Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-kipper pl-10"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-kipper pr-10 appearance-none cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="nuevo">Nuevo</option>
            <option value="contactado">Contactado</option>
            <option value="cotizado">Cotizado</option>
            <option value="cerrado">Cerrado</option>
            <option value="perdido">Perdido</option>
          </select>
          <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Nuevos", count: 2, color: "bg-primary" },
          { label: "Contactados", count: 3, color: "bg-yellow-500" },
          { label: "Cotizados", count: 5, color: "bg-blue-500" },
          { label: "Cerrados", count: 12, color: "bg-green-500" },
          { label: "Perdidos", count: 4, color: "bg-muted-foreground" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${stat.color}`} />
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Lead</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tipo</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Cobertura</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Productor</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Fecha</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {lead.type === "Auto" || lead.type === "Moto" ? (
                        <Car size={16} className="text-muted-foreground" />
                      ) : (
                        <Home size={16} className="text-muted-foreground" />
                      )}
                      <span className="text-sm">{lead.type}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-foreground">{lead.coverage}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[lead.status]}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-foreground">
                    {lead.producer || <span className="text-muted-foreground">Sin asignar</span>}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{lead.date}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
                        <Phone size={16} />
                      </button>
                      <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
                        <Mail size={16} />
                      </button>
                      <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Detail Modal (simplified) */}
      {selectedLead && (
        <div className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-elevated max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Detalle del Lead</h2>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary text-2xl font-bold">
                  {selectedLead.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{selectedLead.name}</h3>
                  <p className="text-muted-foreground">{selectedLead.email}</p>
                  <p className="text-muted-foreground">{selectedLead.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tipo</p>
                  <p className="font-medium">{selectedLead.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Cobertura</p>
                  <p className="font-medium">{selectedLead.coverage}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Vehículo/Dirección</p>
                  <p className="font-medium">{selectedLead.vehicle || selectedLead.address}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Origen</p>
                  <p className="font-medium">{selectedLead.source}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Estado</p>
                <div className="flex gap-2 flex-wrap">
                  {["nuevo", "contactado", "cotizado", "cerrado", "perdido"].map((status) => (
                    <button
                      key={status}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedLead.status === status
                          ? statusColors[status]
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Asignar a Productor</p>
                <select className="input-kipper">
                  <option value="">Seleccionar productor</option>
                  <option value="1">Juan Kipper</option>
                  <option value="2">María Kipper</option>
                  <option value="3">Carlos Productor</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button className="btn-hero flex-1">Convertir a Cliente</button>
                <button className="btn-hero-outline flex-1">Agregar Nota</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeads;
