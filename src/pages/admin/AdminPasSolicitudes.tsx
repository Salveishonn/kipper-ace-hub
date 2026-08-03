import { useState } from "react";
import { Mail, CheckCircle2, XCircle, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import {
  useProducerApplications,
  useUpdateProducerApplication,
  useApprovePasProducer,
  useInvitePasProducer,
} from "@/hooks/useProducerApplications";
import {
  PRODUCER_APPLICATION_STATUS,
  isLegacyInviteFlow,
  isSelfRegistrationPending,
} from "@/lib/producerApplicationStatus";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const statusLabel: Record<string, string> = {
  [PRODUCER_APPLICATION_STATUS.PENDING]: "Pendiente de aprobación",
  [PRODUCER_APPLICATION_STATUS.NUEVO]: "Pendiente de aprobación",
  [PRODUCER_APPLICATION_STATUS.EN_REVISION]: "En revisión",
  [PRODUCER_APPLICATION_STATUS.RECHAZADO]: "Rechazado",
  [PRODUCER_APPLICATION_STATUS.INVITADO]: "Legacy: invitación enviada",
  [PRODUCER_APPLICATION_STATUS.ACTIVO]: "Activo",
  aprobado: "Pendiente de aprobación",
};

const AdminPasSolicitudes = () => {
  const { data, isLoading, error } = useProducerApplications();
  const updateApp = useUpdateProducerApplication();
  const approve = useApprovePasProducer();
  const invite = useInvitePasProducer();
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);

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

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      if (notesDraft[id]) {
        await updateApp.mutateAsync({ id, admin_notes: notesDraft[id] });
      }
      const result = await approve.mutateAsync({ application_id: id });
      if (result.warning) {
        toast.warning("Acceso aprobado con advertencia", { description: result.warning });
      } else {
        toast.success(result.message || "Acceso aprobado. El productor ya puede ingresar.");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al aprobar");
    } finally {
      setApprovingId(null);
    }
  };

  const handleLegacyInvite = async (id: string, resend = false) => {
    try {
      await invite.mutateAsync({ application_id: id, resend });
      toast.success(resend ? "Invitación legacy reenviada" : "Invitación legacy enviada");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al invitar (legacy)");
    }
  };

  if (isLoading) return <LoadingState text="Cargando solicitudes..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar las solicitudes" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitudes PAS</h1>
        <p className="text-muted-foreground">
          Aprobá el acceso de productores que ya crearon su cuenta. No se envían invitaciones de
          Supabase en el flujo nuevo.
        </p>
      </div>

      {!data?.length ? (
        <EmptyState title="Sin solicitudes" description="Las postulaciones desde Sumate aparecerán acá." />
      ) : (
        <div className="space-y-4">
          {data.map((app) => {
            const selfRegPending = isSelfRegistrationPending(app);
            const legacy = isLegacyInviteFlow(app);
            const isApproving = approvingId === app.id && approve.isPending;

            return (
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
                    <p className="text-xs text-muted-foreground mt-1">
                      {app.user_id
                        ? `Cuenta Auth vinculada · ${app.user_id.slice(0, 8)}…`
                        : "Sin cuenta Auth (flujo legacy)"}
                    </p>
                  </div>
                  <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary h-fit">
                    {statusLabel[app.status] ?? app.status}
                  </span>
                </div>

                {app.status === PRODUCER_APPLICATION_STATUS.ACTIVO && (
                  <p className="text-sm text-primary flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    El productor ya puede acceder al portal con su email y contraseña.
                    {app.approved_at
                      ? ` Aprobado: ${new Date(app.approved_at).toLocaleString("es-AR")}`
                      : ""}
                  </p>
                )}

                {legacy && (
                  <div className="text-sm rounded-lg border border-amber-300 bg-amber-50 text-amber-950 p-3 flex gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Registro legacy (invitación)</p>
                      <p>
                        Esta solicitud no usa el flujo nuevo de auto-registro. Podés reenviar la
                        invitación legacy o pedirle al productor que se registre nuevamente en Sumate.
                      </p>
                    </div>
                  </div>
                )}

                {app.message && (
                  <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">
                    {app.message}
                  </p>
                )}
                <textarea
                  className="input-kipper min-h-[60px] text-sm"
                  placeholder="Notas internas (opcional)"
                  value={notesDraft[app.id] ?? app.admin_notes ?? ""}
                  onChange={(e) => setNotesDraft((s) => ({ ...s, [app.id]: e.target.value }))}
                />
                <div className="flex flex-wrap gap-2">
                  {selfRegPending && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(app.id)}
                        disabled={isApproving || approve.isPending}
                      >
                        {isApproving ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        <span className="ml-2">
                          {isApproving ? "Aprobando…" : "Aprobar acceso"}
                        </span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(app.id)}>
                        <XCircle size={16} className="mr-2" /> Rechazar
                      </Button>
                    </>
                  )}

                  {legacy && app.status !== PRODUCER_APPLICATION_STATUS.INVITADO && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleLegacyInvite(app.id)}
                        disabled={invite.isPending}
                      >
                        {invite.isPending ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <RefreshCw size={16} />
                        )}
                        <span className="ml-2">Invitación legacy</span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(app.id)}>
                        <XCircle size={16} className="mr-2" /> Rechazar
                      </Button>
                    </>
                  )}

                  {app.status === PRODUCER_APPLICATION_STATUS.INVITADO && !app.user_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLegacyInvite(app.id, true)}
                      disabled={invite.isPending}
                    >
                      <RefreshCw size={16} className="mr-2" /> Reenviar invitación legacy
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminPasSolicitudes;
