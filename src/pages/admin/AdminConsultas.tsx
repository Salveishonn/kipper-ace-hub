import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useProfilesByUserIds, useSupportTickets } from "@/hooks/useSupportTickets";
import { UserAvatar, displayName } from "@/components/shared/UserAvatar";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";
import { ConsultaPreview } from "@/components/consultas/ConsultaPreview";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import {
  ADMIN_CONSULTA_QUEUES,
  consultaRef,
  isConsultaUnread,
  matchesAdminConsultaQueue,
  type AdminConsultaQueue,
} from "@/lib/consultaActivity";
import { CONSULTA_CATEGORIES } from "@/lib/consultaCategories";
import { cn } from "@/lib/utils";

const AdminConsultas = () => {
  const { data, isLoading, error } = useSupportTickets({ admin: true });
  const [queue, setQueue] = useState<AdminConsultaQueue>("por_responder");
  const [queueChosen, setQueueChosen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [search, setSearch] = useState("");

  const producerIds = useMemo(
    () => Array.from(new Set((data ?? []).map((t) => t.producer_id))),
    [data],
  );
  const { data: profiles } = useProfilesByUserIds(producerIds);
  const profilesById = useMemo(
    () => Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p])),
    [profiles],
  );

  const tickets = data ?? [];
  const pendingCount = tickets.filter((t) => matchesAdminConsultaQueue(t, "por_responder")).length;

  // With nothing to answer, an empty first tab would hide existing conversations.
  useEffect(() => {
    if (!queueChosen && data && pendingCount === 0) setQueue("todas");
  }, [queueChosen, data, pendingCount]);

  const term = search.trim().toLowerCase();
  const matchesFilters = (t: (typeof tickets)[number]) => {
    if (categoryFilter !== "todos" && t.category !== categoryFilter) return false;
    if (!term) return true;
    const profile = profilesById[t.producer_id];
    return [t.subject, consultaRef(t.id), t.last_message_preview, profile?.full_name, profile?.email]
      .some((value) => value?.toLowerCase().includes(term));
  };

  const filtered = tickets.filter(matchesFilters);
  const visible = filtered.filter((t) => matchesAdminConsultaQueue(t, queue));

  if (isLoading) return <LoadingState text="Cargando consultas..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar las consultas" />;

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        title="Consultas"
        description={
          pendingCount
            ? `${pendingCount} ${pendingCount === 1 ? "consulta espera" : "consultas esperan"} tu respuesta`
            : "Estás al día con los productores"
        }
      />

      <div className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border">
        {ADMIN_CONSULTA_QUEUES.map((q) => {
          const count = filtered.filter((t) => matchesAdminConsultaQueue(t, q.value)).length;
          return (
            <button
              key={q.value}
              type="button"
              aria-pressed={queue === q.value}
              onClick={() => {
                setQueue(q.value);
                setQueueChosen(true);
              }}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-sm transition-colors",
                queue === q.value
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {q.label} <span className="text-xs text-muted-foreground">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            className="input-kipper py-2 pl-9 text-sm"
            placeholder="Buscar asunto, productor o número"
            aria-label="Buscar consultas"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-kipper py-2 text-sm sm:w-56"
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
      </div>

      {!visible.length ? (
        <EmptyState
          title="Sin consultas"
          description={
            !tickets.length
              ? "Cuando un productor abra un caso, aparecerá acá."
              : term || categoryFilter !== "todos"
                ? "No hay consultas con esos filtros."
                : "No hay consultas en esta bandeja."
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((t) => {
            const unread = isConsultaUnread(t, "equipo");
            const profile = profilesById[t.producer_id];
            const person = displayName(profile, "Productor");
            return (
              <li key={t.id}>
                <Link
                  to={`/admin/consultas/${t.id}`}
                  className={cn(
                    "flex gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-soft",
                    unread ? "border-primary/40" : "border-border/60",
                  )}
                >
                  <UserAvatar profile={profile} className="h-10 w-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 truncate text-xs font-medium text-muted-foreground">{person}</p>
                    <ConsultaPreview ticket={t} unread={unread} ownSide="equipo" person={person} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AdminConsultas;
