/** Canonical public partner list. Featured company is always Federación Patronal. */
export const FEATURED_INSURER = "Federación Patronal";

export const OTHER_INSURERS = ["La Caja", "Mercantil Andina", "Go Assistance"] as const;

export const PUBLIC_INSURERS = [FEATURED_INSURER, ...OTHER_INSURERS] as const;
