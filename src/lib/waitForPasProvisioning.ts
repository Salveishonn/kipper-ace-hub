import { supabase } from "@/integrations/supabase/client";

const POLL_MS = 400;
const MAX_ATTEMPTS = 15;

export type PasProvisioningResult =
  | { ok: true }
  | { ok: false; reason: "timeout" | "not_active" };

/**
 * After invite password is set, DB trigger may activate PAS on email_confirmed_at.
 * Poll profile + roles until productor/active or timeout.
 */
export async function waitForPasProvisioning(userId: string): Promise<PasProvisioningResult> {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("account_status").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const isProductor = roles?.some((r) => r.role === "productor") ?? false;
    const isActive = profile?.account_status === "active";

    if (isProductor && isActive) {
      return { ok: true };
    }

    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.account_status !== "active") {
    return { ok: false, reason: "not_active" };
  }

  return { ok: false, reason: "timeout" };
}
