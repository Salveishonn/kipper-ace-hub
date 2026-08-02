import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { getSupabaseFunctionUrl } from "@/lib/siteConfig";
import {
  getProducerApplicationErrorMessage,
  logProducerApplicationError,
} from "@/lib/producerApplicationErrors";

export interface ProducerApplicationInput {
  full_name: string;
  email: string;
  phone?: string | null;
  matricula_ssn?: string | null;
  city?: string | null;
  province?: string | null;
  years_experience?: number | null;
  current_companies?: string | null;
  message?: string | null;
}

/**
 * Public Sumate submission: INSERT only.
 * Do not chain .select()/.single() — applicants have no SELECT policy, and
 * Prefer: return=representation would fail even when the row was written.
 * Do not send workflow fields (status, user_id, reviewed_*, invite_*); the
 * database assigns status = 'nuevo'.
 */
export function useCreateProducerApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProducerApplicationInput) => {
      const payload = {
        full_name: input.full_name.trim(),
        email: input.email.trim(),
        phone: input.phone ?? null,
        matricula_ssn: input.matricula_ssn ?? null,
        city: input.city ?? null,
        province: input.province ?? null,
        years_experience: input.years_experience ?? null,
        current_companies: input.current_companies ?? null,
        message: input.message ?? null,
      };

      const { error } = await supabase
        .from("producer_applications")
        .insert(payload);

      if (error) {
        logProducerApplicationError(error);
        const mapped = new Error(getProducerApplicationErrorMessage(error));
        (mapped as Error & { cause?: unknown }).cause = error;
        throw mapped;
      }

      trackEvent("producer_application_submitted");
      return { ok: true as const };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["producer_applications"] }),
  });
}

export function useProducerApplications() {
  return useQuery({
    queryKey: ["producer_applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("producer_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProducerApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      admin_notes,
    }: {
      id: string;
      status?: string;
      admin_notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("producer_applications")
        .update({ status, admin_notes })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["producer_applications"] }),
  });
}

export function useInvitePasProducer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      application_id,
      resend = false,
    }: {
      application_id: string;
      resend?: boolean;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión requerida");

      const res = await fetch(getSupabaseFunctionUrl("invite-pas-producer"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ application_id, resend }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al enviar invitación");
      return body;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["producer_applications"] }),
  });
}
