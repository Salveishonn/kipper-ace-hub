import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  type BlogAttachment,
  removeBlogFiles,
  uploadBlogFile,
} from '@/lib/blogMedia';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  video_url: string | null;
  tags: string[];
  status: string;
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
  blog_post_attachments: BlogAttachment[];
}

export interface CreateBlogPostInput {
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  featured_image?: string;
  video_url?: string | null;
  tags?: string[];
  status?: string;
}

/** Files to add and existing attachments to drop when saving a post. */
export interface BlogMediaChanges {
  newFiles?: File[];
  removed?: BlogAttachment[];
}

const POST_SELECT = '*, blog_post_attachments(*)';

function sortAttachments(post: BlogPost): BlogPost {
  return {
    ...post,
    blog_post_attachments: [...(post.blog_post_attachments ?? [])].sort((a, b) => a.position - b.position),
  };
}

export function useBlogPosts(onlyPublished = false) {
  return useQuery({
    queryKey: ['blog_posts', onlyPublished],
    queryFn: async () => {
      let query = supabase
        .from('blog_posts')
        .select(POST_SELECT)
        .order('created_at', { ascending: false });

      if (onlyPublished) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query;

      if (error) throw error;
      return ((data ?? []) as unknown as BlogPost[]).map(sortAttachments);
    }
  });
}

export function useBlogPost(slug: string) {
  return useQuery({
    queryKey: ['blog_posts', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(POST_SELECT)
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return sortAttachments(data as unknown as BlogPost);
    },
    enabled: !!slug
  });
}

async function applyMediaChanges(postId: string, media: BlogMediaChanges | undefined, startPosition: number) {
  if (!media) return;
  if (media.removed?.length) {
    const { error } = await supabase
      .from('blog_post_attachments')
      .delete()
      .in('id', media.removed.map((a) => a.id));
    if (error) throw error;
    await removeBlogFiles(media.removed.map((a) => a.file_path));
  }
  if (media.newFiles?.length) {
    const uploaded: string[] = [];
    try {
      const rows = [];
      for (const [i, file] of media.newFiles.entries()) {
        const path = await uploadBlogFile(file, postId);
        uploaded.push(path);
        rows.push({
          post_id: postId,
          file_path: path,
          file_name: file.name.slice(0, 200),
          mime_type: file.type || null,
          size_bytes: file.size,
          position: startPosition + i,
        });
      }
      const { error } = await supabase.from('blog_post_attachments').insert(rows);
      if (error) throw error;
    } catch (e) {
      await removeBlogFiles(uploaded);
      throw e;
    }
  }
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ media, ...input }: CreateBlogPostInput & { media?: BlogMediaChanges }) => {
      const id = crypto.randomUUID();
      const { data, error } = await supabase
        .from('blog_posts')
        .insert([{
          ...input,
          id,
          published_at: input.status === 'published' ? new Date().toISOString() : null,
        }])
        .select()
        .single();

      if (error) throw error;
      try {
        await applyMediaChanges(id, media, 0);
      } catch (e) {
        await supabase.from('blog_posts').delete().eq('id', id);
        throw e;
      }
      return data as unknown as BlogPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_posts'] });
    }
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      media,
      nextPosition = 0,
      ...updates
    }: { id: string; media?: BlogMediaChanges; nextPosition?: number } & Partial<CreateBlogPostInput>) => {
      const updateData: Partial<CreateBlogPostInput> & { published_at?: string } = { ...updates };
      if (updates.status === 'published') {
        updateData.published_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('blog_posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await applyMediaChanges(id, media, nextPosition);
      return data as unknown as BlogPost;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blog_posts'] });
      queryClient.invalidateQueries({ queryKey: ['blog_posts', data.slug] });
    }
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: Pick<BlogPost, 'id' | 'blog_post_attachments'>) => {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;
      await removeBlogFiles((post.blog_post_attachments ?? []).map((a) => a.file_path));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_posts'] });
    }
  });
}
