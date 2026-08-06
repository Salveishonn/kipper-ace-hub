import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Paperclip } from "lucide-react";
import type { ProfileSnippet } from "@/hooks/useSupportTickets";
import { UserAvatar, displayName } from "@/components/shared/UserAvatar";
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
        <img src={url} alt={label} className="max-w-full max-h-48 rounded-lg object-contain" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
    >
      {(mime ?? "").includes("pdf") || (mime ?? "").includes("word") || (mime ?? "").includes("sheet") ? (
        <FileText size={14} aria-hidden />
      ) : (
        <Download size={14} aria-hidden />
      )}
      {label}
    </a>
  );
}

export function ConsultaThread({
  messages,
  currentUserId,
  profilesById,
}: {
  messages: ConsultaMessage[];
  currentUserId: string | undefined;
  profilesById: Record<string, ProfileSnippet>;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="bg-card rounded-2xl p-4 space-y-3 min-h-[240px] max-h-[60vh] overflow-y-auto">
      {messages.map((m) => {
        const mine = m.author_user_id === currentUserId;
        const profile = profilesById[m.author_user_id];
        return (
          <div
            key={m.id}
            className={cn("flex gap-2 items-end", mine ? "flex-row-reverse" : "flex-row")}
          >
            <UserAvatar profile={profile} />
            <div
              className={cn(
                "p-3 rounded-xl text-sm max-w-[75%]",
                mine ? "bg-primary/10 rounded-br-sm" : "bg-muted rounded-bl-sm",
              )}
            >
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">
                {displayName(profile, mine ? "Vos" : "Equipo Kipper")}
              </p>
              {m.body?.trim() ? <p className="whitespace-pre-wrap">{m.body}</p> : null}
              {m.attachment_path ? (
                <MessageAttachment
                  path={m.attachment_path}
                  name={m.attachment_name}
                  mime={m.attachment_mime}
                />
              ) : null}
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(m.created_at).toLocaleString("es-AR")}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
