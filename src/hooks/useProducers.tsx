import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProducerProfile {
  full_name: string | null;
  email: string;
  phone: string | null;
  dni: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  account_status: string;
}

export interface Producer {
  id: string;
  user_id: string;
  hasProductorRole: boolean;
  profile: ProducerProfile | null;
}

export type ProducerProfileUpdate = {
  user_id: string;
  full_name?: string | null;
  phone?: string | null;
  dni?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
};

/**
 * Active + suspended PAS accounts: anyone with productor role OR suspended
 * profile that previously was linked to an activo application.
 */
export function useProducers() {
  return useQuery({
    queryKey: ['producers'],
    queryFn: async (): Promise<Producer[]> => {
      const { data: productorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'productor');
      if (rolesError) throw rolesError;

      const roleIds = new Set((productorRoles || []).map((r) => r.user_id));

      const { data: apps, error: appsError } = await supabase
        .from('producer_applications')
        .select('user_id')
        .eq('status', 'activo')
        .not('user_id', 'is', null);
      if (appsError) throw appsError;

      const appIds = (apps || []).map((a) => a.user_id!).filter(Boolean);
      const allIds = Array.from(new Set([...roleIds, ...appIds]));
      if (allIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(
          'user_id, full_name, email, phone, dni, address, city, province, postal_code, account_status',
        )
        .in('user_id', allIds);
      if (profilesError) throw profilesError;

      return (profiles || []).map((p) => ({
        id: p.user_id,
        user_id: p.user_id,
        hasProductorRole: roleIds.has(p.user_id),
        profile: {
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          dni: p.dni,
          address: p.address,
          city: p.city,
          province: p.province,
          postal_code: p.postal_code,
          account_status: p.account_status,
        },
      }));
    },
  });
}

export function useUpdateProducerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProducerProfileUpdate) => {
      const { user_id, ...fields } = input;
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fields.full_name,
          phone: fields.phone,
          dni: fields.dni,
          address: fields.address,
          city: fields.city,
          province: fields.province,
          postal_code: fields.postal_code,
        })
        .eq('user_id', user_id);
      if (error) throw error;

      if (fields.full_name) {
        await supabase
          .from('producer_applications')
          .update({ full_name: fields.full_name })
          .eq('user_id', user_id);
      }
      return { ok: true as const };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producers'] });
      qc.invalidateQueries({ queryKey: ['producer_applications'] });
    },
  });
}

export function useRevokePasProducer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await supabase.rpc('revoke_pas_producer', {
        p_user_id: user_id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producers'] });
      qc.invalidateQueries({ queryKey: ['producer_applications'] });
    },
  });
}

export function useRestorePasProducer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await supabase.rpc('restore_pas_producer', {
        p_user_id: user_id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producers'] });
      qc.invalidateQueries({ queryKey: ['producer_applications'] });
    },
  });
}
