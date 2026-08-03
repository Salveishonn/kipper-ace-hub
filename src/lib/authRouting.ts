import type { User } from "@supabase/supabase-js";

export type ProducerApplicationSnapshot = {
  status: string;
  email: string;
  full_name?: string | null;
} | null;

export type AuthDestinationInput = {
  user: User | null;
  roles: string[];
  accountStatus?: string | null;
  application: ProducerApplicationSnapshot;
};

/**
 * Server-backed destination after login / auth callback.
 * Does not expose whether an email exists — only routes an authenticated session.
 */
export function resolvePostAuthDestination(input: AuthDestinationInput): string {
  const { user, roles, accountStatus, application } = input;
  if (!user) return "/login";

  if (roles.includes("admin")) return "/admin";

  if (roles.includes("productor")) {
    if (accountStatus && accountStatus !== "active" && accountStatus !== undefined) {
      if (accountStatus === "suspended") return "/productor/acceso-no-disponible";
    }
    return "/productor";
  }

  if (application?.status === "rechazado") {
    return "/productor/acceso-no-disponible";
  }

  if (
    application &&
    ["pending", "nuevo", "en_revision", "aprobado", "invitado"].includes(application.status)
  ) {
    return "/productor/solicitud-pendiente";
  }

  return "/productor/acceso-no-disponible";
}

export function isEmailNotConfirmedError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("email not confirmed") ||
    m.includes("email_not_confirmed") ||
    m.includes("confirm your email")
  );
}
