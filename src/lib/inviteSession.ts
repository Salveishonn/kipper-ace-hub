import type { User } from "@supabase/supabase-js";

/** Parse Supabase auth hash params (e.g. #access_token=...&type=invite). */
export function parseAuthHash(): URLSearchParams {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash);
}

export function getAuthHashError(): { error: string; description: string | null } | null {
  const params = parseAuthHash();
  const error = params.get("error");
  if (!error) return null;
  return { error, description: params.get("error_description") };
}

/** True only for users created via admin invite (not password sign-up or OAuth). */
export function isInviteAuthUser(user: User): boolean {
  if (user.invited_at) return true;
  const appId = user.user_metadata?.application_id;
  return typeof appId === "string" && appId.trim().length > 0;
}

export function isInviteHashPresent(): boolean {
  const params = parseAuthHash();
  const type = params.get("type");
  return type === "invite" || type === "signup";
}
