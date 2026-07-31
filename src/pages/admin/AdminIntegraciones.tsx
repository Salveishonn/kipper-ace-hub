import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2, Shield, Zap, Clock, FileText, Info, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface IntegrationRun {
  id: string;
  run_type: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
  metadata?: Record<string, unknown>;
}

interface IntegrationStatus {
  status: string;
  provider: string;
  mode: "mock" | "sandbox" | "production";
  configured: boolean;
  last_token_refresh: string | null;
  token_expires_at: string | null;
  last_runs: IntegrationRun[];
  pending_matches: number;
}

interface PendingMatch {
  id: string;
  external_policy_id: string | null;
  external_customer_id: string | null;
  match_method: string;
  confidence: number;
  status: string;
  created_at: string;
  notes: string | null;
}

const syncActions = [
  { key: "sync-policies", label: "Pólizas", icon: FileText },
  { key: "sync-installments", label: "Cuotas", icon: Clock },
  { key: "sync-documents", label: "Documentos", icon: FileText },
  { key: "sync-claims", label: "Siniestros", icon: AlertTriangle },
  { key: "sync-full", label: "Completa", icon: RefreshCw },
];

const compliance = [
  "Credenciales no expuestas en frontend",
  "Datos FedPat solo en portal privado",
  "Sin comparativas públicas de precios",
  "Sincronización server-side (Edge Function)",
  "Auditoría activa de cada acción",
  "Modo sandbox antes de producción",
];

const AdminIntegraciones = () => {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [pending, setPending] = useState<PendingMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const call = async (body: Record<string, unknown>) => {
    const res = await supabase.functions.invoke("fedpat-sync", { body });
    if (res.error) throw new Error(res.error.message || "Error en la función");
    return res.data;
  };

  const checkStatus = async () => {
    setLoading(true);
    try {
      const data = await call({ action: "check-status" });
      setStatus(data);
    } catch (e: any) {
      toast.error(e.message || "Error al consultar estado");
    } finally {
      setLoading(false);
    }
  };

  const loadPending = async () => {
    const { data } = await supabase
      .from("external_identity_matches")
      .select("id, external_policy_id, external_customer_id, match_method, confidence, status, created_at, notes")
      .eq("status", "needs_review")
      .order("created_at", { ascending: false })
      .limit(50);
    setPending((data as PendingMatch[]) || []);
  };

  useEffect(() => {
    checkStatus();
    loadPending();
  }, []);

  const runAction = async (action: string, label: string) => {
    setBusy(action);
    try {
      const data = await call({ action });
      if (data.status === "not_configured") toast.warning(data.message);
      else if (data.status === "error") toast.error(data.message || data.error);
      else toast.success(data.message || `${label} OK`);
      await checkStatus();
      await loadPending();
    } catch (e: any) {
      toast.error(e.message || "Error en acción");
    } finally {
      setBusy(null);
    }
  };

  const rejectMatch = async (id: string) => {
    const { error } = await supabase
      .from("external_identity_matches")
      .update({ status: "rejected" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Match rechazado");
      loadPending();
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
          <p className="text-muted-foreground">Centro de integración con Federación Patronal (server-side)</p>
        </div>
        <button onClick={checkStatus} disabled={loading} className="btn-hero text-sm px-4 py-2 inline-flex items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Consultar Estado
        </button>
      </div>

      {/* Status */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield size={20} className="text-primary" /> Estado
        </h2>

        {status && !status.configured && status.mode !== "mock" && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
            <Info size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Credenciales de Federación Patronal no configuradas</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Configurá los secretos server-side: <code>FEDPAT_BASE_URL</code>, <code>FEDPAT_TOKEN_URL</code>, <code>FEDPAT_CLIENT_ID</code>, <code>FEDPAT_CLIENT_SECRET</code>. O usá <code>FEDPAT_MODE=mock</code> para simular.
              </p>
            </div>
          </div>
        )}

        {status && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={status.configured ? <CheckCircle size={20} className="text-green-600" /> : <XCircle size={20} className="text-amber-500" />} label="Credenciales" value={status.configured ? "Configuradas" : "No configuradas"} />
            <Stat icon={<Zap size={20} className="text-primary" />} label="Modo" value={status.mode} />
            <Stat icon={<Clock size={20} className="text-primary" />} label="Último token" value={status.last_token_refresh ? format(new Date(status.last_token_refresh), "dd/MM/yy HH:mm", { locale: es }) : "Nunca"} />
            <Stat icon={<RefreshCw size={20} className="text-primary" />} label="Pendientes vinculación" value={String(status.pending_matches)} />
          </div>
        )}

        <div className="mt-4">
          <button onClick={() => runAction("test-token", "Token")} disabled={busy === "test-token"} className="btn-hero-outline text-sm px-4 py-2 inline-flex items-center gap-2">
            {busy === "test-token" ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            Probar conexión FedPat
          </button>
        </div>
      </div>

      {/* Sync controls */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <RefreshCw size={20} className="text-primary" /> Sincronización Manual
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {syncActions.map(a => (
            <button
              key={a.key}
              onClick={() => runAction(a.key, a.label)}
              disabled={busy !== null}
              className="flex flex-col items-center gap-3 p-5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-primary/20"
            >
              {busy === a.key ? <Loader2 size={22} className="text-primary animate-spin" /> : <a.icon size={22} className="text-primary" />}
              <span className="font-medium text-foreground text-sm text-center">Sincronizar {a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText size={20} className="text-primary" /> Historial
        </h2>
        {!status?.last_runs?.length ? (
          <p className="text-sm text-muted-foreground py-4">Sin ejecuciones aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm">Tipo</th>
                  <th className="text-left p-3 text-sm">Estado</th>
                  <th className="text-left p-3 text-sm">Inicio</th>
                  <th className="text-left p-3 text-sm">Fin</th>
                  <th className="text-left p-3 text-sm">Error</th>
                </tr>
              </thead>
              <tbody>
                {status.last_runs.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3 text-sm font-medium capitalize">{r.run_type}</td>
                    <td className={`p-3 text-sm font-medium ${statusColor(r.status)}`}>{r.status}</td>
                    <td className="p-3 text-sm text-muted-foreground">{format(new Date(r.started_at), "dd/MM HH:mm", { locale: es })}</td>
                    <td className="p-3 text-sm text-muted-foreground">{r.finished_at ? format(new Date(r.finished_at), "dd/MM HH:mm", { locale: es }) : "—"}</td>
                    <td className="p-3 text-sm text-destructive max-w-xs truncate">{r.error_message || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending matches */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Link2 size={20} className="text-primary" /> Pendientes de vinculación
        </h2>
        {!pending.length ? (
          <p className="text-sm text-muted-foreground py-4">No hay registros externos pendientes de vincular.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm">Póliza ext.</th>
                  <th className="text-left p-3 text-sm">Cliente ext.</th>
                  <th className="text-left p-3 text-sm">Método</th>
                  <th className="text-left p-3 text-sm">Confianza</th>
                  <th className="text-left p-3 text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(m => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="p-3 text-sm font-mono">{m.external_policy_id || "—"}</td>
                    <td className="p-3 text-sm font-mono">{m.external_customer_id || "—"}</td>
                    <td className="p-3 text-sm">{m.match_method}</td>
                    <td className="p-3 text-sm">{Number(m.confidence).toFixed(2)}</td>
                    <td className="p-3 text-sm">
                      <button onClick={() => rejectMatch(m.id)} className="text-xs text-destructive hover:underline">Rechazar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3">
              La vinculación manual a un cliente existente o creación de cliente nuevo se habilitará en una próxima iteración.
            </p>
          </div>
        )}
      </div>

      {/* Compliance */}
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield size={20} className="text-primary" /> Cumplimiento T&amp;C Federación Patronal
        </h2>
        <ul className="space-y-2">
          {compliance.map((c, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
              <span className="text-foreground">{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
    {icon}
    <div>
      <p className="font-medium text-foreground text-sm">{label}</p>
      <p className="text-xs text-muted-foreground capitalize">{value}</p>
    </div>
  </div>
);

export default AdminIntegraciones;
