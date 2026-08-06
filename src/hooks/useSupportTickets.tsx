import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProfileSnippet = {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
};

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
    mutationFn: async ({
      id,
      status,
      actorUserId,
    }: {
      id: string;
      status: string;
      actorUserId: string;
    }) => {
      const now = new Date().toISOString();
      const patch: {
        status: string;
        resolved_by?: string | null;
        resolved_at?: string | null;
        closed_by?: string | null;
        closed_at?: string | null;
      } = { status };

      if (status === "resuelto") {
        patch.resolved_by = actorUserId;
        patch.resolved_at = now;
        patch.closed_by = null;
        patch.closed_at = null;
      } else if (status === "cerrado") {
        patch.closed_by = actorUserId;
        patch.closed_at = now;
      } else if (status === "abierto" || status === "en_gestion") {
        patch.resolved_by = null;
        patch.resolved_at = null;
        patch.closed_by = null;
        patch.closed_at = null;
      }

      const { data, error } = await supabase
        .from("support_tickets")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
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

export function useProfilesByUserIds(userIds: string[]) {
  const unique = Array.from(new Set(userIds.filter(Boolean))).sort();
  return useQuery({
    queryKey: ["profiles_by_ids", unique],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", unique);
      if (error) throw error;
      return (data ?? []) as ProfileSnippet[];
    },
    enabled: unique.length > 0,
  });
}

export function useSendSupportMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticket_id,
      author_user_id,
      body,
      attachment_path,
      attachment_name,
      attachment_mime,
    }: {
      ticket_id: string;
      author_user_id: string;
      body: string;
      attachment_path?: string | null;
      attachment_name?: string | null;
      attachment_mime?: string | null;
    }) => {
      const trimmed = body.trim();
      if (!trimmed && !attachment_path) {
        throw new Error("Escribí un mensaje o adjuntá un archivo");
      }
      const { data, error } = await supabase
        .from("support_messages")
        .insert({
          ticket_id,
          author_user_id,
          body: trimmed,
          attachment_path: attachment_path ?? null,
          attachment_name: attachment_name ?? null,
          attachment_mime: attachment_mime ?? null,
        })
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
