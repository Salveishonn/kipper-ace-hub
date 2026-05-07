import { writeAudit } from "./utils.ts";

export async function syncClaims(adminClient: any, userId: string, mode: string): Promise<{ inserted: number }> {
  if (mode !== "mock") return { inserted: 0 };

  const { data: policies } = await adminClient
    .from("policies")
    .select("id")
    .eq("external_source", "fedpat")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!policies?.length) return { inserted: 0 };

  const { data: ins } = await adminClient
    .from("claims")
    .insert({
      policy_id: policies[0].id,
      claim_number: `FP-SIN-MOCK-${Date.now()}`,
      status: "recibido",
      description: "Siniestro simulado - colisión trasera en estacionamiento",
      incident_date: new Date().toISOString().slice(0, 10),
      external_source: "fedpat",
      external_claim_id: `FEDPAT-CLM-${Date.now()}`,
      sync_status: "synced",
      last_synced_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (ins) {
    await writeAudit(adminClient, {
      actor_user_id: userId,
      action: "fedpat.claim_upserted",
      entity_type: "claim",
      entity_id: ins.id,
      metadata: { policy_id: policies[0].id, mode },
    });
  }
  return { inserted: ins ? 1 : 0 };
}
