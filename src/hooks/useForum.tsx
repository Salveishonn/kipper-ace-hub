import { useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  FORUM_BUCKET,
  removeForumFiles,
  uploadForumFile,
} from "@/lib/forumFiles";
import type { ForumReactionKey } from "@/lib/forumReactions";

export const FORUM_PAGE_SIZE = 15;

export type ForumAttachment = {
  id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  position: number;
};

export type ForumReaction = { user_id: string; reaction: ForumReactionKey };

export type ForumPost = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  forum_post_attachments: ForumAttachment[];
  forum_reactions: ForumReaction[];
  forum_comments: { count: number }[];
};

export type ForumComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
};

export type ForumAuthor = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
};

const POST_SELECT =
  "id, author_id, body, created_at, edited_at, forum_post_attachments(id, file_path, file_name, mime_type, size_bytes, position), forum_reactions(user_id, reaction), forum_comments(count)";

type FeedPage = { posts: ForumPost[]; nextCursor: string | null };
type FeedData = InfiniteData<FeedPage, string | null>;

export const forumKeys = {
  feed: ["forum", "feed"] as const,
  comments: (postId: string) => ["forum", "comments", postId] as const,
  authors: (ids: string[]) => ["forum", "authors", [...ids].sort().join(",")] as const,
};

export function useForumFeed() {
  return useInfiniteQuery<FeedPage, Error, FeedData, readonly string[], string | null>({
    queryKey: forumKeys.feed,
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from("forum_posts")
        .select(POST_SELECT)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(FORUM_PAGE_SIZE);
      if (pageParam) query = query.lt("created_at", pageParam);
      const { data, error } = await query;
      if (error) throw error;
      const posts = ((data ?? []) as unknown as ForumPost[]).map((p) => ({
        ...p,
        forum_post_attachments: [...(p.forum_post_attachments ?? [])].sort(
          (a, b) => a.position - b.position,
        ),
      }));
      return {
        posts,
        nextCursor: posts.length === FORUM_PAGE_SIZE ? posts[posts.length - 1].created_at : null,
      };
    },
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useForumComments(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: forumKeys.comments(postId),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_comments")
        .select("id, post_id, author_id, body, created_at, edited_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ForumComment[];
    },
  });
}

/** Names and avatars of forum participants (no email/DNI). */
export function useForumAuthors(userIds: string[]) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  return useQuery({
    queryKey: forumKeys.authors(unique),
    enabled: unique.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_forum_authors", { p_user_ids: unique });
      if (error) throw error;
      const byId: Record<string, ForumAuthor> = {};
      for (const a of (data ?? []) as ForumAuthor[]) byId[a.user_id] = a;
      return byId;
    },
  });
}

/** Keeps the feed current while the forum is open. */
export function useForumLive(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refreshFeed = () => {
      clearTimeout(timer);
      timer = setTimeout(() => qc.invalidateQueries({ queryKey: forumKeys.feed }), 400);
    };
    const channel = supabase
      .channel(`forum-live-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_posts" }, refreshFeed)
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_reactions" }, refreshFeed)
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_comments" }, (payload) => {
        refreshFeed();
        const row = (payload.new ?? payload.old) as { post_id?: string } | null;
        if (row?.post_id) qc.invalidateQueries({ queryKey: forumKeys.comments(row.post_id) });
      })
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
}

export function useCreateForumPost(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, files }: { body: string; files: File[] }) => {
      if (!userId) throw new Error("Sesión no válida");
      const postId = crypto.randomUUID();
      const { error: postError } = await supabase
        .from("forum_posts")
        .insert({ id: postId, body });
      if (postError) throw postError;

      const uploaded: string[] = [];
      try {
        const rows = [];
        for (const [index, file] of files.entries()) {
          const path = await uploadForumFile(file, userId, postId);
          uploaded.push(path);
          rows.push({
            post_id: postId,
            file_path: path,
            file_name: file.name.slice(0, 200),
            mime_type: file.type || null,
            size_bytes: file.size,
            position: index,
          });
        }
        if (rows.length) {
          const { error } = await supabase.from("forum_post_attachments").insert(rows);
          if (error) throw error;
        }
      } catch (e) {
        // Roll back: a post must not appear without the files the author chose.
        await removeForumFiles(uploaded);
        await supabase.from("forum_posts").delete().eq("id", postId);
        throw e;
      }
      return postId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: forumKeys.feed }),
  });
}

export function useUpdateForumPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      const { error } = await supabase.from("forum_posts").update({ body }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: forumKeys.feed }),
  });
}

export function useDeleteForumPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: Pick<ForumPost, "id" | "forum_post_attachments">) => {
      const { data, error } = await supabase
        .from("forum_posts")
        .delete()
        .eq("id", post.id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No tenés permiso para eliminar esta publicación");
      await removeForumFiles(post.forum_post_attachments.map((a) => a.file_path));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: forumKeys.feed }),
  });
}

export function useToggleForumReaction(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      reaction,
      current,
    }: {
      postId: string;
      reaction: ForumReactionKey;
      current: ForumReactionKey | null;
    }) => {
      if (!userId) throw new Error("Sesión no válida");
      if (current === reaction) {
        const { error } = await supabase
          .from("forum_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);
        if (error) throw error;
      } else if (current) {
        const { error } = await supabase
          .from("forum_reactions")
          .update({ reaction })
          .eq("post_id", postId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("forum_reactions").insert({ post_id: postId, reaction });
        if (error) throw error;
      }
    },
    // Optimistic: the button responds instantly.
    onMutate: async ({ postId, reaction, current }) => {
      await qc.cancelQueries({ queryKey: forumKeys.feed });
      const previous = qc.getQueryData<FeedData>(forumKeys.feed);
      qc.setQueryData<FeedData>(forumKeys.feed, (data) =>
        data && userId
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                posts: page.posts.map((p) => {
                  if (p.id !== postId) return p;
                  const others = p.forum_reactions.filter((r) => r.user_id !== userId);
                  return {
                    ...p,
                    forum_reactions:
                      current === reaction ? others : [...others, { user_id: userId, reaction }],
                  };
                }),
              })),
            }
          : data,
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(forumKeys.feed, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: forumKeys.feed }),
  });
}

export function useAddForumComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, body }: { postId: string; body: string }) => {
      const { error } = await supabase.from("forum_comments").insert({ post_id: postId, body });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: forumKeys.comments(vars.postId) });
      qc.invalidateQueries({ queryKey: forumKeys.feed });
    },
  });
}

export function useUpdateForumComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; postId: string; body: string }) => {
      const { error } = await supabase.from("forum_comments").update({ body }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: forumKeys.comments(vars.postId) }),
  });
}

export function useDeleteForumComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; postId: string }) => {
      const { data, error } = await supabase.from("forum_comments").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("No tenés permiso para eliminar este comentario");
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: forumKeys.comments(vars.postId) });
      qc.invalidateQueries({ queryKey: forumKeys.feed });
    },
  });
}

export { FORUM_BUCKET };
