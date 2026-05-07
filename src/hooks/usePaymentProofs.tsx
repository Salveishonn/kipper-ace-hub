import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

export interface PaymentProofUploadInput {
  installmentId: string;
  userId: string;
  file: File;
  amount?: number;
  paidAt?: string;
  notes?: string;
}

export function useUploadPaymentProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PaymentProofUploadInput) => {
      const ext = input.file.name.split(".").pop() ?? "bin";
      const path = `${input.userId}/${input.installmentId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, input.file, { upsert: false });
      if (upErr) throw upErr;

      const { data, error } = await supabase
        .from("payment_proofs")
        .insert({
          installment_id: input.installmentId,
          user_id: input.userId,
          file_path: path,
          amount: input.amount ?? null,
          paid_at: input.paidAt ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      trackEvent("payment_proof_uploaded");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_proofs"] }),
  });
}

export function usePaymentProofs(filters?: { status?: string }) {
  return useQuery({
    queryKey: ["payment_proofs", filters],
    queryFn: async () => {
      let q = supabase.from("payment_proofs").select("*").order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useReviewPaymentProof() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "aprobado" | "rechazado" }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("payment_proofs")
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // If approved, mark installment as paid
      if (status === "aprobado" && data?.installment_id) {
        await supabase
          .from("installments")
          .update({ status: "pagada", paid_at: new Date().toISOString() })
          .eq("id", data.installment_id);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment_proofs"] });
      qc.invalidateQueries({ queryKey: ["installments"] });
    },
  });
}
