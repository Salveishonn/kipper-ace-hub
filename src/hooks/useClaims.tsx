import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface Claim {
  id: string;
  policy_id: string;
  user_id: string | null;
  claim_number: string | null;
  status: string;
  incident_date: string;
  incident_time: string | null;
  incident_location: string | null;
  description: string;
  documents: Json | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  policy?: {
    policy_number: string | null;
    policy_type: string;
    insurance_company?: {
      name: string;
    };
  };
}

export interface CreateClaimInput {
  policy_id: string;
  incident_date: string;
  incident_time?: string;
  incident_location?: string;
  description: string;
}

export function useClaims() {
  return useQuery({
    queryKey: ['claims'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('claims')
        .select(`
          *,
          policy:policies(policy_number, policy_type, insurance_company:insurance_companies(name))
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Claim[];
    }
  });
}

export function useMyClaims() {
  return useQuery({
    queryKey: ['my-claims'],
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
        .from('claims')
        .select(`
          *,
          policy:policies(policy_number, policy_type, insurance_company:insurance_companies(name))
        `)
        .in('policy_id', policyIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Claim[];
    }
  });
}

export function useCreateClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClaimInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('claims')
        .insert([{ ...input, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data as Claim;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['my-claims'] });
    }
  });
}

export function useUpdateClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, resolution_notes }: { id: string; status?: string; resolution_notes?: string }) => {
      const { data, error } = await supabase
        .from('claims')
        .update({ status, resolution_notes })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Claim;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['my-claims'] });
    }
  });
}
