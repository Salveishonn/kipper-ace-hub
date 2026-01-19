import { Link } from "react-router-dom";
import { FileText, Download, CheckCircle, Clock } from "lucide-react";

const mockPolicies = [
  { id: 1, type: "Auto", company: "La Segunda", vehicle: "Ford Focus 2021", status: "active", expiry: "15/06/2025", amount: 45000 },
  { id: 2, type: "Hogar", company: "Sancor", address: "Av. Corrientes 1234", status: "active", expiry: "20/08/2025", amount: 18000 },
];

const PortalPolizas = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-foreground">Mis Pólizas</h1>
    <div className="space-y-4">
      {mockPolicies.map((p) => (
        <div key={p.id} className="bg-card rounded-2xl shadow-soft p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-2xl">
                {p.type === "Auto" ? "🚗" : "🏠"}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{p.type} - {p.company}</h3>
                <p className="text-sm text-muted-foreground">{p.vehicle || p.address}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1 text-green-600"><CheckCircle size={14}/> Activa</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><Clock size={14}/> Vence: {p.expiry}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-hero-outline text-sm px-4 py-2 flex items-center gap-2">
                <Download size={16}/> Descargar
              </button>
              <Link to={`/portal/polizas/${p.id}`} className="btn-hero text-sm px-4 py-2">Ver detalle</Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default PortalPolizas;
