import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSupportTickets(options?: { admin?: boolean; producerId?: string }) {
  return useQuery({
    queryKey: ["support_tickets", options?.admin, options?.producerId],
    queryFn: async () => {
      let q = supabase.from("support_tickets").select("*").order("updated_at", { ascending: false });
      if (!options?.admin) {
        q = q.eq("producer_id", options?.producerId!);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: options?.admin || !!options?.producerId,
  });
}

export function useCreateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      producer_id: string;
      category: string;
      subject: string;
      initial_message: string;
    }) => {
      const { data: ticket, error: tErr } = await supabase
        .from("support_tickets")
        .insert({
          producer_id: input.producer_id,
          category: input.category,
          subject: input.subject,
        })
        .select()
        .single();
      if (tErr) throw tErr;

      const { error: mErr } = await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        author_user_id: input.producer_id,
        body: input.initial_message,
      });
      if (mErr) throw mErr;
      return ticket;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support_tickets"] }),
  });
}

export function useUpdateSupportTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase.from("support_tickets").update({ status }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      qc.invalidateQueries({ queryKey: ["support_messages", vars.id] });
    },
  });
}

export function useSupportMessages(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["support_messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });
}

export function useSendSupportMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticket_id,
      author_user_id,
      body,
    }: {
      ticket_id: string;
      author_user_id: string;
      body: string;
    }) => {
      const { data, error } = await supabase
        .from("support_messages")
        .insert({ ticket_id, author_user_id, body })
        .select()
        .single();
      if (error) throw error;
      await supabase.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticket_id);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["support_messages", vars.ticket_id] });
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
    },
  });
}
