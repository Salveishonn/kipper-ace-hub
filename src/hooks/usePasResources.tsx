import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PasResourceType = "pdf" | "video" | "image" | "link";

export function usePasResources(options?: { admin?: boolean }) {
  return useQuery({
    queryKey: ["pas_resources", options?.admin ?? false],
    queryFn: async () => {
      let q = supabase.from("pas_resources").select("*").order("sort_order").order("published_at", { ascending: false });
      if (!options?.admin) {
        q = q.eq("published", true);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useSavePasResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      title: string;
      description?: string | null;
      resource_type: PasResourceType;
      file_path?: string | null;
      external_url?: string | null;
      week_label?: string | null;
      published?: boolean;
      sort_order?: number;
      published_at?: string | null;
    }) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { data, error } = await supabase.from("pas_resources").update(rest).eq("id", id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from("pas_resources").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pas_resources"] }),
  });
}

export function useDeletePasResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pas_resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pas_resources"] }),
  });
}

export async function getPasResourceDownloadUrl(filePath: string) {
  const { data, error } = await supabase.storage.from("pas-resources").createSignedUrl(filePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadPasResourceFile(file: File, path: string) {
  const { error } = await supabase.storage.from("pas-resources").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}
