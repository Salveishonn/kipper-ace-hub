import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

export type QuoteRamo =
  | "auto"
  | "moto"
  | "hogar"
  | "comercio"
  | "accidentes_personales"
  | "vida"
  | "otro"
  | "sumate_productor";

export interface QuoteRequestInput {
  ramo: QuoteRamo;
  full_name: string;
  email: string;
  phone?: string | null;
  dni?: string | null;
  city?: string | null;
  province?: string | null;
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  vehicle_year?: number | null;
  vehicle_version?: string | null;
  vehicle_use?: string | null;
  coverage_type?: string | null;
  message?: string | null;
  documents?: unknown[];
  source?: string;
}

export function useCreateQuoteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: QuoteRequestInput) => {
      const payload = {
        ...input,
        documents: input.documents ?? [],
        source: input.source ?? "website",
      };
      const { data, error } = await supabase
        .from("quote_requests")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      // Best-effort contact upsert
      try {
        await supabase.from("contacts").upsert(
          {
            email: input.email,
            full_name: input.full_name,
            phone: input.phone ?? null,
            origin: input.source ?? "website",
            opt_in: false,
          },
          { onConflict: "email" }
        );
      } catch {
        /* non-blocking */
      }

      trackEvent("quote_request_submitted", { ramo: input.ramo });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote_requests"] });
    },
  });
}

export function useQuoteRequests(filters?: { status?: string; ramo?: string }) {
  return useQuery({
    queryKey: ["quote_requests", filters],
    queryFn: async () => {
      let q = supabase.from("quote_requests").select("*").order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.ramo) q = q.eq("ramo", filters.ramo);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateQuoteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, unknown>) => {
      const { data, error } = await supabase
        .from("quote_requests")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote_requests"] }),
  });
}
