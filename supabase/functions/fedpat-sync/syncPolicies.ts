import { mapFedPatPolicy, matchFedPatPolicyToKipperClient } from "./mappers.ts";
import { writeAudit } from "./utils.ts";
import type { FedPatPolicyPayload } from "./types.ts";
import { callFedPatPoliciesEndpoint } from "./client.ts";

export async function syncPolicies(
  adminClient: any,
  userId: string,
  mode: "mock" | "sandbox" | "production",
  token: string | null
): Promise<{ inserted: number }> {
  let payloads: FedPatPolicyPayload[] = [];

  if (mode === "mock") {
    payloads = Array.from({ length: 3 }, (_, i) => ({
      external_policy_id: `FEDPAT-POL-${Date.now()}-${i}`,
      external_customer_id: `FEDPAT-CUST-${Date.now()}-${i}`,
      policy_number: `FP-MOCK-${Date.now()}-${i + 1}`,
      ramo: ["auto", "moto", "hogar"][i % 3],
      cobertura: ["terceros_completo", "todo_riesgo", "basica"][i % 3],
      fecha_inicio: new Date().toISOString().slice(0, 10),
      fecha_fin: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      prima: 15000 + i * 2500,
    }));
  } else {
    if (!token) return { inserted: 0 };
    payloads = (await callFedPatPoliciesEndpoint(token)) as FedPatPolicyPayload[];
  }

  let inserted = 0;
  for (const p of payloads) {
    const row = mapFedPatPolicy(p);
    const match = await matchFedPatPolicyToKipperClient(adminClient, p);

    const insertRow: any = { ...row };
    if (match.profile_id && match.confidence >= 0.85) {
      insertRow.user_id = match.profile_id;
    }

    const { data: upserted } = await adminClient
      .from("policies")
      .upsert(insertRow, { onConflict: "external_policy_id" })
      .select()
      .single();

    if (upserted) {
      inserted++;
      await writeAudit(adminClient, {
        actor_user_id: userId,
        action: "fedpat.policy_upserted",
        entity_type: "policy",
        entity_id: upserted.id,
        metadata: { external_policy_id: p.external_policy_id, mode },
      });
    }

    if (!match.profile_id || match.confidence < 0.85) {
      await adminClient.from("external_identity_matches").insert({
        external_source: "fedpat",
        external_customer_id: p.external_customer_id ?? null,
        external_policy_id: p.external_policy_id,
        profile_id: match.profile_id,
        match_method: match.match_method,
        confidence: match.confidence,
        status: "needs_review",
        payload: p as any,
      });
      await writeAudit(adminClient, {
        actor_user_id: userId,
        action: "fedpat.match_created",
        entity_type: "external_identity_match",
        metadata: { external_policy_id: p.external_policy_id, confidence: match.confidence },
      });
    }
  }
  return { inserted };
}
