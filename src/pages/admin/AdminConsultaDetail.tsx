import { useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Lock, Mail, MapPin, Phone, RotateCcw, Timer, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useConsultaProducerDetails,
  useMarkSupportTicketRead,
  useSupportMessages,
  useSendSupportMessage,
  useSupportTicket,
  useSupportTickets,
  useUpdateSupportTicketStatus,
  useProfilesByUserIds,
} from "@/hooks/useSupportTickets";
import { ConsultaThread } from "@/components/consultas/ConsultaThread";
import { ConsultaComposer } from "@/components/consultas/ConsultaComposer";
import { UserAvatar, displayName } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LoadingState, ErrorState } from "@/components/ui/loading-state";
import { StatusBadge, statusToneFromConsulta } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { consultaRef, formatConsultaTime, isConsultaUnread } from "@/lib/consultaActivity";
import { consultaCategoryLabel, consultaStatusLabel } from "@/lib/consultaCategories";

const AdminConsultaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: ticket, isLoading: ticketLoading } = useSupportTicket(id);
  const { data: allTickets } = useSupportTickets({ admin: true });
  const { data: messages, isLoading, error } = useSupportMessages(id);
  const { data: producer } = useConsultaProducerDetails(ticket?.producer_id);
  const send = useSendSupportMessage();
  const updateStatus = useUpdateSupportTicketStatus();
  const { mutate: markTicketRead } = useMarkSupportTicketRead();

  const unread = ticket ? isConsultaUnread(ticket, "equipo") : false;
  useEffect(() => {
    if (id && unread) markTicketRead(id);
  }, [id, unread, markTicketRead]);

  const profileIds = useMemo(() => {
    const ids = new Set<string>();
    if (ticket?.producer_id) ids.add(ticket.producer_id);
    if (ticket?.resolved_by) ids.add(ticket.resolved_by);
    if (ticket?.closed_by) ids.add(ticket.closed_by);
    for (const m of messages ?? []) ids.add(m.author_user_id);
    return Array.from(ids);
  }, [ticket, messages]);

  const { data: profiles } = useProfilesByUserIds(profileIds);
  const profilesById = useMemo(
    () => Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p])),
    [profiles],
  );

  const handleStatus = (status: string, message: string) => {
    if (!id || !user) return;
    updateStatus.mutate(
      { id, status, actorUserId: user.id },
      {
        onSuccess: () => toast.success(message),
        onError: () => toast.error("No se pudo actualizar el estado"),
      },
    );
  };

  if (isLoading || ticketLoading) return <LoadingState text="Cargando mensajes..." />;
  if (error) return <ErrorState title="Error" message="No se pudo cargar la conversación" />;
  if (!ticket) return <ErrorState title="Consulta no encontrada" message="Puede que ya no exista." />;

  const otherTickets = (allTickets ?? []).filter(
    (t) => t.producer_id === ticket.producer_id && t.id !== ticket.id,
  );
  const location = [producer?.city, producer?.province].filter(Boolean).join(", ");
  const finished = ticket.status === "resuelto" || ticket.status === "cerrado";

  return (
    <div className="space-y-5">
      <Link to="/admin/consultas" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} aria-hidden /> Volver a consultas
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight break-words">{ticket.subject}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <StatusBadge tone={statusToneFromConsulta(ticket.status)}>
            {consultaStatusLabel(ticket.status)}
          </StatusBadge>
          <span>{consultaCategoryLabel(ticket.category)}</span>
          <span aria-hidden>·</span>
          <span>{consultaRef(ticket.id)}</span>
          <span aria-hidden>·</span>
          <span>Abierta el {new Date(ticket.created_at).toLocaleDateString("es-AR")}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <ConsultaThread
            messages={messages ?? []}
            currentUserId={user?.id}
            producerId={ticket.producer_id}
            profilesById={profilesById}
          />

          {ticket.status === "cerrado" ? (
            <p className="rounded-xl border border-border/60 bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              Esta consulta está cerrada. Reabrila para responder.
            </p>
          ) : (
            id &&
            user && (
              <ConsultaComposer
                placeholder="Responder al productor..."
                sending={send.isPending}
                ticketId={id}
                userId={user.id}
                onSend={async (payload) => {
                  await send.mutateAsync({
                    ticket_id: id,
                    author_user_id: user.id,
                    ...payload,
                  });
                }}
              />
            )
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-border/60 bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Gestión</h2>
            <div className="space-y-2">
              {ticket.status === "abierto" && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={updateStatus.isPending}
                  onClick={() => handleStatus("en_gestion", "Consulta en gestión")}
                >
                  <Timer size={16} className="mr-2" aria-hidden /> Marcar en gestión
                </Button>
              )}
              {!finished && (
                <Button
                  className="w-full justify-start"
                  disabled={updateStatus.isPending}
                  onClick={() => handleStatus("resuelto", "Consulta resuelta. Avisamos al productor.")}
                >
                  <CheckCircle2 size={16} className="mr-2" aria-hidden /> Marcar resuelta
                </Button>
              )}
              {finished && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={updateStatus.isPending}
                  onClick={() => handleStatus("en_gestion", "Consulta reabierta")}
                >
                  <RotateCcw size={16} className="mr-2" aria-hidden /> Reabrir
                </Button>
              )}
              {ticket.status !== "cerrado" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start" disabled={updateStatus.isPending}>
                      <Lock size={16} className="mr-2" aria-hidden /> Cerrar consulta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Cerrar esta consulta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        El productor recibe un email y ya no puede responder. Podés reabrirla más adelante.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleStatus("cerrado", "Consulta cerrada. Avisamos al productor.")}>
                        Cerrar consulta
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            {ticket.status === "resuelto" && ticket.resolved_by && (
              <p className="mt-3 text-xs text-muted-foreground">
                Resuelta por {displayName(profilesById[ticket.resolved_by], "Equipo Kipper")}
                {ticket.resolved_at ? ` · ${new Date(ticket.resolved_at).toLocaleString("es-AR")}` : ""}
              </p>
            )}
            {ticket.status === "cerrado" && ticket.closed_by && (
              <p className="mt-3 text-xs text-muted-foreground">
                Cerrada por {displayName(profilesById[ticket.closed_by], "Equipo Kipper")}
                {ticket.closed_at ? ` · ${new Date(ticket.closed_at).toLocaleString("es-AR")}` : ""}
              </p>
            )}
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Productor</h2>
            {producer ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <UserAvatar profile={producer} className="h-10 w-10" />
                  <p className="min-w-0 break-words font-medium">{displayName(producer, "Productor")}</p>
                </div>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Mail size={14} className="mt-0.5 shrink-0" aria-hidden />
                    <a href={`mailto:${producer.email}`} className="min-w-0 break-all hover:text-primary">
                      {producer.email}
                    </a>
                  </li>
                  {producer.phone && (
                    <li className="flex items-start gap-2">
                      <Phone size={14} className="mt-0.5 shrink-0" aria-hidden />
                      <a href={`tel:${producer.phone}`} className="hover:text-primary">{producer.phone}</a>
                    </li>
                  )}
                  {producer.matricula_ssn && (
                    <li className="flex items-start gap-2">
                      <UserRound size={14} className="mt-0.5 shrink-0" aria-hidden />
                      <span>Matrícula {producer.matricula_ssn}</span>
                    </li>
                  )}
                  {location && (
                    <li className="flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden />
                      <span>{location}</span>
                    </li>
                  )}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin datos del productor.</p>
            )}
          </section>

          {otherTickets.length > 0 && (
            <section className="rounded-xl border border-border/60 bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Otras consultas de este productor</h2>
              <ul className="space-y-2.5">
                {otherTickets.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <Link to={`/admin/consultas/${t.id}`} className="block text-sm hover:text-primary">
                      <span className="block truncate">{t.subject}</span>
                      <span className="text-xs text-muted-foreground">
                        {consultaStatusLabel(t.status)} · {formatConsultaTime(t.last_message_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

export default AdminConsultaDetail;
