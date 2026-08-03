/**
 * Pure rules mirroring DB triggers (for tests and documentation).
 * Authoritative logic lives in supabase/migrations SQL triggers.
 *
 * New self-registration: pas_applicant metadata → pending profile + application,
 * no productor role until admin approval.
 * Legacy invite activation below remains for invited_at users.
 */

export type ApplicationRow = {
  id: string;
  email: string;
  status: string;
  invite_expires_at: string | null;
  user_id: string | null;
};

export type AuthUserSnapshot = {
  id: string;
  email: string;
  invited_at: string | null;
  email_confirmed_at: string | null;
  application_id: string | null;
  pas_applicant?: boolean;
};

/** Self-registration signup: provision pending rows, never activate. */
export function shouldProvisionPendingApplicantOnSignup(user: AuthUserSnapshot): boolean {
  return Boolean(user.pas_applicant) && !user.invited_at;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseApplicationId(metadata: Record<string, unknown> | null | undefined): string | null {
  const raw = metadata?.application_id;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return raw.trim();
}

export function isInviteApplicationValid(
  app: ApplicationRow,
  user: AuthUserSnapshot,
  now: Date = new Date(),
): boolean {
  if (!user.application_id || user.application_id !== app.id) return false;
  if (normalizeEmail(app.email) !== normalizeEmail(user.email)) return false;
  if (app.status !== "invitado") return false;
  if (app.invite_expires_at && new Date(app.invite_expires_at) < now) return false;
  if (app.user_id && app.user_id !== user.id) return false;
  return true;
}

/** AFTER INSERT: pending profile + link user_id only */
export function shouldLinkPendingProfileOnInsert(
  app: ApplicationRow,
  user: AuthUserSnapshot,
  now?: Date,
): boolean {
  if (!user.invited_at) return false;
  if (!user.application_id) return false;
  return isInviteApplicationValid(app, user, now);
}

/** AFTER UPDATE: email newly confirmed */
export function shouldActivatePasOnEmailConfirmed(
  app: ApplicationRow,
  oldUser: AuthUserSnapshot,
  newUser: AuthUserSnapshot,
  now?: Date,
): boolean {
  if (oldUser.email_confirmed_at) return false;
  if (!newUser.email_confirmed_at) return false;
  if (!newUser.invited_at) return false;
  return isInviteApplicationValid(app, newUser, now);
}

/** Fail closed: normal signup without invite metadata */
export function isNormalSignupWithoutInvite(user: AuthUserSnapshot): boolean {
  return !user.invited_at && !user.application_id;
}
