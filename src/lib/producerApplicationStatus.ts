/**
 * Controlled producer_applications.status values (must match DB CHECK constraint).
 *
 * Lifecycle:
 *   nuevo | en_revision → (admin sends invite) → invitado → (auth user provisioned) → activo
 *   rechazado = terminal
 *
 * Note: `aprobado` is retained in the DB constraint only for legacy rows; do not write it in new flows.
 */
export const PRODUCER_APPLICATION_STATUS = {
  NUEVO: "nuevo",
  EN_REVISION: "en_revision",
  RECHAZADO: "rechazado",
  INVITADO: "invitado",
  ACTIVO: "activo",
} as const;

export type ProducerApplicationStatus =
  (typeof PRODUCER_APPLICATION_STATUS)[keyof typeof PRODUCER_APPLICATION_STATUS];

/** Pending admin review */
export const PENDING_APPLICATION_STATUSES: ProducerApplicationStatus[] = [
  PRODUCER_APPLICATION_STATUS.NUEVO,
  PRODUCER_APPLICATION_STATUS.EN_REVISION,
];

/** Eligible to send (or resend) an invitation */
export const INVITE_ELIGIBLE_STATUSES: ProducerApplicationStatus[] = [
  PRODUCER_APPLICATION_STATUS.NUEVO,
  PRODUCER_APPLICATION_STATUS.EN_REVISION,
  PRODUCER_APPLICATION_STATUS.INVITADO,
];
