import { writeAudit } from "./utils.ts";

export async function syncDocuments(adminClient: any, userId: string, mode: string): Promise<{ inserted: number }> {
  if (mode !== "mock") return { inserted: 0 };

  const { data: policies } = await adminClient
    .from("policies")
    .select("id")
    .eq("external_source", "fedpat")
    .order("created_at", { ascending: false })
    .limit(3);

  if (!policies?.length) return { inserted: 0 };

  const docTypes = ["poliza", "cert_cobertura", "cert_mercosur", "libre_deuda", "cupon"];
  let inserted = 0;

  for (const p of policies) {
    const rows = docTypes.map((t, i) => ({
      policy_id: p.id,
      external_source: "fedpat",
      external_document_id: `FEDPAT-DOC-${p.id}-${t}-${Date.now()}-${i}`,
      document_type: t,
      title: `${t.replace(/_/g, " ")} (mock)`,
      file_url: `https://mock.fedpat.example/docs/${p.id}/${t}.pdf`,
      issued_at: new Date().toISOString(),
      sync_status: "synced",
      last_synced_at: new Date().toISOString(),
    }));
    const { data: ins } = await adminClient
      .from("policy_documents")
      .insert(rows)
      .select();
    if (ins) {
      inserted += ins.length;
      for (const row of ins) {
        await writeAudit(adminClient, {
          actor_user_id: userId,
          action: "fedpat.document_upserted",
          entity_type: "policy_document",
          entity_id: row.id,
          metadata: { policy_id: p.id, mode },
        });
      }
    }
  }
  return { inserted };
}
