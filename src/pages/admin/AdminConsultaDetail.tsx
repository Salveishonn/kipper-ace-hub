import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useSupportMessages,
  useSendSupportMessage,
  useSupportTickets,
  useUpdateSupportTicketStatus,
  useProfilesByUserIds,
} from "@/hooks/useSupportTickets";
import { ConsultaThread } from "@/components/consultas/ConsultaThread";
import { displayName } from "@/components/shared/UserAvatar";
import { LoadingState, ErrorState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  CONSULTA_STATUSES,
  consultaCategoryLabel,
  consultaStatusLabel,
} from "@/lib/consultaCategories";

const AdminConsultaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: tickets } = useSupportTickets({ admin: true });
  const ticket = tickets?.find((t) => t.id === id);
  const { data: messages, isLoading, error } = useSupportMessages(id);
  const send = useSendSupportMessage();
  const updateStatus = useUpdateSupportTicketStatus();
  const [body, setBody] = useState("");

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

  const handleSend = async () => {
    if (!body.trim() || !user || !id) return;
    try {
      await send.mutateAsync({ ticket_id: id, author_user_id: user.id, body: body.trim() });
      setBody("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al enviar");
    }
  };

  const handleStatus = (status: string) => {
    if (!id || !user) return;
    updateStatus.mutate(
      { id, status, actorUserId: user.id },
      { onSuccess: () => toast.success("Estado actualizado") },
    );
  };

  if (isLoading) return <LoadingState text="Cargando mensajes..." />;
  if (error) return <ErrorState title="Error" message="No se pudo cargar la conversación" />;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/admin/consultas" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Volver
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{ticket?.subject ?? "Consulta"}</h1>
          <p className="text-sm text-muted-foreground">
            {ticket ? consultaCategoryLabel(ticket.category) : ""} · {ticket ? consultaStatusLabel(ticket.status) : ""}
            {ticket?.producer_id && (
              <> · {displayName(profilesById[ticket.producer_id], "Productor")}</>
            )}
          </p>
          {ticket?.status === "resuelto" && ticket.resolved_by && (
            <p className="text-xs text-muted-foreground mt-1">
              Resuelto por {displayName(profilesById[ticket.resolved_by])}
              {ticket.resolved_at ? ` · ${new Date(ticket.resolved_at).toLocaleString("es-AR")}` : ""}
            </p>
          )}
          {ticket?.status === "cerrado" && ticket.closed_by && (
            <p className="text-xs text-muted-foreground mt-1">
              Cerrado por {displayName(profilesById[ticket.closed_by])}
              {ticket.closed_at ? ` · ${new Date(ticket.closed_at).toLocaleString("es-AR")}` : ""}
            </p>
          )}
        </div>
        {ticket && (
          <select
            className="input-kipper w-auto text-sm py-2"
            value={ticket.status}
            onChange={(e) => handleStatus(e.target.value)}
            aria-label="Estado de la consulta"
          >
            {CONSULTA_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <ConsultaThread
        messages={messages ?? []}
        currentUserId={user?.id}
        profilesById={profilesById}
      />

      <div className="flex gap-2">
        <textarea
          className="input-kipper flex-1 min-h-[80px]"
          placeholder="Responder al productor..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button onClick={handleSend} disabled={send.isPending}>Enviar</Button>
      </div>
    </div>
  );
};

export default AdminConsultaDetail;
