import { CreditCard, CheckCircle, AlertCircle, Clock } from "lucide-react";

const mockPayments = [
  { id: 1, policy: "Auto - Ford Focus", amount: 45000, due: "01/02/2025", status: "pending" },
  { id: 2, policy: "Hogar - Av. Corrientes", amount: 18000, due: "15/02/2025", status: "pending" },
  { id: 3, policy: "Auto - Ford Focus", amount: 43000, due: "01/01/2025", status: "paid" },
];

const PortalPagos = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-foreground">Pagos</h1>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-card p-6 rounded-2xl shadow-soft">
        <p className="text-sm text-muted-foreground">Pendiente</p>
        <p className="text-3xl font-bold text-destructive">$63.000</p>
      </div>
      <div className="bg-card p-6 rounded-2xl shadow-soft">
        <p className="text-sm text-muted-foreground">Próximo vencimiento</p>
        <p className="text-xl font-bold text-foreground">01/02/2025</p>
      </div>
      <div className="bg-card p-6 rounded-2xl shadow-soft">
        <p className="text-sm text-muted-foreground">Pagado este mes</p>
        <p className="text-3xl font-bold text-green-600">$43.000</p>
      </div>
    </div>
    <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Póliza</th>
            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Monto</th>
            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Vencimiento</th>
            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Acción</th>
          </tr>
        </thead>
        <tbody>
          {mockPayments.map((p) => (
            <tr key={p.id} className="border-t border-border">
              <td className="p-4 font-medium">{p.policy}</td>
              <td className="p-4">${p.amount.toLocaleString()}</td>
              <td className="p-4">{p.due}</td>
              <td className="p-4">
                {p.status === "paid" ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm"><CheckCircle size={14}/>Pagado</span>
                ) : (
                  <span className="flex items-center gap-1 text-destructive text-sm"><Clock size={14}/>Pendiente</span>
                )}
              </td>
              <td className="p-4">
                {p.status === "pending" && <button className="btn-hero text-sm px-4 py-2">Pagar</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default PortalPagos;
