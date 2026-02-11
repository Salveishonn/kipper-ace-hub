import { useState } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2, Play, Clock, FileText, Shield, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface IntegrationStatus {
  configured: boolean;
  last_token_refresh: string | null;
  last_runs: Array<{
    id: string;
    run_type: string;
    status: string;
    started_at: string;
    finished_at: string | null;
    error_message: string | null;
  }>;
}

const syncTypes = [
  { key: "policies", label: "Pólizas", icon: FileText },
  { key: "installments", label: "Cuotas", icon: Clock },
  { key: "documents", label: "Documentos", icon: FileText },
  { key: "claims", label: "Siniestros", icon: AlertTriangle },
];

const fieldMappings = [
  { category: "Pólizas", fields: ["policy_number → numero_poliza", "policy_type → ramo", "start_date → fecha_inicio", "end_date → fecha_fin", "premium_amount → prima", "coverage_type → tipo_cobertura", "external_policy_id → id_poliza_fedpat"] },
  { category: "Documentos", fields: ["Póliza digital", "Certificado de cobertura", "Certificado Mercosur", "Libre deuda", "Cupones de pago"] },
  { category: "Siniestros", fields: ["claim_number → numero_siniestro", "status → estado", "incident_date → fecha_siniestro", "description → descripcion"] },
];

const AdminIntegraciones = () => {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [testingToken, setTestingToken] = useState(false);

  const callEdgeFunction = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No autenticado");

    const res = await supabase.functions.invoke("fedpat-sync", { body });
    if (res.error) throw new Error(res.error.message || "Error en la función");
    return res.data;
  };

  const checkStatus = async () => {
    setLoading(true);
    try {
      const data = await callEdgeFunction({ action: "check-status" });
      setStatus(data);
    } catch (err: any) {
      toast.error(err.message || "Error al consultar estado");
    } finally {
      setLoading(false);
    }
  };

  const testToken = async () => {
    setTestingToken(true);
    try {
      const data = await callEdgeFunction({ action: "test-token" });
      toast.success(data.message || "Token generado");
      checkStatus();
    } catch (err: any) {
      toast.error(err.message || "Error al probar token");
    } finally {
      setTestingToken(false);
    }
  };

  const runSync = async (runType: string) => {
    setSyncing(runType);
    try {
      const data = await callEdgeFunction({ action: "sync", run_type: runType });
      toast.success(data.message || "Sincronización completada");
      checkStatus();
    } catch (err: any) {
      toast.error(err.message || "Error en sincronización");
    } finally {
      setSyncing(null);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "success": return "text-green-600";
      case "error": return "text-destructive";
      case "started": return "text-amber-600";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integraciones</h1>
          <p className="text-muted-foreground">Centro de integración con Federación Patronal</p>
        </div>
        <button onClick={checkStatus} disabled={loading} className="btn-hero text-sm px-4 py-2 inline-flex items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Consultar Estado
        </button>
      </div>

      {/* Status Section */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield size={20} className="text-primary" /> Estado de la Integración
        </h2>

        {!status ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Pulsá "Consultar Estado" para ver el estado de la integración.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                {status.configured ? (
                  <CheckCircle size={20} className="text-green-600" />
                ) : (
                  <XCircle size={20} className="text-amber-500" />
                )}
                <div>
                  <p className="font-medium text-foreground text-sm">Credenciales</p>
                  <p className="text-xs text-muted-foreground">
                    {status.configured ? "Configuradas" : "No configuradas"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                <Clock size={20} className="text-primary" />
                <div>
                  <p className="font-medium text-foreground text-sm">Último token</p>
                  <p className="text-xs text-muted-foreground">
                    {status.last_token_refresh
                      ? format(new Date(status.last_token_refresh), "dd/MM/yy HH:mm", { locale: es })
                      : "Nunca"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                <Zap size={20} className="text-primary" />
                <div>
                  <p className="font-medium text-foreground text-sm">Sincronizaciones</p>
                  <p className="text-xs text-muted-foreground">{status.last_runs.length} registros</p>
                </div>
              </div>
            </div>

            {!status.configured && (
              <div className="bg-accent/50 border border-accent rounded-xl p-4">
                <p className="text-sm text-foreground font-medium mb-2">⚠️ Integración no configurada</p>
                <p className="text-sm text-muted-foreground">
                  Para conectar con Federación Patronal, se necesitan las siguientes variables del servidor:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                  <li>FEDPAT_BASE_URL</li>
                  <li>FEDPAT_CLIENT_ID</li>
                  <li>FEDPAT_CLIENT_SECRET</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">Contactá al equipo técnico para configurarlas de forma segura.</p>
              </div>
            )}

            <button
              onClick={testToken}
              disabled={testingToken}
              className="btn-hero-outline text-sm px-4 py-2 inline-flex items-center gap-2"
            >
              {testingToken ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
              Probar Token (Mock)
            </button>
          </div>
        )}
      </div>

      {/* Sync Controls */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <RefreshCw size={20} className="text-primary" /> Sincronización Manual
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Ejecutá sincronizaciones individuales por tipo de dato. Las credenciales deben estar configuradas.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {syncTypes.map(st => (
            <button
              key={st.key}
              onClick={() => runSync(st.key)}
              disabled={syncing !== null}
              className="flex flex-col items-center gap-3 p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-primary/20"
            >
              {syncing === st.key ? (
                <Loader2 size={24} className="text-primary animate-spin" />
              ) : (
                <st.icon size={24} className="text-primary" />
              )}
              <span className="font-medium text-foreground text-sm">Sincronizar {st.label}</span>
              <span className="text-xs text-muted-foreground">FedPat</span>
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText size={20} className="text-primary" /> Historial de Sincronizaciones
        </h2>
        {!status?.last_runs?.length ? (
          <p className="text-sm text-muted-foreground py-4">No hay sincronizaciones registradas. Pulsá "Consultar Estado" para cargar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Inicio</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Fin</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Error</th>
                </tr>
              </thead>
              <tbody>
                {status.last_runs.map(run => (
                  <tr key={run.id} className="border-t border-border">
                    <td className="p-3 text-sm font-medium capitalize">{run.run_type}</td>
                    <td className={`p-3 text-sm font-medium ${statusColor(run.status)}`}>{run.status}</td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {format(new Date(run.started_at), "dd/MM HH:mm", { locale: es })}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {run.finished_at ? format(new Date(run.finished_at), "dd/MM HH:mm", { locale: es }) : "—"}
                    </td>
                    <td className="p-3 text-sm text-destructive">{run.error_message || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Data Mapping Checklist */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText size={20} className="text-primary" /> Mapeo de Datos (FedPat → Kipper)
        </h2>
        <div className="space-y-6">
          {fieldMappings.map(fm => (
            <div key={fm.category}>
              <h3 className="font-medium text-foreground mb-2">{fm.category}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fm.fields.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg text-sm">
                    <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                    <span className="text-foreground font-mono text-xs">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminIntegraciones;
