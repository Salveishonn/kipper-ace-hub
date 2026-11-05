import { useState } from "react";
import { Loader2, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  type ForumAuthor,
  type ForumComment,
  useAddForumComment,
  useDeleteForumComment,
  useForumAuthors,
  useForumComments,
  useUpdateForumComment,
} from "@/hooks/useForum";
import { ForumAuthorLine, avatarProfile } from "./ForumAuthorLine";

function CommentItem({
  comment,
  author,
  isOwner,
  canModerate,
}: {
  comment: ForumComment;
  author: ForumAuthor | undefined;
  isOwner: boolean;
  canModerate: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const update = useUpdateForumComment();
  const remove = useDeleteForumComment();

  const save = async () => {
    if (!draft.trim()) return;
    try {
      await update.mutateAsync({ id: comment.id, postId: comment.post_id, body: draft.trim() });
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const del = async () => {
    if (!window.confirm("¿Eliminar este comentario?")) return;
    try {
      await remove.mutateAsync({ id: comment.id, postId: comment.post_id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  return (
    <li className="group flex gap-2">
      <UserAvatar profile={avatarProfile(author)} className="h-8 w-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-muted/70 px-3 py-2">
          <ForumAuthorLine author={author} createdAt={comment.created_at} editedAt={comment.edited_at} compact />
          {editing ? (
            <div className="mt-1 space-y-1.5">
              <textarea
                className="w-full min-h-[60px] resize-y rounded-md border border-border bg-background p-2 text-sm focus:outline-none"
                value={draft}
                maxLength={2000}
                aria-label="Editar comentario"
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-1.5">
                <Button variant="ghost" size="sm" className="h-7" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
                <Button size="sm" className="h-7" onClick={save} disabled={update.isPending}>
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{comment.body}</p>
          )}
        </div>
        {!editing && (isOwner || canModerate) && (
          <div className="mt-0.5 flex gap-3 px-3 text-[11px] text-muted-foreground">
            {isOwner && (
              <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setEditing(true)}>
                <Pencil size={11} aria-hidden /> Editar
              </button>
            )}
            <button type="button" className="inline-flex items-center gap-1 hover:text-destructive" onClick={del}>
              <Trash2 size={11} aria-hidden /> Eliminar
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

export function ForumComments({
  postId,
  authors,
  currentUserId,
  canModerate,
}: {
  postId: string;
  authors: Record<string, ForumAuthor>;
  currentUserId: string;
  canModerate: boolean;
}) {
  const [body, setBody] = useState("");
  const { data: comments, isLoading } = useForumComments(postId, true);
  const { data: commentAuthors } = useForumAuthors((comments ?? []).map((c) => c.author_id));
  const add = useAddForumComment();
  const allAuthors = { ...authors, ...(commentAuthors ?? {}) };

  const send = async () => {
    const text = body.trim();
    if (!text || add.isPending) return;
    try {
      await add.mutateAsync({ postId, body: text });
      setBody("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo comentar");
    }
  };

  return (
    <section className="border-t border-border/60 px-4 py-3 space-y-3" aria-label="Comentarios">
      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 size={18} className="animate-spin text-muted-foreground" aria-label="Cargando comentarios" />
        </div>
      ) : (
        comments &&
        comments.length > 0 && (
          <ul className="space-y-3">
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                author={allAuthors[c.author_id]}
                isOwner={c.author_id === currentUserId}
                canModerate={canModerate}
              />
            ))}
          </ul>
        )
      )}
      <div className="flex items-end gap-2">
        <textarea
          className="min-h-[38px] max-h-40 flex-1 resize-y rounded-2xl border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
          rows={1}
          placeholder="Escribí un comentario..."
          aria-label="Escribí un comentario"
          value={body}
          maxLength={2000}
          disabled={add.isPending}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button size="icon" className="h-9 w-9 rounded-full" onClick={send} disabled={!body.trim() || add.isPending} aria-label="Enviar comentario">
          <Send size={15} />
        </Button>
      </div>
    </section>
  );
}
