import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type OutboxRow = {
  id: string;
  event_type: "case.created" | "case.message.created";
  event_id: string;
  payload: Record<string, unknown>;
  attempts: number;
};

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function caseRef(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function brandedEmail(params: {
  heading: string;
  intro: string;
  rows: Array<[string, string]>;
  ctaUrl: string;
  ctaLabel: string;
}): string {
  const rows = params.rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:#6b5e57;font-size:13px;width:140px;">${escapeHtml(label)}</td><td style="padding:6px 0;color:#1a1412;font-size:14px;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `
  <div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f7f4f1;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eadfd6;border-radius:8px;overflow:hidden;">
      <div style="background:#601410;color:#fff;padding:18px 24px;">
        <p style="margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Kipper Seguros</p>
        <h1 style="margin:8px 0 0;font-size:20px;">${escapeHtml(params.heading)}</h1>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;color:#3a332f;line-height:1.55;">${escapeHtml(params.intro)}</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">${rows}</table>
        <p style="margin:0 0 8px;">
          <a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;background:#601410;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600;">
            ${escapeHtml(params.ctaLabel)}
          </a>
        </p>
        <p style="margin:12px 0 0;font-size:12px;color:#7a716b;">Si el botón no funciona: ${escapeHtml(params.ctaUrl)}</p>
      </div>
    </div>
  </div>`;
}

async function sendResend(params: {
  to: string[];
  subject: string;
  html: string;
  idempotencyKey: string;
}): Promise<{ id?: string; error?: string }> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from =
    Deno.env.get("RESEND_FROM_EMAIL")?.trim() ||
    "Kipper Seguros <notificaciones@kipperseguros.com>";
  if (!resendKey) return { error: "RESEND_API_KEY no configurado" };
  if (!params.to.length) return { error: "Sin destinatarios admin" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": params.idempotencyKey.slice(0, 256),
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: `Resend ${res.status}: ${JSON.stringify(body).slice(0, 280)}` };
  }
  return { id: typeof body?.id === "string" ? body.id : undefined };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== "POST" && req.method !== "GET") {
    return json(req, { error: "Método no permitido" }, 405);
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const siteUrl = (Deno.env.get("SITE_URL") || "https://kipperseguros.com").replace(/\/$/, "");
  if (!serviceKey || !supabaseUrl) {
    return json(req, { error: "Configuración incompleta" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: claimed, error: claimErr } = await admin.rpc("claim_notification_outbox", {
    p_limit: 25,
  });
  if (claimErr) {
    console.error("outbox claim failed");
    return json(req, { error: "No se pudo reclamar la cola" }, 500);
  }

  const rows = (claimed ?? []) as OutboxRow[];
  const { data: roleRows, error: roleErr } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (roleErr) {
    console.error("admin recipients lookup failed");
  }
  const adminIds = (roleRows ?? []).map((row) => row.user_id);
  const { data: profileRows } = adminIds.length
    ? await admin.from("profiles").select("user_id, email").in("user_id", adminIds)
    : { data: [] };

  const recipients = Array.from(
    new Set(
      (profileRows ?? [])
        .map((row) => (typeof row.email === "string" ? row.email.trim().toLowerCase() : ""))
        .filter((email) => email.includes("@")),
    ),
  );

  const results: Array<{ id: string; status: string }> = [];

  for (const row of rows) {
    const payload = row.payload ?? {};
    const ticketId = String(payload.ticket_id ?? "");
    const subject = String(payload.subject ?? "Consulta");
    const producerName = String(payload.producer_name ?? "Productor");
    const createdAt = String(payload.created_at ?? new Date().toISOString());
    const messagePreview = String(payload.preview ?? "");
    const ctaUrl = `${siteUrl}/admin/consultas/${ticketId}`;
    const ref = caseRef(ticketId || row.event_id);

    const email =
      row.event_type === "case.created"
        ? {
            subject: "Nuevo caso de productor — Kipper Seguros",
            html: brandedEmail({
              heading: "Nuevo caso de productor",
              intro: `${producerName} abrió un caso en el portal de productores.`,
              rows: [
                ["Productor", producerName],
                ["Caso", `#${ref}`],
                ["Asunto", subject],
                ["Fecha", createdAt],
                ["Vista previa", messagePreview || "—"],
              ],
              ctaUrl,
              ctaLabel: "Ver caso en admin",
            }),
          }
        : {
            subject: `Nuevo mensaje en caso #${ref} — Kipper Seguros`,
            html: brandedEmail({
              heading: "Nuevo mensaje de productor",
              intro: `${producerName} escribió en un caso abierto.`,
              rows: [
                ["Productor", producerName],
                ["Caso", `#${ref}`],
                ["Asunto", subject],
                ["Fecha", createdAt],
                ["Vista previa", messagePreview || "—"],
              ],
              ctaUrl,
              ctaLabel: "Abrir conversación",
            }),
          };

    const sent = await sendResend({
      to: recipients,
      subject: email.subject,
      html: email.html,
      idempotencyKey: `${row.event_type}/${row.event_id}`,
    });

    if (sent.error) {
      console.error("notification email failed", row.event_type);
      await admin
        .from("notification_outbox")
        .update({
          status: "failed",
          last_error: sent.error.slice(0, 500),
          processed_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      results.push({ id: row.id, status: "failed" });
      continue;
    }

    await admin
      .from("notification_outbox")
      .update({
        status: "sent",
        last_error: null,
        provider_message_id: sent.id ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    results.push({ id: row.id, status: "sent" });
  }

  return json(req, { processed: results.length, results });
});
