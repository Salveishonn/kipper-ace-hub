import { supabase } from "@/integrations/supabase/client";
import { getSupabaseFunctionUrl } from "@/lib/siteConfig";

export type AdminMfaResult = {
  ok: boolean;
  email?: string;
  error?: string;
  retryAfterSeconds?: number;
};

async function callAdminMfa(body: Record<string, unknown>): Promise<AdminMfaResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return { ok: false, error: "Sesión requerida" };
  }

  const res = await fetch(getSupabaseFunctionUrl("admin-mfa"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    email?: string;
    error?: string;
    retryAfterSeconds?: number;
  };

  if (!res.ok) {
    return {
      ok: false,
      error: json.error ?? "No se pudo completar la verificación",
      retryAfterSeconds: json.retryAfterSeconds,
    };
  }

  return { ok: true, email: json.email };
}

export function requestAdminMfaCode() {
  return callAdminMfa({ action: "send" });
}

export function verifyAdminMfaCode(code: string) {
  return callAdminMfa({ action: "verify", code });
}
