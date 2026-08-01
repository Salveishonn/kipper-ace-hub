export const CONSULTA_CATEGORIES = [
  { value: "comercial", label: "Comercial" },
  { value: "siniestros", label: "Siniestros" },
  { value: "administracion", label: "Administración" },
  { value: "cotizaciones", label: "Cotizaciones" },
  { value: "otro", label: "Otro" },
] as const;

export const CONSULTA_STATUSES = [
  { value: "abierto", label: "Abierto" },
  { value: "en_gestion", label: "En gestión" },
  { value: "resuelto", label: "Resuelto" },
  { value: "cerrado", label: "Cerrado" },
] as const;

/** Includes legacy DB values so old tickets render with a readable label. */
export function consultaCategoryLabel(value: string) {
  const found = CONSULTA_CATEGORIES.find((c) => c.value === value);
  if (found) return found.label;
  if (value === "siniestro") return "Siniestros";
  if (value === "operativo") return "Administración";
  return value;
}

export function consultaStatusLabel(value: string) {
  return CONSULTA_STATUSES.find((s) => s.value === value)?.label ?? value.replace("_", " ");
}
