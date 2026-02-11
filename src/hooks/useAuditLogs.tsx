import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useAuditLogs(entityType?: string, entityId?: string) {
  return useQuery({
    queryKey: ['audit_logs', entityType, entityId],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (entityType) query = query.eq('entity_type', entityType);
      if (entityId) query = query.eq('entity_id', entityId);

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    }
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as AuditLog[];
    }
  });
}

export async function writeAuditLog(params: {
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get user role
  let role = 'unknown';
  if (user) {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .limit(1);
    if (roles && roles.length > 0) role = roles[0].role;
  }

  await supabase.from('audit_logs').insert([{
    actor_user_id: user?.id || null,
    actor_role: role,
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id || null,
    metadata: (params.metadata || {}) as any,
  }]);
}
