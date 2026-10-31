import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isConsultaUnread, type ConsultaSide } from "@/lib/consultaActivity";
import { uploadConsultaAttachment } from "@/lib/fileUploads";

// Safety net for when the realtime connection drops.
const REFRESH_INTERVAL_MS = 60 * 1000;

async function kickSupportNotificationOutbox() {
  try {
    await supabase.functions.invoke("process-support-notifications", {
      body: { source: "client" },
    });
  } catch {
    /* Outbox remains retryable; never fail the case/message write. */
  }
}

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
      let q = supabase
        .from("support_tickets")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (!options?.admin && options?.producerId) {
        q = q.eq("producer_id", options.producerId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: options?.admin || !!options?.producerId,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

export function useSupportTicket(id: string | undefined) {
  return useQuery({
    queryKey: ["support_tickets", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

/** Keeps every consultas query current while the portal is open. */
export function useConsultasLive(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      qc.invalidateQueries({ queryKey: ["support_messages"] });
    };
    const channel = supabase
      .channel(`consultas-live-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, refresh)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
}

export function useConsultaUnreadCount(side: ConsultaSide, producerId?: string) {
  const { data } = useSupportTickets(
    side === "equipo" ? { admin: true } : { producerId },
  );
  return (data ?? []).filter((t) => isConsultaUnread(t, side)).length;
}

export function useMarkSupportTicketRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase.rpc("mark_support_ticket_read", { p_ticket_id: ticketId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support_tickets"] }),
  });
}

export function useConsultaProducerDetails(producerId: string | undefined) {
  return useQuery({
    queryKey: ["consulta_producer", producerId],
    queryFn: async () => {
      const [{ data: profile, error }, { data: applications }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url, phone, city, province")
          .eq("user_id", producerId!)
          .maybeSingle(),
        supabase
          .from("producer_applications")
          .select("matricula_ssn")
          .eq("user_id", producerId!)
          .limit(1),
      ]);
      if (error) throw error;
      return profile
        ? { ...profile, matricula_ssn: applications?.[0]?.matricula_ssn ?? null }
        : null;
    },
    enabled: !!producerId,
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
      file?: File | null;
    }) => {
      const { data: ticket, error: tErr } = await supabase
        .from("support_tickets")
        .insert({
          producer_id: input.producer_id,
          category: input.category,
          subject: input.subject.trim(),
        })
        .select()
        .single();
      if (tErr) throw tErr;

      // The attachment path needs the ticket id. A failed upload must not leave an empty case.
      let attachment: { path: string; name: string; mime: string | null } | null = null;
      let attachmentFailed = false;
      if (input.file) {
        try {
          attachment = {
            path: await uploadConsultaAttachment(input.file, ticket.id, input.producer_id),
            name: input.file.name,
            mime: input.file.type || null,
          };
        } catch {
          attachmentFailed = true;
        }
      }

      const { error: mErr } = await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        author_user_id: input.producer_id,
        body: input.initial_message.trim(),
        attachment_path: attachment?.path ?? null,
        attachment_name: attachment?.name ?? null,
        attachment_mime: attachment?.mime ?? null,
      });
      if (mErr) throw mErr;
      void kickSupportNotificationOutbox();
      return { ticket, attachmentFailed };
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
      void kickSupportNotificationOutbox();
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
    refetchInterval: REFRESH_INTERVAL_MS,
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
      void kickSupportNotificationOutbox();
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["support_messages", vars.ticket_id] });
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
    },
  });
}
