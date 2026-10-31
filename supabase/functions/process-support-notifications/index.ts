import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { emailDetails, emailParagraph, renderKipperEmail } from "../_shared/emailLayout.ts";
import { sendKipperEmail, type SendEmailResult } from "../_shared/sendEmail.ts";

type OutboxRow = {
  id: string;
  event_type: "case.created" | "case.message.created" | "pas.application.created";
  event_id: string;
  payload: Record<string, unknown>;
  attempts: number;
};

// Always notified, whether or not this address is an admin account.
const OPERATIONS_INBOX = "organizacionkipper@gmail.com";

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function caseRef(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function notificationEmail(params: {
  subject: string;
  eyebrow: string;
  heading: string;
  intro: string;
  rows: Array<[string, string]>;
  ctaUrl: string;
  ctaLabel: string;
}): { subject: string; html: string; text: string } {
  const footerNote = "Aviso interno para el equipo de Organización Kipper.";
  return {
    subject: params.subject,
    html: renderKipperEmail({
      subject: params.subject,
      preheader: params.intro,
      eyebrow: params.eyebrow,
      headline: params.heading,
      bodyHtml: `${emailParagraph(params.intro)}
              ${emailDetails(params.rows)}`,
      cta: { label: params.ctaLabel, url: params.ctaUrl, showFallbackLink: true },
      footerNote,
    }),
    text: [
      params.heading,
      "",
      params.intro,
      "",
      ...params.rows.map(([label, value]) => `${label}: ${value}`),
      "",
      `${params.ctaLabel}: ${params.ctaUrl}`,
      "",
      "Organización Kipper",
      footerNote,
    ].join("\n"),
  };
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
      [OPERATIONS_INBOX, ...(profileRows ?? []).map((row) => row.email)]
        .map((email) => (typeof email === "string" ? email.trim().toLowerCase() : ""))
        .filter((email) => email.includes("@")),
    ),
  );

  const results: Array<{ id: string; status: string }> = [];

  for (const row of rows) {
    const payload = row.payload ?? {};
    const ticketId = String(payload.ticket_id ?? "");
    const subject = String(payload.subject ?? "Consulta");
    const producerName = String(payload.producer_name ?? "Productor");
    const createdAt = formatDate(String(payload.created_at ?? new Date().toISOString()));
    const messagePreview = String(payload.preview ?? "");
    const ctaUrl = `${siteUrl}/admin/consultas/${ticketId}`;
    const ref = caseRef(ticketId || row.event_id);

    const email =
      row.event_type === "pas.application.created"
        ? notificationEmail({
            subject: "Nueva solicitud PAS — Organización Kipper",
            eyebrow: "Solicitud PAS",
            heading: "Nueva solicitud PAS",
            intro: `${producerName} pidió sumarse como Productor Asesor de Seguros.`,
            rows: [
              ["Nombre", producerName],
              ["Email", String(payload.email ?? "—")],
              ["Teléfono", String(payload.phone ?? "—")],
              ["Matrícula SSN", String(payload.matricula_ssn ?? "—")],
              ["Ubicación", String(payload.location ?? "—")],
              ["Fecha", createdAt],
              ["Mensaje", messagePreview || "—"],
            ],
            ctaUrl: `${siteUrl}/admin/productores`,
            ctaLabel: "Revisar solicitud",
          })
        : row.event_type === "case.created"
        ? notificationEmail({
            subject: "Nuevo caso de productor — Organización Kipper",
            eyebrow: "Portal de consultas",
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
          })
        : notificationEmail({
            subject: `Nuevo mensaje en caso #${ref} — Organización Kipper`,
            eyebrow: "Portal de consultas",
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
          });

    const sent: SendEmailResult = recipients.length
      ? await sendKipperEmail({
          to: recipients,
          subject: email.subject,
          html: email.html,
          text: email.text,
          idempotencyKey: `${row.event_type}/${row.event_id}`,
        })
      : { error: "Sin destinatarios admin" };

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
