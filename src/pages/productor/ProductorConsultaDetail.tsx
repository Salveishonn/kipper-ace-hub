import { useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, Lock, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useMarkSupportTicketRead,
  useSupportMessages,
  useSendSupportMessage,
  useSupportTicket,
  useProfilesByUserIds,
} from "@/hooks/useSupportTickets";
import { ConsultaThread } from "@/components/consultas/ConsultaThread";
import { ConsultaComposer } from "@/components/consultas/ConsultaComposer";
import { LoadingState, ErrorState } from "@/components/ui/loading-state";
import { StatusBadge, statusToneFromConsulta } from "@/components/ui/status-badge";
import { consultaRef, isConsultaUnread } from "@/lib/consultaActivity";
import { consultaCategoryLabel, consultaStatusLabel } from "@/lib/consultaCategories";

function statusNotice(status: string, lastMessageBy: string | null) {
  if (status === "cerrado") {
    return { icon: Lock, text: "Esta consulta está cerrada. Si necesitás algo más, abrí una nueva." };
  }
  if (status === "resuelto") {
    return { icon: CheckCircle2, text: "El equipo marcó esta consulta como resuelta. Si seguís necesitando ayuda, respondé y la reabrimos." };
  }
  if (lastMessageBy === "equipo") {
    return { icon: MessageCircle, text: "El equipo respondió. Te toca a vos si necesitás algo más." };
  }
  return { icon: Clock, text: "Recibimos tu mensaje. Te avisamos por email cuando el equipo responda." };
}

const ProductorConsultaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: ticket, isLoading: ticketLoading } = useSupportTicket(id);
  const { data: messages, isLoading, error } = useSupportMessages(id);
  const send = useSendSupportMessage();
  const markRead = useMarkSupportTicketRead();
  const { mutate: markTicketRead } = markRead;

  const unread = ticket ? isConsultaUnread(ticket, "productor") : false;
  useEffect(() => {
    if (id && unread) markTicketRead(id);
  }, [id, unread, markTicketRead]);

  const profileIds = useMemo(() => {
    const ids = new Set<string>();
    if (ticket?.producer_id) ids.add(ticket.producer_id);
    for (const m of messages ?? []) ids.add(m.author_user_id);
    return Array.from(ids);
  }, [ticket, messages]);

  const { data: profiles } = useProfilesByUserIds(profileIds);
  const profilesById = useMemo(
    () => Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p])),
    [profiles],
  );

  if (isLoading || ticketLoading) return <LoadingState text="Cargando mensajes..." />;
  if (error) return <ErrorState title="Error" message="No se pudo cargar la conversación" />;
  if (!ticket) return <ErrorState title="Consulta no encontrada" message="Puede que ya no exista o no tengas acceso." />;

  const canReply = ticket.status !== "cerrado";
  const notice = statusNotice(ticket.status, ticket.last_message_by);

  return (
    <div className="space-y-5 max-w-3xl">
      <Link to="/productor/consultas" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
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

      <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/50 px-4 py-3 text-sm">
        <notice.icon size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
        <p>{notice.text}</p>
      </div>

      <ConsultaThread
        messages={messages ?? []}
        currentUserId={user?.id}
        producerId={ticket.producer_id}
        profilesById={profilesById}
      />

      {canReply && id && user && (
        <ConsultaComposer
          placeholder={ticket.status === "resuelto" ? "Escribí para reabrir la consulta..." : "Escribí tu mensaje..."}
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
      )}
    </div>
  );
};

export default ProductorConsultaDetail;
