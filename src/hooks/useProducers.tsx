import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Producer {
  id: string;
  user_id: string;
  profile: {
    full_name: string | null;
    email: string;
    account_status?: string;
  } | null;
}

export function useProducers() {
  return useQuery({
    queryKey: ['producers'],
    queryFn: async (): Promise<Producer[]> => {
      const { data: productorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'productor');

      if (rolesError) throw rolesError;
      if (!productorRoles || productorRoles.length === 0) return [];

      const userIds = productorRoles.map(r => r.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, account_status')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      return profiles?.map(p => ({
        id: p.user_id,
        user_id: p.user_id,
        profile: {
          full_name: p.full_name,
          email: p.email,
          account_status: p.account_status,
        },
      })) || [];
    }
  });
}
