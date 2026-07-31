import { writeAudit } from "./utils.ts";

export async function syncInstallments(adminClient: any, userId: string, mode: string): Promise<{ inserted: number }> {
  if (mode !== "mock") return { inserted: 0 }; // TODO real

  const { data: policies } = await adminClient
    .from("policies")
    .select("id")
    .eq("external_source", "fedpat")
    .order("created_at", { ascending: false })
    .limit(3);

  if (!policies?.length) return { inserted: 0 };

  let inserted = 0;
  for (const p of policies) {
    const rows = Array.from({ length: 6 }, (_, i) => ({
      policy_id: p.id,
      installment_number: i + 1,
      amount: 2500 + Math.floor(Math.random() * 1000),
      due_date: new Date(Date.now() + i * 30 * 86400000).toISOString().slice(0, 10),
      status: i === 0 ? "pagada" : "pendiente",
      external_source: "fedpat",
      external_installment_id: `FEDPAT-INST-${p.id}-${Date.now()}-${i}`,
      sync_status: "synced",
      last_synced_at: new Date().toISOString(),
    }));
    const { data: ins } = await adminClient.from("installments").upsert(rows, { onConflict: "external_installment_id" }).select();
    if (ins) {
      inserted += ins.length;
      for (const row of ins) {
        await writeAudit(adminClient, {
          actor_user_id: userId,
          action: "fedpat.installment_upserted",
          entity_type: "installment",
          entity_id: row.id,
          metadata: { policy_id: p.id, mode },
        });
      }
    }
  }
  return { inserted };
}
