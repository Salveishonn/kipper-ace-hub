import { Link } from "react-router-dom";
import { useSupportTickets, useUpdateSupportTicketStatus } from "@/hooks/useSupportTickets";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { toast } from "sonner";

const AdminConsultas = () => {
  const { data, isLoading, error } = useSupportTickets({ admin: true });
  const updateStatus = useUpdateSupportTicketStatus();

  if (isLoading) return <LoadingState text="Cargando consultas..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar las consultas" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Consultas PAS</h1>
        <p className="text-muted-foreground">Casos y siniestros reportados por productores</p>
      </div>

      {!data?.length ? (
        <EmptyState title="Sin consultas" description="Cuando un productor abra un caso, aparecerá acá." />
      ) : (
        <div className="space-y-3">
          {data.map((t) => (
            <div key={t.id} className="bg-card rounded-xl p-4 flex flex-wrap justify-between gap-4 items-center">
              <div>
                <Link to={`/admin/consultas/${t.id}`} className="font-medium hover:text-primary">
                  {t.subject}
                </Link>
                <p className="text-xs text-muted-foreground capitalize">
                  {t.category} · {t.status.replace("_", " ")}
                </p>
              </div>
              <select
                className="input-kipper w-auto text-sm"
                value={t.status}
                onChange={(e) =>
                  updateStatus.mutate(
                    { id: t.id, status: e.target.value },
                    { onSuccess: () => toast.success("Estado actualizado") },
                  )
                }
              >
                <option value="abierto">Abierto</option>
                <option value="en_gestion">En gestión</option>
                <option value="resuelto">Resuelto</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminConsultas;
