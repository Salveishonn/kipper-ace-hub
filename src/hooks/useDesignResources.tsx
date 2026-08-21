import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DESIGN_CATEGORIES = [
  { value: "instagram_post", label: "Instagram post" },
  { value: "instagram_story", label: "Instagram story" },
  { value: "whatsapp_status", label: "WhatsApp status" },
  { value: "flyer", label: "Flyer" },
  { value: "reel_cover", label: "Reel cover" },
  { value: "otro", label: "Otro" },
] as const;

export type DesignCategory = (typeof DESIGN_CATEGORIES)[number]["value"];

export function designCategoryLabel(value: string) {
  return DESIGN_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

const IMAGE_PATH = /\.(jpe?g|png|gif|webp|svg)$/i;

/** Preview image for cards/dialogs: dedicated preview, or the download file when it is itself an image. */
export function designResourcePreviewPath(resource: {
  preview_path?: string | null;
  download_path?: string | null;
}): string | null {
  if (resource.preview_path) return resource.preview_path;
  if (resource.download_path && IMAGE_PATH.test(resource.download_path)) {
    return resource.download_path;
  }
  return null;
}

export function useDesignResources(options?: { admin?: boolean }) {
  return useQuery({
    queryKey: ["design_resources", options?.admin ?? false],
    queryFn: async () => {
      let q = supabase
        .from("design_resources")
        .select("*")
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (!options?.admin) {
        q = q.eq("published", true);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveDesignResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      title: string;
      description?: string | null;
      category: DesignCategory;
      preview_path?: string | null;
      download_path?: string | null;
      editable_url?: string | null;
      published?: boolean;
      sort_order?: number;
    }) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { data, error } = await supabase
          .from("design_resources")
          .update(rest)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("design_resources")
        .insert({ ...payload, created_by: userData.user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["design_resources"] }),
  });
}

export function useDeleteDesignResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("design_resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["design_resources"] }),
  });
}

const BUCKET = "design-resources";

export async function uploadDesignResourceFile(file: File, path: string) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export async function getDesignResourceSignedUrl(path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
