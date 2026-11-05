import { useState } from "react";
import { MessageCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserAvatar } from "@/components/shared/UserAvatar";
import {
  type ForumAuthor,
  type ForumPost,
  useDeleteForumPost,
  useToggleForumReaction,
  useUpdateForumPost,
} from "@/hooks/useForum";
import { FORUM_REACTIONS, reactionMeta, summarizeReactions, type ForumReactionKey } from "@/lib/forumReactions";
import { ForumAttachments } from "./ForumAttachments";
import { ForumComments } from "./ForumComments";
import { ForumAuthorLine, avatarProfile } from "./ForumAuthorLine";
import { cn } from "@/lib/utils";

export function ForumPostCard({
  post,
  authors,
  currentUserId,
  canModerate,
}: {
  post: ForumPost;
  authors: Record<string, ForumAuthor>;
  currentUserId: string;
  canModerate: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const update = useUpdateForumPost();
  const remove = useDeleteForumPost();
  const toggle = useToggleForumReaction(currentUserId);

  const author = authors[post.author_id];
  const isOwner = post.author_id === currentUserId;
  const myReaction =
    (post.forum_reactions.find((r) => r.user_id === currentUserId)?.reaction as ForumReactionKey | undefined) ??
    null;
  const summary = summarizeReactions(post.forum_reactions);
  const commentCount = post.forum_comments?.[0]?.count ?? 0;
  const reactorNames = post.forum_reactions
    .map((r) => (r.user_id === currentUserId ? "Vos" : authors[r.user_id]?.full_name?.trim()))
    .filter(Boolean)
    .slice(0, 12)
    .join(", ");

  const react = (reaction: ForumReactionKey) => {
    setPickerOpen(false);
    toggle.mutate(
      { postId: post.id, reaction, current: myReaction },
      { onError: () => toast.error("No se pudo registrar la reacción") },
    );
  };

  const saveEdit = async () => {
    if (!draft.trim() && post.forum_post_attachments.length === 0) return;
    try {
      await update.mutateAsync({ id: post.id, body: draft.trim() });
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const doDelete = async () => {
    try {
      await remove.mutateAsync(post);
      toast.success("Publicación eliminada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  const current = myReaction ? reactionMeta(myReaction) : null;

  return (
    <article className="bg-card rounded-xl border border-border/60 shadow-sm" aria-label={`Publicación de ${author?.full_name ?? "productor"}`}>
      <header className="flex items-start gap-3 p-4 pb-2">
        <UserAvatar profile={avatarProfile(author)} className="h-10 w-10 shrink-0" />
        <div className="flex-1 min-w-0">
          <ForumAuthorLine author={author} createdAt={post.created_at} editedAt={post.edited_at} />
        </div>
        {(isOwner || canModerate) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Opciones de la publicación">
                <MoreHorizontal size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner && (
                <DropdownMenuItem
                  onSelect={() => {
                    setDraft(post.body);
                    setEditing(true);
                  }}
                >
                  <Pencil size={14} className="mr-2" aria-hidden /> Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setConfirmDelete(true)}
              >
                <Trash2 size={14} className="mr-2" aria-hidden />
                {isOwner ? "Eliminar" : "Eliminar (moderación)"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <div className="px-4 pb-3 space-y-3">
        {editing ? (
          <div className="space-y-2">
            <textarea
              className="w-full min-h-[96px] resize-y rounded-lg border border-border bg-background p-2 text-sm focus:outline-none focus:border-primary/50"
              value={draft}
              maxLength={5000}
              aria-label="Editar publicación"
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={update.isPending}>
                Guardar
              </Button>
            </div>
          </div>
        ) : (
          post.body && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{post.body}</p>
        )}
        <ForumAttachments attachments={post.forum_post_attachments} />
      </div>

      {(summary.length > 0 || commentCount > 0) && (
        <div className="flex items-center justify-between px-4 pb-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" title={reactorNames || undefined}>
            {summary.length > 0 && (
              <>
                <span className="flex -space-x-0.5" aria-hidden>
                  {summary.slice(0, 3).map((r) => (
                    <span key={r.key}>{r.emoji}</span>
                  ))}
                </span>
                <span>{post.forum_reactions.length}</span>
                <span className="sr-only">reacciones</span>
              </>
            )}
          </span>
          {commentCount > 0 && (
            <button type="button" className="hover:underline" onClick={() => setShowComments((v) => !v)}>
              {commentCount} {commentCount === 1 ? "comentario" : "comentarios"}
            </button>
          )}
        </div>
      )}

      <div className="mx-4 flex items-center gap-1 border-t border-border/60 py-1">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <div className="flex-1 flex">
            <Button
              variant="ghost"
              size="sm"
              className={cn("flex-1 rounded-r-none", current && "text-primary font-semibold")}
              onClick={() => react(myReaction ?? "like")}
              aria-pressed={!!myReaction}
            >
              <span className="mr-1.5" aria-hidden>{current?.emoji ?? "👍"}</span>
              {current?.label ?? "Me gusta"}
            </Button>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-l-none px-2" aria-label="Elegir reacción">
                <span aria-hidden className="text-xs">▾</span>
              </Button>
            </PopoverTrigger>
          </div>
          <PopoverContent side="top" align="start" className="w-auto p-1.5">
            <div className="flex gap-1" role="group" aria-label="Reacciones">
              {FORUM_REACTIONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => react(r.key)}
                  className={cn(
                    "rounded-full p-1.5 text-2xl leading-none transition-transform hover:scale-125",
                    myReaction === r.key && "bg-primary/10",
                  )}
                  title={r.label}
                  aria-label={r.label}
                  aria-pressed={myReaction === r.key}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowComments((v) => !v)}>
          <MessageCircle size={16} className="mr-1.5" aria-hidden /> Comentar
        </Button>
      </div>

      {showComments && (
        <ForumComments
          postId={post.id}
          authors={authors}
          currentUserId={currentUserId}
          canModerate={canModerate}
        />
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar la publicación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borran también sus archivos, reacciones y comentarios. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
