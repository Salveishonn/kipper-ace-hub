import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useSupportMessages,
  useSendSupportMessage,
  useSupportTickets,
  useProfilesByUserIds,
} from "@/hooks/useSupportTickets";
import { ConsultaThread } from "@/components/consultas/ConsultaThread";
import { ConsultaComposer } from "@/components/consultas/ConsultaComposer";
import { displayName } from "@/components/shared/UserAvatar";
import { LoadingState, ErrorState } from "@/components/ui/loading-state";
import { consultaCategoryLabel, consultaStatusLabel } from "@/lib/consultaCategories";

const ProductorConsultaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: tickets } = useSupportTickets({ producerId: user?.id });
  const ticket = tickets?.find((t) => t.id === id);
  const { data: messages, isLoading, error } = useSupportMessages(id);
  const send = useSendSupportMessage();

  const canReply = ticket && ["abierto", "en_gestion"].includes(ticket.status);

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

  if (isLoading) return <LoadingState text="Cargando mensajes..." />;
  if (error) return <ErrorState title="Error" message="No se pudo cargar la conversación" />;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/productor/consultas" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Volver
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{ticket?.subject ?? "Consulta"}</h1>
        <p className="text-sm text-muted-foreground">
          {ticket ? consultaCategoryLabel(ticket.category) : ""} · {ticket ? consultaStatusLabel(ticket.status) : ""}
        </p>
        {ticket?.status === "resuelto" && ticket.resolved_by && (
          <p className="text-xs text-muted-foreground mt-1">
            Resuelto por {displayName(profilesById[ticket.resolved_by], "Equipo Kipper")}
            {ticket.resolved_at ? ` · ${new Date(ticket.resolved_at).toLocaleString("es-AR")}` : ""}
          </p>
        )}
        {ticket?.status === "cerrado" && ticket.closed_by && (
          <p className="text-xs text-muted-foreground mt-1">
            Cerrado por {displayName(profilesById[ticket.closed_by], "Equipo Kipper")}
            {ticket.closed_at ? ` · ${new Date(ticket.closed_at).toLocaleString("es-AR")}` : ""}
          </p>
        )}
      </div>

      <ConsultaThread
        messages={messages ?? []}
        currentUserId={user?.id}
        profilesById={profilesById}
      />

      {canReply && id && user ? (
        <ConsultaComposer
          placeholder="Escribí tu mensaje..."
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
      ) : (
        <p className="text-sm text-muted-foreground">Este caso está cerrado o resuelto.</p>
      )}
    </div>
  );
};

export default ProductorConsultaDetail;
