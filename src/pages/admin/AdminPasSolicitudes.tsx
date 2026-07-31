import { useState } from "react";
import { Mail, Send, XCircle, Loader2, RefreshCw } from "lucide-react";
import {
  useProducerApplications,
  useUpdateProducerApplication,
  useInvitePasProducer,
} from "@/hooks/useProducerApplications";
import {
  PENDING_APPLICATION_STATUSES,
  PRODUCER_APPLICATION_STATUS,
} from "@/lib/producerApplicationStatus";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const statusLabel: Record<string, string> = {
  [PRODUCER_APPLICATION_STATUS.NUEVO]: "Nuevo",
  [PRODUCER_APPLICATION_STATUS.EN_REVISION]: "En revisión",
  [PRODUCER_APPLICATION_STATUS.RECHAZADO]: "Rechazado",
  [PRODUCER_APPLICATION_STATUS.INVITADO]: "Invitación enviada",
  [PRODUCER_APPLICATION_STATUS.ACTIVO]: "Activo",
  aprobado: "Aprobado (legacy)",
};

const AdminPasSolicitudes = () => {
  const { data, isLoading, error } = useProducerApplications();
  const updateApp = useUpdateProducerApplication();
  const invite = useInvitePasProducer();
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const handleReject = async (id: string) => {
    try {
      await updateApp.mutateAsync({
        id,
        status: PRODUCER_APPLICATION_STATUS.RECHAZADO,
        admin_notes: notesDraft[id] || undefined,
      });
      toast.success("Solicitud rechazada");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const handleInvite = async (id: string, resend = false) => {
    try {
      await invite.mutateAsync({ application_id: id, resend });
      toast.success(resend ? "Invitación reenviada" : "Invitación enviada por email");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al invitar");
    }
  };

  if (isLoading) return <LoadingState text="Cargando solicitudes..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar las solicitudes" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitudes PAS</h1>
        <p className="text-muted-foreground">
          Aprobá candidatos y enviá invitación por email (enlace de un solo uso, expira según Auth).
        </p>
      </div>

      {!data?.length ? (
        <EmptyState title="Sin solicitudes" description="Las postulaciones desde Sumate aparecerán acá." />
      ) : (
        <div className="space-y-4">
          {data.map((app) => (
            <div key={app.id} className="bg-card rounded-2xl shadow-soft p-6 space-y-4">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{app.full_name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail size={14} /> {app.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {app.province}{app.city ? ` · ${app.city}` : ""}
                    {app.matricula_ssn ? ` · Mat. ${app.matricula_ssn}` : ""}
                  </p>
                </div>
                <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary h-fit">
                  {statusLabel[app.status] ?? app.status}
                </span>
              </div>
              {app.message && (
                <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">{app.message}</p>
              )}
              <textarea
                className="input-kipper min-h-[60px] text-sm"
                placeholder="Notas internas (opcional)"
                value={notesDraft[app.id] ?? app.admin_notes ?? ""}
                onChange={(e) => setNotesDraft((s) => ({ ...s, [app.id]: e.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                {(PENDING_APPLICATION_STATUSES.includes(app.status as typeof PRODUCER_APPLICATION_STATUS.NUEVO) ||
                  app.status === "aprobado") && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleInvite(app.id)}
                      disabled={invite.isPending}
                    >
                      {invite.isPending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                      <span className="ml-2">Aprobar y enviar invitación</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(app.id)}>
                      <XCircle size={16} className="mr-2" /> Rechazar
                    </Button>
                  </>
                )}
                {app.status === PRODUCER_APPLICATION_STATUS.INVITADO && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleInvite(app.id, true)}
                    disabled={invite.isPending}
                  >
                    <RefreshCw size={16} className="mr-2" /> Reenviar invitación
                  </Button>
                )}
                {app.invite_expires_at && app.status === PRODUCER_APPLICATION_STATUS.INVITADO && (
                  <p className="text-xs text-muted-foreground self-center">
                    Expira: {new Date(app.invite_expires_at).toLocaleString("es-AR")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPasSolicitudes;
