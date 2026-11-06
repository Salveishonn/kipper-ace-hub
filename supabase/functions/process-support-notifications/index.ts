import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { emailDetails, emailParagraph, renderKipperEmail } from "../_shared/emailLayout.ts";
import { sendKipperEmail, type SendEmailResult } from "../_shared/sendEmail.ts";
import { EXTENDED_EVENTS, handleExtendedEvent, pushToAdmins, pushToUsers } from "./extended.ts";

type OutboxRow = {
  id: string;
  event_type:
    | "case.created"
    | "case.message.created"
    | "case.reply.created"
    | "case.status.changed"
    | "pas.application.created"
    | "forum.post.created"
    | "forum.comment.created"
    | "content.published"
    | "admin.broadcast";
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

function insurerCodesLabel(payload: Record<string, unknown>): string {
  if (payload.has_insurer_code === false) return "No tiene";
  if (payload.has_insurer_code !== true) return "—";
  const codes = Array.isArray(payload.insurer_codes) ? payload.insurer_codes : [];
  const list = codes
    .map((c) => {
      const row = c as { company?: unknown; code?: unknown };
      const company = String(row.company ?? "").trim();
      const code = String(row.code ?? "").trim();
      return company ? (code ? `${company}: ${code}` : company) : "";
    })
    .filter(Boolean);
  return list.length ? `Sí — ${list.join(" · ")}` : "Sí";
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
  footerNote?: string;
}): { subject: string; html: string; text: string } {
  const footerNote = params.footerNote ?? "Aviso interno para el equipo de Organización Kipper.";
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

  const markRow = async (id: string, error: string | null) => {
    await admin
      .from("notification_outbox")
      .update(
        error
          ? { status: "failed", last_error: error.slice(0, 500), processed_at: new Date().toISOString() }
          : { status: "sent", last_error: null, processed_at: new Date().toISOString() },
      )
      .eq("id", id);
    results.push({ id, status: error ? "failed" : "sent" });
  };

  for (const row of rows) {
    if (EXTENDED_EVENTS.has(row.event_type)) {
      let error: string | null;
      try {
        error = await handleExtendedEvent(admin, row, siteUrl);
      } catch (e) {
        error = e instanceof Error ? e.message : "Error interno";
      }
      if (error) console.error("notification failed", row.event_type);
      await markRow(row.id, error);
      continue;
    }

    const payload = row.payload ?? {};
    const ticketId = String(payload.ticket_id ?? "");
    const subject = String(payload.subject ?? "Consulta");
    const producerName = String(payload.producer_name ?? "Productor");
    const createdAt = formatDate(String(payload.created_at ?? new Date().toISOString()));
    const messagePreview = String(payload.preview ?? "");
    const ctaUrl = `${siteUrl}/admin/consultas/${ticketId}`;
    const ref = caseRef(ticketId || row.event_id);
    const portalUrl = `${siteUrl}/productor/consultas/${ticketId}`;
    const producerFooter = "Recibís este email porque tenés una consulta abierta en el Portal de Productores.";
    const toProducer = row.event_type === "case.reply.created" || row.event_type === "case.status.changed";
    const closed = payload.status === "cerrado";

    const email =
      row.event_type === "case.reply.created"
        ? notificationEmail({
            subject: `Respondimos tu consulta #${ref} — Organización Kipper`,
            eyebrow: "Tu consulta",
            heading: "El equipo respondió tu consulta",
            intro: "Tenés una nueva respuesta del equipo de Organización Kipper.",
            rows: [
              ["Consulta", `#${ref}`],
              ["Asunto", subject],
              ["Respuesta", messagePreview || "—"],
            ],
            ctaUrl: portalUrl,
            ctaLabel: "Ver respuesta",
            footerNote: producerFooter,
          })
        : row.event_type === "case.status.changed"
        ? notificationEmail({
            subject: `Tu consulta #${ref} fue ${closed ? "cerrada" : "resuelta"} — Organización Kipper`,
            eyebrow: "Tu consulta",
            heading: closed ? "Cerramos tu consulta" : "Resolvimos tu consulta",
            intro: closed
              ? "Si necesitás algo más, podés abrir una nueva consulta desde el portal."
              : "Si seguís necesitando ayuda, respondé desde el portal y la reabrimos.",
            rows: [
              ["Consulta", `#${ref}`],
              ["Asunto", subject],
            ],
            ctaUrl: portalUrl,
            ctaLabel: "Ver consulta",
            footerNote: producerFooter,
          })
        : row.event_type === "pas.application.created"
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
              ["Código en compañía", insurerCodesLabel(payload)],
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

    const to = toProducer ? [String(payload.producer_email ?? "")].filter(Boolean) : recipients;
    const sent: SendEmailResult = to.length
      ? await sendKipperEmail({
          to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          idempotencyKey: `${row.event_type}/${row.event_id}`,
        })
      : { error: "Sin destinatarios" };

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

    // The producer also gets a push on their devices; never blocks or fails the email.
    if (toProducer && payload.producer_id) {
      try {
        await pushToUsers(admin, [String(payload.producer_id)], {
          title:
            row.event_type === "case.reply.created"
              ? "Respondimos tu consulta"
              : closed
                ? "Cerramos tu consulta"
                : "Resolvimos tu consulta",
          body: subject,
          url: `/productor/consultas/${ticketId}`,
          tag: `consulta-${ticketId}`,
        });
      } catch (e) {
        console.error("consulta push failed", e instanceof Error ? e.message : e);
      }
    }

    // Team events also reach admins' devices (PWA de administración). Best effort.
    if (!toProducer) {
      const preview = messagePreview.replace(/\s+/g, " ").trim().slice(0, 120);
      if (row.event_type === "pas.application.created") {
        await pushToAdmins(admin, "admin_push_applications", {
          title: "Nueva solicitud PAS",
          body: `${producerName} quiere sumarse como productor`,
          url: "/admin/productores",
          tag: `pas-${row.event_id}`,
        });
      } else if (ticketId) {
        await pushToAdmins(admin, "admin_push_cases", {
          title:
            row.event_type === "case.created"
              ? `Nueva consulta de ${producerName}`
              : `${producerName} escribió en #${ref}`,
          body: preview ? `${subject}: ${preview}` : subject,
          url: `/admin/consultas/${ticketId}`,
          tag: `admin-consulta-${ticketId}`,
        });
      }
    }
  }

  // Callable without a session (the portal kicks it after each message): report counts only.
  return json(req, {
    processed: results.length,
    sent: results.filter((r) => r.status === "sent").length,
    failed: results.filter((r) => r.status === "failed").length,
  });
});
