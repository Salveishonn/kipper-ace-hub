export type ConsultaSide = "productor" | "equipo";

export type ConsultaActivityRow = {
  id: string;
  status: string;
  last_message_at: string;
  last_message_by: string | null;
  producer_last_read_at: string | null;
  team_last_read_at: string | null;
};

export type AdminConsultaQueue = "por_responder" | "esperando" | "resueltas" | "cerradas" | "todas";

export const ADMIN_CONSULTA_QUEUES: Array<{ value: AdminConsultaQueue; label: string }> = [
  { value: "por_responder", label: "Por responder" },
  { value: "esperando", label: "Esperando al productor" },
  { value: "resueltas", label: "Resueltas" },
  { value: "cerradas", label: "Cerradas" },
  { value: "todas", label: "Todas" },
];

/** Same reference the notification emails use. */
export function consultaRef(id: string): string {
  return `#${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function isConsultaActive(status: string): boolean {
  return status === "abierto" || status === "en_gestion";
}

export function isConsultaUnread(ticket: ConsultaActivityRow, side: ConsultaSide): boolean {
  if (!ticket.last_message_by || ticket.last_message_by === side) return false;
  const readAt = side === "productor" ? ticket.producer_last_read_at : ticket.team_last_read_at;
  return !readAt || new Date(ticket.last_message_at).getTime() > new Date(readAt).getTime();
}

export function matchesAdminConsultaQueue(
  ticket: Pick<ConsultaActivityRow, "status" | "last_message_by">,
  queue: AdminConsultaQueue,
): boolean {
  if (queue === "todas") return true;
  if (queue === "resueltas") return ticket.status === "resuelto";
  if (queue === "cerradas") return ticket.status === "cerrado";
  if (!isConsultaActive(ticket.status)) return false;
  return queue === "por_responder"
    ? ticket.last_message_by !== "equipo"
    : ticket.last_message_by === "equipo";
}

export function formatConsultaTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });
  if (minutes < 1) return "recién";
  if (minutes < 60) return rtf.format(-minutes, "minute");
  if (minutes < 24 * 60) return rtf.format(-Math.floor(minutes / 60), "hour");
  if (minutes < 7 * 24 * 60) return rtf.format(-Math.floor(minutes / (24 * 60)), "day");
  return date.toLocaleDateString("es-AR");
}

export function formatConsultaDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000));
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}
