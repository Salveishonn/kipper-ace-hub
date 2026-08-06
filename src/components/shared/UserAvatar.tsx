import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ProfileSnippet } from "@/hooks/useSupportTickets";
import { cn } from "@/lib/utils";

export async function getAvatarSignedUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

function initialsFrom(name: string | null | undefined, email?: string | null) {
  if (name?.trim()) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export function UserAvatar({
  profile,
  className,
}: {
  profile?: Pick<ProfileSnippet, "full_name" | "email" | "avatar_url"> | null;
  className?: string;
}) {
  const { data: src } = useQuery({
    queryKey: ["avatar_url", profile?.avatar_url],
    queryFn: () => getAvatarSignedUrl(profile?.avatar_url),
    enabled: !!profile?.avatar_url,
    staleTime: 30 * 60 * 1000,
  });

  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {src ? <AvatarImage src={src} alt={profile?.full_name || "Avatar"} /> : null}
      <AvatarFallback className="text-xs bg-primary/10 text-primary">
        {initialsFrom(profile?.full_name, profile?.email)}
      </AvatarFallback>
    </Avatar>
  );
}

export function displayName(profile?: ProfileSnippet | null, fallback = "Usuario") {
  const name = profile?.full_name?.trim();
  if (name) return name;
  return fallback;
}
