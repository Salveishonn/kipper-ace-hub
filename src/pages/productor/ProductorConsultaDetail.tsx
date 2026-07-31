import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useSupportMessages,
  useSendSupportMessage,
  useSupportTickets,
} from "@/hooks/useSupportTickets";
import { LoadingState, ErrorState } from "@/components/ui/loading-state";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const ProductorConsultaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: tickets } = useSupportTickets({ producerId: user?.id });
  const ticket = tickets?.find((t) => t.id === id);
  const { data: messages, isLoading, error } = useSupportMessages(id);
  const send = useSendSupportMessage();
  const [body, setBody] = useState("");

  const canReply = ticket && ["abierto", "en_gestion"].includes(ticket.status);

  const handleSend = async () => {
    if (!body.trim() || !user || !id) return;
    try {
      await send.mutateAsync({ ticket_id: id, author_user_id: user.id, body: body.trim() });
      setBody("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al enviar");
    }
  };

  if (isLoading) return <LoadingState text="Cargando mensajes..." />;
  if (error) return <ErrorState title="Error" message="No se pudo cargar la conversación" />;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/productor/consultas" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Volver
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{ticket?.subject ?? "Consulta"}</h1>
        <p className="text-sm text-muted-foreground capitalize">{ticket?.category} · {ticket?.status}</p>
      </div>
      <div className="bg-card rounded-2xl p-4 space-y-3 min-h-[200px]">
        {messages?.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-xl text-sm max-w-[85%] ${
              m.author_user_id === user?.id ? "bg-primary/10 ml-auto" : "bg-muted"
            }`}
          >
            <p>{m.body}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(m.created_at).toLocaleString("es-AR")}
            </p>
          </div>
        ))}
      </div>
      {canReply ? (
        <div className="flex gap-2">
          <textarea
            className="input-kipper flex-1 min-h-[80px]"
            placeholder="Escribí tu mensaje..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button onClick={handleSend} disabled={send.isPending}>Enviar</Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Este caso está cerrado o resuelto.</p>
      )}
    </div>
  );
};

export default ProductorConsultaDetail;
