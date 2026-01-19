import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Policy {
  id: string;
  user_id: string | null;
  assigned_productor_id: string | null;
  lead_id: string | null;
  insurance_company_id: string | null;
  policy_number: string | null;
  policy_type: string;
  coverage_type: string | null;
  status: string;
  start_date: string;
  end_date: string;
  premium_amount: number | null;
  payment_frequency: string | null;
  vehicle_plate: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  documents: unknown[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  insurance_company?: {
    name: string;
    logo_url: string | null;
  };
}

export function usePolicies() {
  return useQuery({
    queryKey: ['policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policies')
        .select(`
          *,
          insurance_company:insurance_companies(name, logo_url)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Policy[];
    }
  });
}

export function usePolicy(id: string) {
  return useQuery({
    queryKey: ['policies', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policies')
        .select(`
          *,
          insurance_company:insurance_companies(name, logo_url)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Policy;
    },
    enabled: !!id
  });
}

export function useMyPolicies() {
  return useQuery({
    queryKey: ['my-policies'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('policies')
        .select(`
          *,
          insurance_company:insurance_companies(name, logo_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Policy[];
    }
  });
}
