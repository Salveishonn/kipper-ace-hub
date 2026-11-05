import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { ShieldCheck } from "lucide-react";
import type { ForumAuthor } from "@/hooks/useForum";
import { cn } from "@/lib/utils";

export function ForumAuthorLine({
  author,
  createdAt,
  editedAt,
  compact,
}: {
  author: ForumAuthor | undefined;
  createdAt: string;
  editedAt: string | null;
  compact?: boolean;
}) {
  const date = new Date(createdAt);
  return (
    <div className="min-w-0">
      <p className={cn("flex items-center gap-1.5 font-semibold truncate", compact ? "text-xs" : "text-sm")}>
        <span className="truncate">{author?.full_name?.trim() || "Productor"}</span>
        {author?.is_admin && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            <ShieldCheck size={10} aria-hidden /> Kipper
          </span>
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        <time dateTime={createdAt} title={format(date, "d 'de' MMMM yyyy, HH:mm", { locale: es })}>
          {formatDistanceToNow(date, { addSuffix: true, locale: es })}
        </time>
        {editedAt && " · editado"}
      </p>
    </div>
  );
}

export function avatarProfile(author: ForumAuthor | undefined) {
  return author ? { full_name: author.full_name, email: "", avatar_url: author.avatar_url } : null;
}
