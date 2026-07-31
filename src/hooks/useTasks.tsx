import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Task {
  id: string;
  type: string;
  related_type: string | null;
  related_id: string | null;
  assigned_role: string | null;
  assigned_producer_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
}

export function useTasks(filters?: { status?: string; assigned_producer_id?: string }) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.assigned_producer_id) query = query.eq('assigned_producer_id', filters.assigned_producer_id);

      const { data, error } = await query;
      if (error) throw error;
      return data as Task[];
    }
  });
}

export function useMyTasks() {
  return useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_producer_id', user.id)
        .in('status', ['pendiente', 'en_progreso'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Task[];
    }
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    }
  });
}
