import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupportTickets, useUpdateSupportTicketStatus } from "@/hooks/useSupportTickets";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import {
  CONSULTA_CATEGORIES,
  CONSULTA_STATUSES,
  consultaCategoryLabel,
  consultaStatusLabel,
} from "@/lib/consultaCategories";

const AdminConsultas = () => {
  const { data, isLoading, error } = useSupportTickets({ admin: true });
  const updateStatus = useUpdateSupportTicketStatus();
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [producerFilter, setProducerFilter] = useState("todos");

  const producerIds = useMemo(
    () => Array.from(new Set((data ?? []).map((t) => t.producer_id))),
    [data],
  );

  const { data: producerProfiles } = useQuery({
    queryKey: ["consulta_producer_profiles", producerIds],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", producerIds);
      if (pErr) throw pErr;
      return profiles;
    },
    enabled: producerIds.length > 0,
  });

  const producerName = (id: string) => {
    const p = producerProfiles?.find((x) => x.user_id === id);
    return p?.full_name || p?.email || "Productor";
  };

  const filtered = (data ?? []).filter((t) => {
    if (statusFilter !== "todos" && t.status !== statusFilter) return false;
    if (categoryFilter !== "todos" && t.category !== categoryFilter) return false;
    if (producerFilter !== "todos" && t.producer_id !== producerFilter) return false;
    return true;
  });

  if (isLoading) return <LoadingState text="Cargando consultas..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar las consultas" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Consultas</h1>
        <p className="text-muted-foreground">Casos reportados por productores</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="input-kipper w-auto text-sm py-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filtrar por estado"
        >
          <option value="todos">Todos los estados</option>
          {CONSULTA_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className="input-kipper w-auto text-sm py-2"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filtrar por categoría"
        >
          <option value="todos">Todas las categorías</option>
          {CONSULTA_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          className="input-kipper w-auto text-sm py-2"
          value={producerFilter}
          onChange={(e) => setProducerFilter(e.target.value)}
          aria-label="Filtrar por productor"
        >
          <option value="todos">Todos los productores</option>
          {producerIds.map((id) => (
            <option key={id} value={id}>
              {producerName(id)}
            </option>
          ))}
        </select>
      </div>

      {!filtered.length ? (
        <EmptyState
          title="Sin consultas"
          description={
            data?.length
              ? "No hay consultas con esos filtros."
              : "Cuando un productor abra un caso, aparecerá acá."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-card rounded-xl p-4 border border-border/60 flex flex-wrap justify-between gap-4 items-center"
            >
              <div className="min-w-0">
                <Link to={`/admin/consultas/${t.id}`} className="font-medium hover:text-primary">
                  {t.subject}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {producerName(t.producer_id)} · {consultaCategoryLabel(t.category)} ·{" "}
                  {consultaStatusLabel(t.status)} ·{" "}
                  {new Date(t.updated_at).toLocaleDateString("es-AR")}
                </p>
              </div>
              <select
                className="input-kipper w-auto text-sm py-2"
                value={t.status}
                onChange={(e) =>
                  updateStatus.mutate(
                    { id: t.id, status: e.target.value },
                    { onSuccess: () => toast.success("Estado actualizado") },
                  )
                }
                aria-label={`Estado de ${t.subject}`}
              >
                {CONSULTA_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminConsultas;
