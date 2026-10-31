import { consultaRef, formatConsultaTime } from "@/lib/consultaActivity";
import { consultaCategoryLabel, consultaStatusLabel } from "@/lib/consultaCategories";
import { StatusBadge, statusToneFromConsulta } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type ConsultaSummary = {
  id: string;
  subject: string;
  status: string;
  category: string;
  last_message_at: string;
  last_message_preview: string | null;
  last_message_by: string | null;
};

/** Row content shared by the productor list and the admin queue. */
export function ConsultaPreview({
  ticket,
  unread,
  ownSide,
  person,
}: {
  ticket: ConsultaSummary;
  unread: boolean;
  ownSide: "productor" | "equipo";
  person?: string;
}) {
  const sender =
    ticket.last_message_by === ownSide
      ? "Vos"
      : ticket.last_message_by === "equipo"
        ? "Equipo Kipper"
        : person ?? "Productor";

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <p className={cn("min-w-0 line-clamp-2 break-words", unread ? "font-semibold" : "font-medium")}>
          {unread && (
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" aria-label="Sin leer" />
          )}
          {ticket.subject}
        </p>
        <span className={cn("shrink-0 text-xs", unread ? "font-semibold text-primary" : "text-muted-foreground")}>
          {formatConsultaTime(ticket.last_message_at)}
        </span>
      </div>
      {ticket.last_message_preview && (
        <p className={cn("mt-1 truncate text-sm", unread ? "text-foreground" : "text-muted-foreground")}>
          <span className="font-medium">{sender}:</span> {ticket.last_message_preview}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <StatusBadge tone={statusToneFromConsulta(ticket.status)}>
          {consultaStatusLabel(ticket.status)}
        </StatusBadge>
        <span>{consultaCategoryLabel(ticket.category)}</span>
        <span aria-hidden>·</span>
        <span>{consultaRef(ticket.id)}</span>
      </div>
    </div>
  );
}
