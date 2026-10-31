import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, MessageSquare, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";
import { ConsultaPreview } from "@/components/consultas/ConsultaPreview";
import { NewConsultaDialog } from "@/components/consultas/NewConsultaDialog";
import { isConsultaActive, isConsultaUnread } from "@/lib/consultaActivity";
import { cn } from "@/lib/utils";

const ProductorConsultas = () => {
  const { user } = useAuth();
  const { data, isLoading, error } = useSupportTickets({ producerId: user?.id });
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<"activas" | "finalizadas">("activas");

  if (isLoading) return <LoadingState text="Cargando consultas..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar tus consultas" />;

  const tickets = data ?? [];
  const active = tickets.filter((t) => isConsultaActive(t.status));
  const finished = tickets.filter((t) => !isConsultaActive(t.status));
  const visible = view === "activas" ? active : finished;

  return (
    <div className="space-y-6 max-w-4xl">
      <WorkspaceHeader
        title="Consultas"
        description="Casos comerciales, siniestros y administración con el equipo Kipper"
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus size={18} className="mr-2" aria-hidden /> Nueva consulta
          </Button>
        }
      />

      {user && <NewConsultaDialog open={showForm} onOpenChange={setShowForm} producerId={user.id} />}

      {!tickets.length ? (
        <EmptyState
          icon={<MessageSquare size={48} />}
          title="Todavía no tenés consultas"
          description="Abrí un caso cuando necesites ayuda comercial, de siniestros o administrativa."
        />
      ) : (
        <>
          <div className="flex gap-1 border-b border-border">
            {(
              [
                ["activas", "Activas", active.length],
                ["finalizadas", "Finalizadas", finished.length],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => setView(value)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
                  view === value
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {label} <span className="text-xs text-muted-foreground">({count})</span>
              </button>
            ))}
          </div>

          {!visible.length ? (
            <EmptyState
              title={view === "activas" ? "No tenés consultas activas" : "No tenés consultas finalizadas"}
              description={
                view === "activas"
                  ? "Cuando abras una consulta, la vas a ver acá."
                  : "Las consultas resueltas y cerradas aparecen acá."
              }
            />
          ) : (
            <ul className="space-y-3">
              {visible.map((t) => {
                const unread = isConsultaUnread(t, "productor");
                return (
                  <li key={t.id}>
                    <Link
                      to={`/productor/consultas/${t.id}`}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-soft",
                        unread ? "border-primary/40" : "border-border/60",
                      )}
                    >
                      <ConsultaPreview ticket={t} unread={unread} ownSide="productor" />
                      <ChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default ProductorConsultas;
