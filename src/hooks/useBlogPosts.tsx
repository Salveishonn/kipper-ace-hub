import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  tags: string[];
  status: string;
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBlogPostInput {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image?: string;
  tags?: string[];
  status?: string;
}

export function useBlogPosts(onlyPublished = false) {
  return useQuery({
    queryKey: ['blog_posts', onlyPublished],
    queryFn: async () => {
      let query = supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (onlyPublished) {
        query = query.eq('status', 'published');
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as BlogPost[];
    }
  });
}

export function useBlogPost(slug: string) {
  return useQuery({
    queryKey: ['blog_posts', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data as BlogPost;
    },
    enabled: !!slug
  });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBlogPostInput) => {
      const { data, error } = await supabase
        .from('blog_posts')
        .insert([{
          ...input,
          published_at: input.status === 'published' ? new Date().toISOString() : null,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data as BlogPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_posts'] });
    }
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateBlogPostInput>) => {
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
      return data as BlogPost;
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
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog_posts'] });
    }
  });
}
