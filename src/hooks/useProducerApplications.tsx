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
  password: string;
  confirm_password: string;
  phone?: string | null;
  matricula_ssn?: string | null;
  city?: string | null;
  province?: string | null;
  years_experience?: number | null;
  current_companies?: string | null;
  message?: string | null;
}

export type RegisterPasResult = {
  ok: true;
  message: string;
  email_verified?: boolean;
};

/**
 * Public Sumate submission via Edge Function:
 * creates Auth user + pending application linked by user_id.
 * Password never touches producer_applications.
 */
export function useCreateProducerApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProducerApplicationInput): Promise<RegisterPasResult> => {
      const payload = {
        full_name: input.full_name.trim(),
        email: input.email.trim(),
        password: input.password,
        confirm_password: input.confirm_password,
        phone: input.phone ?? null,
        matricula_ssn: input.matricula_ssn ?? null,
        city: input.city ?? null,
        province: input.province ?? null,
        years_experience: input.years_experience ?? null,
        current_companies: input.current_companies ?? null,
        message: input.message ?? null,
      };

      const res = await fetch(getSupabaseFunctionUrl("register-pas-application"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = {
          code: String(res.status || "edge_error"),
          message: typeof body.error === "string" ? body.error : "Error al enviar la solicitud",
          status: res.status,
        };
        logProducerApplicationError(err, "register-pas-application");
        // Prefer explicit Edge Function validation messages; fall back to mapped copy.
        const mapped = getProducerApplicationErrorMessage(err);
        const isGeneric = mapped === "Error al enviar la solicitud. Intentá nuevamente.";
        throw new Error(isGeneric && err.message ? err.message : mapped);
      }

      trackEvent("producer_application_submitted");
      return {
        ok: true as const,
        message:
          typeof body.message === "string"
            ? body.message
            : "Recibimos tu solicitud. Revisá tu email para verificar tu dirección. Una vez verificada, el equipo de Kipper evaluará tu solicitud.",
        email_verified: Boolean(body.email_verified),
      };
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
      const rows = data || [];
      const userIds = [
        ...new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id))),
      ];
      if (!userIds.length) {
        return rows.map((row) => ({ ...row, account_status: null as string | null }));
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, account_status")
        .in("user_id", userIds);
      const statusByUser = new Map(
        (profiles || []).map((profile) => [profile.user_id, profile.account_status]),
      );
      return rows.map((row) => ({
        ...row,
        account_status: row.user_id ? (statusByUser.get(row.user_id) ?? null) : null,
      }));
    },
  });
}

export function useMyProducerApplication() {
  return useQuery({
    queryKey: ["my_producer_application"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_producer_application");
      if (error) {
        // Fallback to RLS select if RPC not yet deployed.
        const { data: rows, error: selErr } = await supabase
          .from("producer_applications")
          .select("id, email, full_name, status, created_at, approved_at")
          .order("created_at", { ascending: false })
          .limit(1);
        if (selErr) throw error;
        return rows?.[0] ?? null;
      }
      const row = Array.isArray(data) ? data[0] : data;
      return row ?? null;
    },
  });
}

export type ProducerApplicationUpdate = {
  id: string;
  status?: string;
  admin_notes?: string | null;
  full_name?: string;
  phone?: string | null;
  matricula_ssn?: string | null;
  city?: string | null;
  province?: string | null;
  years_experience?: number | null;
  current_companies?: string | null;
  message?: string | null;
  email?: string;
};

export function useUpdateProducerApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProducerApplicationUpdate) => {
      const { id, ...fields } = input;
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) payload[key] = value;
      }
      const { data, error } = await supabase
        .from("producer_applications")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Keep profile name in sync when application has a linked Auth user.
      if (data?.user_id && typeof fields.full_name === "string") {
        await supabase
          .from("profiles")
          .update({
            full_name: fields.full_name,
            phone: fields.phone ?? undefined,
            city: fields.city ?? undefined,
            province: fields.province ?? undefined,
          })
          .eq("user_id", data.user_id);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["producer_applications"] });
      qc.invalidateQueries({ queryKey: ["producers"] });
    },
  });
}

export function useApprovePasProducer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ application_id }: { application_id: string }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión requerida");

      const res = await fetch(getSupabaseFunctionUrl("approve-pas-producer"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ application_id }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Error al aprobar acceso");
      return body as {
        ok: boolean;
        message?: string;
        warning?: string | null;
        email_notification_sent?: boolean;
        email_verified?: boolean;
        idempotent?: boolean;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["producer_applications"] });
      qc.invalidateQueries({ queryKey: ["producers"] });
    },
  });
}

/** Legacy-only: applications without Auth user_id. */
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
      if (!res.ok) throw new Error(body.error ?? "Error al enviar invitación legacy");
      return body;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["producer_applications"] }),
  });
}
