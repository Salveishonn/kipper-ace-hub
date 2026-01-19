import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Producer {
  id: string;
  user_id: string;
  profile: {
    full_name: string | null;
    email: string;
  } | null;
  leadsCount?: number;
}

export function useProducers() {
  return useQuery({
    queryKey: ['producers'],
    queryFn: async () => {
      // Get all users with productor role
      const { data: productorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'productor');

      if (rolesError) throw rolesError;
      if (!productorRoles || productorRoles.length === 0) return [];

      const userIds = productorRoles.map(r => r.user_id);

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Get lead counts for each producer
      const { data: leadCounts, error: leadsError } = await supabase
        .from('leads')
        .select('assigned_productor_id')
        .in('assigned_productor_id', userIds);

      const countMap: Record<string, number> = {};
      if (leadCounts) {
        leadCounts.forEach(lead => {
          if (lead.assigned_productor_id) {
            countMap[lead.assigned_productor_id] = (countMap[lead.assigned_productor_id] || 0) + 1;
          }
        });
      }

      return profiles?.map(p => ({
        id: p.user_id,
        user_id: p.user_id,
        profile: {
          full_name: p.full_name,
          email: p.email,
        },
        leadsCount: countMap[p.user_id] || 0,
      })) || [];
    }
  });
}

// Get the next producer for round-robin assignment
export async function getNextProducerForAssignment(): Promise<string | null> {
  const { data: productorRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'productor');

  if (!productorRoles || productorRoles.length === 0) return null;

  const userIds = productorRoles.map(r => r.user_id);

  // Get today's lead counts for each producer
  const today = new Date().toISOString().split('T')[0];
  const { data: todayLeads } = await supabase
    .from('leads')
    .select('assigned_productor_id')
    .in('assigned_productor_id', userIds)
    .gte('created_at', today);

  // Count leads per producer
  const countMap: Record<string, number> = {};
  userIds.forEach(id => { countMap[id] = 0; });
  
  if (todayLeads) {
    todayLeads.forEach(lead => {
      if (lead.assigned_productor_id) {
        countMap[lead.assigned_productor_id] = (countMap[lead.assigned_productor_id] || 0) + 1;
      }
    });
  }

  // Find producer with least leads today
  let minLeads = Infinity;
  let selectedProducer = userIds[0];
  
  for (const userId of userIds) {
    if (countMap[userId] < minLeads) {
      minLeads = countMap[userId];
      selectedProducer = userId;
    }
  }

  return selectedProducer;
}
