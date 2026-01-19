import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Installment {
  id: string;
  policy_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  payment_method: string | null;
  mp_payment_id: string | null;
  mp_preference_id: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useInstallments(policyId?: string) {
  return useQuery({
    queryKey: ['installments', policyId],
    queryFn: async () => {
      let query = supabase
        .from('installments')
        .select('*')
        .order('due_date', { ascending: true });
      
      if (policyId) {
        query = query.eq('policy_id', policyId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Installment[];
    }
  });
}

export function useMyInstallments() {
  return useQuery({
    queryKey: ['my-installments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First get user's policies
      const { data: policies } = await supabase
        .from('policies')
        .select('id')
        .eq('user_id', user.id);

      if (!policies || policies.length === 0) return [];

      const policyIds = policies.map(p => p.id);

      const { data, error } = await supabase
        .from('installments')
        .select(`
          *,
          policy:policies(policy_number, policy_type, insurance_company:insurance_companies(name))
        `)
        .in('policy_id', policyIds)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });
}

export function usePendingInstallments() {
  return useQuery({
    queryKey: ['pending-installments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: policies } = await supabase
        .from('policies')
        .select('id')
        .eq('user_id', user.id);

      if (!policies || policies.length === 0) return [];

      const policyIds = policies.map(p => p.id);

      const { data, error } = await supabase
        .from('installments')
        .select(`
          *,
          policy:policies(policy_number, policy_type, insurance_company:insurance_companies(name))
        `)
        .in('policy_id', policyIds)
        .in('status', ['pendiente', 'atrasada'])
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });
}

export function useUpdateInstallment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Installment> & { id: string }) => {
      const { data, error } = await supabase
        .from('installments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Installment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installments'] });
      queryClient.invalidateQueries({ queryKey: ['my-installments'] });
      queryClient.invalidateQueries({ queryKey: ['pending-installments'] });
    }
  });
}
