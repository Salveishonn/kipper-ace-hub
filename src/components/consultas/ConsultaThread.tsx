import { Fragment, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Paperclip } from "lucide-react";
import type { ProfileSnippet } from "@/hooks/useSupportTickets";
import { UserAvatar, displayName } from "@/components/shared/UserAvatar";
import { formatConsultaDay } from "@/lib/consultaActivity";
import { getConsultaAttachmentSignedUrl } from "@/lib/fileUploads";
import { cn } from "@/lib/utils";

export type ConsultaMessage = {
  id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
};

function MessageAttachment({
  path,
  name,
  mime,
}: {
  path: string;
  name: string | null | undefined;
  mime: string | null | undefined;
}) {
  const { data: url } = useQuery({
    queryKey: ["consulta_attachment", path],
    queryFn: () => getConsultaAttachmentSignedUrl(path),
    staleTime: 30 * 60 * 1000,
  });

  const label = name || "Archivo adjunto";
  const isImage = (mime ?? "").startsWith("image/");

  if (!url) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Paperclip size={14} aria-hidden /> {label}
      </div>
    );
  }

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
        <img src={url} alt={label} className="max-w-full max-h-64 rounded-lg object-contain" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40"
    >
      {(mime ?? "").includes("pdf") || (mime ?? "").includes("word") || (mime ?? "").includes("sheet") ? (
        <FileText size={16} className="shrink-0 text-primary" aria-hidden />
      ) : (
        <Download size={16} className="shrink-0 text-primary" aria-hidden />
      )}
      <span className="truncate">{label}</span>
    </a>
  );
}

export function ConsultaThread({
  messages,
  currentUserId,
  producerId,
  profilesById,
}: {
  messages: ConsultaMessage[];
  currentUserId: string | undefined;
  producerId: string | undefined;
  profilesById: Record<string, ProfileSnippet>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scrolls only the thread: scrollIntoView would also move the page away from its header.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <div
      ref={scrollRef}
      className="bg-card rounded-xl border border-border/60 p-4 sm:p-5 min-h-[280px] max-h-[60vh] overflow-y-auto"
    >
      {messages.map((m, index) => {
        const mine = m.author_user_id === currentUserId;
        const fromTeam = m.author_user_id !== producerId;
        const profile = profilesById[m.author_user_id];
        const previous = messages[index - 1];
        const day = formatConsultaDay(m.created_at);
        const newDay = !previous || formatConsultaDay(previous.created_at) !== day;
        const sameAuthor = !newDay && previous?.author_user_id === m.author_user_id;
        return (
          <Fragment key={m.id}>
            {newDay && (
              <div className="flex items-center gap-3 py-3" role="separator">
                <span className="h-px flex-1 bg-border/70" />
                <span className="text-[11px] font-medium text-muted-foreground">{day}</span>
                <span className="h-px flex-1 bg-border/70" />
              </div>
            )}
            <div
              className={cn(
                "flex gap-2 items-start",
                mine ? "flex-row-reverse" : "flex-row",
                sameAuthor ? "mt-1.5" : "mt-4",
              )}
            >
              {sameAuthor ? (
                <span className="h-8 w-8 shrink-0" aria-hidden />
              ) : (
                <UserAvatar profile={profile} />
              )}
              <div
                className={cn(
                  "px-3.5 py-2.5 rounded-xl text-sm max-w-[80%] min-w-0",
                  mine ? "bg-primary/10" : "bg-muted",
                )}
              >
                {!sameAuthor && (
                  <p className="text-xs font-semibold text-foreground mb-1">
                    {mine ? "Vos" : displayName(profile, fromTeam ? "Equipo Kipper" : "Productor")}
                    {fromTeam && !mine && (
                      <span className="ml-1.5 font-normal text-muted-foreground">Equipo Kipper</span>
                    )}
                  </p>
                )}
                {m.body?.trim() ? (
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                ) : null}
                {m.attachment_path ? (
                  <MessageAttachment
                    path={m.attachment_path}
                    name={m.attachment_name}
                    mime={m.attachment_mime}
                  />
                ) : null}
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {new Date(m.created_at).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
