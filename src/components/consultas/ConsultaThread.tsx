import { useEffect, useRef } from "react";
import type { ProfileSnippet } from "@/hooks/useSupportTickets";
import { UserAvatar, displayName } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";

export type ConsultaMessage = {
  id: string;
  author_user_id: string;
  body: string;
  created_at: string;
};

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
                {displayName(profile, mine ? "Vos" : "Usuario")}
              </p>
              <p className="whitespace-pre-wrap">{m.body}</p>
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
