import { Link } from "react-router-dom";
import { Plus, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { useState } from "react";
import { useCreateSupportTicket } from "@/hooks/useSupportTickets";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const ProductorConsultas = () => {
  const { user } = useAuth();
  const { data, isLoading, error } = useSupportTickets({ producerId: user?.id });
  const create = useCreateSupportTicket();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "siniestro", subject: "", message: "" });

  const handleCreate = async () => {
    if (!user || !form.subject.trim() || !form.message.trim()) {
      toast.error("Completá asunto y mensaje");
      return;
    }
    try {
      const ticket = await create.mutateAsync({
        producer_id: user.id,
        category: form.category,
        subject: form.subject,
        initial_message: form.message,
      });
      toast.success("Consulta enviada");
      setShowForm(false);
      setForm({ category: "siniestro", subject: "", message: "" });
      window.location.href = `/productor/consultas/${ticket.id}`;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  if (isLoading) return <LoadingState text="Cargando consultas..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar tus consultas" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Consultas y casos</h1>
          <p className="text-muted-foreground">Siniestros y consultas operativas con el equipo Kipper</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={18} className="mr-2" /> Nueva consulta
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl p-6 shadow-soft space-y-4">
          <select
            className="input-kipper"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="siniestro">Siniestro</option>
            <option value="operativo">Operativo</option>
            <option value="otro">Otro</option>
          </select>
          <input
            className="input-kipper"
            placeholder="Asunto"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <textarea
            className="input-kipper min-h-[100px]"
            placeholder="Describí el caso..."
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={create.isPending}>Enviar</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {!data?.length ? (
        <EmptyState
          icon={<MessageSquare size={48} />}
          title="Sin consultas"
          description="Abrí un caso cuando necesites ayuda con un siniestro u operación."
        />
      ) : (
        <ul className="space-y-3">
          {data.map((t) => (
            <li key={t.id}>
              <Link
                to={`/productor/consultas/${t.id}`}
                className="block bg-card rounded-xl p-4 hover:shadow-soft transition-shadow"
              >
                <p className="font-medium">{t.subject}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {t.category} · {t.status.replace("_", " ")} · {new Date(t.updated_at).toLocaleDateString("es-AR")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProductorConsultas;
