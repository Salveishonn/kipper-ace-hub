import { AlertTriangle, Plus, Clock, CheckCircle } from "lucide-react";

const mockClaims = [
  { id: 1, policy: "Auto - Ford Focus", date: "10/01/2025", type: "Choque", status: "in_progress" },
];

const PortalSiniestros = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold text-foreground">Siniestros</h1>
      <button className="btn-hero flex items-center gap-2 text-sm"><Plus size={18}/>Reportar siniestro</button>
    </div>
    {mockClaims.length === 0 ? (
      <div className="bg-card rounded-2xl shadow-soft p-12 text-center">
        <AlertTriangle size={48} className="mx-auto text-muted-foreground mb-4"/>
        <p className="text-muted-foreground">No tenés siniestros reportados</p>
      </div>
    ) : (
      <div className="space-y-4">
        {mockClaims.map((c) => (
          <div key={c.id} className="bg-card rounded-2xl shadow-soft p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{c.type} - {c.policy}</h3>
              <p className="text-sm text-muted-foreground">Reportado: {c.date}</p>
            </div>
            <span className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
              <Clock size={14}/> En gestión
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default PortalSiniestros;
