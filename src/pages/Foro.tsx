import { useMemo } from "react";
import { Loader2, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useForumAuthors, useForumFeed, useForumLive } from "@/hooks/useForum";
import { ForumComposer } from "@/components/foro/ForumComposer";
import { ForumPostCard } from "@/components/foro/ForumPostCard";
import { ErrorState, LoadingState } from "@/components/ui/loading-state";

/** Foro interno: feed compartido por productores y el equipo Kipper. */
const ForoPage = () => {
  const { user, profile, isAdmin, adminMfaVerified } = useAuth();
  useForumLive(!!user);
  const feed = useForumFeed();

  const posts = useMemo(() => feed.data?.pages.flatMap((p) => p.posts) ?? [], [feed.data]);
  const authorIds = useMemo(
    () => posts.flatMap((p) => [p.author_id, ...p.forum_reactions.map((r) => r.user_id)]),
    [posts],
  );
  const { data: authors } = useForumAuthors(authorIds);

  if (!user) return null;
  const canModerate = isAdmin && adminMfaVerified;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessagesSquare size={24} className="text-primary" aria-hidden /> Foro
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compartí materiales, experiencias y dudas con la comunidad de productores Kipper. Lo que
          publiques lo ven todos los productores y el equipo.
        </p>
      </div>

      <ForumComposer
        userId={user.id}
        profile={
          profile ? { full_name: profile.full_name, email: profile.email, avatar_url: profile.avatar_url } : null
        }
      />

      {feed.isLoading ? (
        <LoadingState text="Cargando publicaciones..." />
      ) : feed.error ? (
        <ErrorState title="Error" message="No se pudo cargar el foro" />
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-medium">Todavía no hay publicaciones</p>
          <p className="text-sm text-muted-foreground mt-1">¡Sé el primero en compartir algo con la comunidad!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <ForumPostCard
              key={post.id}
              post={post}
              authors={authors ?? {}}
              currentUserId={user.id}
              canModerate={canModerate}
            />
          ))}
          {feed.hasNextPage && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => feed.fetchNextPage()} disabled={feed.isFetchingNextPage}>
                {feed.isFetchingNextPage && <Loader2 size={16} className="mr-2 animate-spin" aria-hidden />}
                Ver publicaciones anteriores
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ForoPage;
