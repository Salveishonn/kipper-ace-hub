/** Maps Supabase/PostgREST errors from public Sumate submissions to Spanish copy. */

export type ProducerApplicationErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
  status?: number;
};

export function logProducerApplicationError(
  error: ProducerApplicationErrorLike,
  context = "producer_applications insert",
): void {
  console.error(`[${context}]`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    status: error.status,
  });
}

export function getProducerApplicationErrorMessage(
  error: unknown,
): string {
  const err = (error ?? {}) as ProducerApplicationErrorLike;
  const code = err.code ?? "";
  const message = (err.message ?? "").toLowerCase();
  const details = (err.details ?? "").toLowerCase();

  // Unique violation (email already applied)
  if (
    code === "23505" ||
    message.includes("duplicate key") ||
    message.includes("unique constraint") ||
    details.includes("email")
  ) {
    return "Ya existe una solicitud con este email. Si ya te postulaste, el equipo te va a contactar.";
  }

  // Check / NOT NULL / validation failures
  if (
    code === "23514" ||
    code === "23502" ||
    message.includes("check constraint") ||
    message.includes("null value") ||
    message.includes("violates check")
  ) {
    return "Revisá los datos del formulario. Algunos campos no son válidos.";
  }

  // Network / offline
  if (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("fetch failed")
  ) {
    return "No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.";
  }

  // RLS / permission
  if (
    code === "42501" ||
    message.includes("row-level security") ||
    message.includes("permission denied")
  ) {
    return "No se pudo registrar la solicitud por un problema de permisos. Intentá nuevamente en unos minutos.";
  }

  return "Error al enviar la solicitud. Intentá nuevamente.";
}
