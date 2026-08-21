/**
 * Controlled producer_applications.status values (must match DB CHECK constraint).
 *
 * New lifecycle:
 *   pending → (admin approves) → activo | rechazado
 *
 * Legacy invite lifecycle (still supported):
 *   nuevo | en_revision → invitado → activo
 *   aprobado = legacy only
 */
export const PRODUCER_APPLICATION_STATUS = {
  PENDING: "pending",
  NUEVO: "nuevo",
  EN_REVISION: "en_revision",
  RECHAZADO: "rechazado",
  INVITADO: "invitado",
  ACTIVO: "activo",
} as const;

export type ProducerApplicationStatus =
  (typeof PRODUCER_APPLICATION_STATUS)[keyof typeof PRODUCER_APPLICATION_STATUS];

/** Pending admin review (new + legacy open states). */
export const PENDING_APPLICATION_STATUSES: string[] = [
  PRODUCER_APPLICATION_STATUS.PENDING,
  PRODUCER_APPLICATION_STATUS.NUEVO,
  PRODUCER_APPLICATION_STATUS.EN_REVISION,
  "aprobado",
];

/** Has Auth user and awaits admin approval (new flow, or legacy invite with linked user). */
export function isSelfRegistrationPending(app: {
  status: string;
  user_id?: string | null;
}): boolean {
  if (!app.user_id) return false;
  if (PENDING_APPLICATION_STATUSES.includes(app.status)) return true;
  // Invited legacy user who already has Auth: prefer direct approval over re-invite.
  return app.status === PRODUCER_APPLICATION_STATUS.INVITADO;
}

/** Legacy invitation flow: no Auth user yet, or invited without a linked user. */
export function isLegacyInviteFlow(app: {
  status: string;
  user_id?: string | null;
}): boolean {
  if (app.status === PRODUCER_APPLICATION_STATUS.INVITADO && !app.user_id) return true;
  if (app.status === PRODUCER_APPLICATION_STATUS.INVITADO && app.user_id) return false;
  return !app.user_id && PENDING_APPLICATION_STATUSES.includes(app.status);
}

export function isActiveProducerApplication(status: string): boolean {
  return status === PRODUCER_APPLICATION_STATUS.ACTIVO;
}

/** Approved application whose portal access was later revoked. */
export function isPasAccessSuspended(app: {
  status: string;
  account_status?: string | null;
}): boolean {
  return app.status === PRODUCER_APPLICATION_STATUS.ACTIVO && app.account_status === "suspended";
}
