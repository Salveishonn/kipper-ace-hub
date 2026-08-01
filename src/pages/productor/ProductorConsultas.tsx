import { Link, useNavigate } from "react-router-dom";
import { Plus, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSupportTickets, useCreateSupportTicket } from "@/hooks/useSupportTickets";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CONSULTA_CATEGORIES, consultaCategoryLabel, consultaStatusLabel } from "@/lib/consultaCategories";

const ProductorConsultas = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error } = useSupportTickets({ producerId: user?.id });
  const create = useCreateSupportTicket();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "comercial", subject: "", message: "" });

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
      setForm({ category: "comercial", subject: "", message: "" });
      navigate(`/productor/consultas/${ticket.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  if (isLoading) return <LoadingState text="Cargando consultas..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar tus consultas" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Consultas</h1>
          <p className="text-muted-foreground">Casos comerciales, siniestros y administración con el equipo Kipper</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={18} className="mr-2" aria-hidden /> Nueva consulta
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl p-6 shadow-soft border border-border/60 space-y-4">
          <div>
            <label htmlFor="consulta-category" className="block text-sm font-medium mb-1">
              Categoría
            </label>
            <select
              id="consulta-category"
              className="input-kipper"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CONSULTA_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <input
            className="input-kipper"
            placeholder="Asunto"
            aria-label="Asunto"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <textarea
            className="input-kipper min-h-[100px]"
            placeholder="Describí el caso..."
            aria-label="Mensaje"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={create.isPending}>
              {create.isPending ? "Enviando..." : "Enviar"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {!data?.length ? (
        <EmptyState
          icon={<MessageSquare size={48} />}
          title="Sin consultas"
          description="Abrí un caso cuando necesites ayuda comercial, de siniestros o administrativa."
        />
      ) : (
        <ul className="space-y-3">
          {data.map((t) => (
            <li key={t.id}>
              <Link
                to={`/productor/consultas/${t.id}`}
                className="block bg-card rounded-xl p-4 border border-border/60 hover:shadow-soft transition-shadow"
              >
                <p className="font-medium">{t.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {consultaCategoryLabel(t.category)} · {consultaStatusLabel(t.status)} ·{" "}
                  {new Date(t.updated_at).toLocaleDateString("es-AR")}
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
