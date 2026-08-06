import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function AvatarUpload({ className }: { className?: string }) {
  const { user, profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file || !user || !profile) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Usá JPG, PNG o WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("La imagen debe pesar menos de 2 MB");
      return;
    }

    try {
      setUploading(true);
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;

      const { error: pErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("user_id", user.id);
      if (pErr) throw pErr;

      await refreshProfile();
      await qc.invalidateQueries({ queryKey: ["avatar_url"] });
      toast.success("Foto de perfil actualizada");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir la foto");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Cambiar foto de perfil"
      >
        <UserAvatar
          profile={
            profile
              ? { full_name: profile.full_name, email: profile.email, avatar_url: profile.avatar_url }
              : null
          }
          className="h-20 w-20 text-2xl"
        />
        <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
          {uploading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
        </span>
      </button>
      <div>
        <p className="font-medium text-foreground">{profile?.full_name || "Tu perfil"}</p>
        <p className="text-sm text-muted-foreground">{profile?.email}</p>
        <button
          type="button"
          className="text-sm text-primary hover:underline mt-1"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Subiendo..." : "Cambiar foto"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
