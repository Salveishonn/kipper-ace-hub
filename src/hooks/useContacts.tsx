import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Contact {
  id: string;
  email: string;
  phone: string | null;
  full_name: string | null;
  origin: string | null;
  opt_in: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateContactInput {
  email: string;
  phone?: string;
  full_name?: string;
  origin?: string;
  opt_in?: boolean;
  tags?: string[];
}

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Contact[];
    }
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateContactInput) => {
      // Try to upsert by email
      const { data, error } = await supabase
        .from('contacts')
        .upsert(
          {
            email: input.email,
            phone: input.phone || null,
            full_name: input.full_name || null,
            origin: input.origin || 'website',
            opt_in: input.opt_in ?? false,
            tags: input.tags || [],
          },
          { onConflict: 'email' }
        )
        .select()
        .single();
      
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateContactInput>) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });
}

export function exportContactsToCSV(contacts: Contact[]): string {
  const headers = ['Email', 'Nombre', 'Teléfono', 'Origen', 'Opt-In', 'Tags', 'Fecha'];
  const rows = contacts.map(c => [
    c.email,
    c.full_name || '',
    c.phone || '',
    c.origin || '',
    c.opt_in ? 'Sí' : 'No',
    (c.tags || []).join('; '),
    new Date(c.created_at).toLocaleDateString('es-AR'),
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
  
  return csvContent;
}
