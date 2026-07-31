import type { FedPatPolicyPayload, MatchResult } from "./types.ts";

export function mapFedPatPolicy(p: FedPatPolicyPayload) {
  return {
    external_source: "fedpat",
    external_policy_id: p.external_policy_id,
    external_customer_id: p.external_customer_id ?? null,
    policy_number: p.policy_number ?? null,
    policy_type: p.ramo ?? "auto",
    coverage_type: p.cobertura ?? null,
    start_date: p.fecha_inicio ?? new Date().toISOString().slice(0, 10),
    end_date: p.fecha_fin ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    premium_amount: p.prima ?? null,
    vehicle_plate: p.patente ?? null,
    vehicle_brand: p.marca ?? null,
    vehicle_model: p.modelo ?? null,
    vehicle_year: p.anio ?? null,
    status: "activa",
    payment_frequency: "mensual",
    sync_status: "synced",
    last_synced_at: new Date().toISOString(),
  };
}

/**
 * Resolve a Kipper profile from FedPat customer payload.
 * Priority: DNI -> email -> policy_number -> vehicle plate.
 * Returns confidence 0.85+ to auto-link, lower to require review.
 */
export async function matchFedPatPolicyToKipperClient(
  adminClient: any,
  p: FedPatPolicyPayload
): Promise<MatchResult> {
  if (p.dni) {
    const { data } = await adminClient.from("profiles").select("user_id").eq("dni", p.dni).maybeSingle();
    if (data?.user_id) return { profile_id: data.user_id, match_method: "dni", confidence: 0.95 };
  }
  if (p.email) {
    const { data } = await adminClient.from("profiles").select("user_id").eq("email", p.email).maybeSingle();
    if (data?.user_id) return { profile_id: data.user_id, match_method: "email", confidence: 0.85 };
  }
  if (p.policy_number) {
    const { data } = await adminClient
      .from("policies")
      .select("user_id")
      .eq("policy_number", p.policy_number)
      .maybeSingle();
    if (data?.user_id) return { profile_id: data.user_id, match_method: "policy_number", confidence: 0.9 };
  }
  if (p.patente) {
    const { data } = await adminClient
      .from("policies")
      .select("user_id")
      .eq("vehicle_plate", p.patente)
      .maybeSingle();
    if (data?.user_id) return { profile_id: data.user_id, match_method: "vehicle_domain", confidence: 0.8 };
  }
  return { profile_id: null, match_method: "unknown", confidence: 0 };
}
