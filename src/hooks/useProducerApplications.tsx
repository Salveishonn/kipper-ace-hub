import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

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

export function useCreateProducerApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProducerApplicationInput) => {
      const { data, error } = await supabase
        .from("producer_applications")
        .insert(input)
        .select()
        .single();
      if (error) throw error;

      try {
        await supabase.from("contacts").upsert(
          {
            email: input.email,
            full_name: input.full_name,
            phone: input.phone ?? null,
            origin: "sumate",
            tags: ["producer_candidate"],
            opt_in: true,
          },
          { onConflict: "email" }
        );
      } catch {
        /* non-blocking */
      }

      trackEvent("producer_application_submitted");
      return data;
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
