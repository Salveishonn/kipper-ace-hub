export interface FedPatPolicyPayload {
  external_policy_id: string;
  external_customer_id?: string;
  policy_number?: string;
  ramo?: string;
  cobertura?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  prima?: number;
  patente?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  dni?: string;
  email?: string;
}

export interface MatchResult {
  profile_id: string | null;
  match_method: "dni" | "email" | "policy_number" | "vehicle_domain" | "manual" | "unknown";
  confidence: number;
}
