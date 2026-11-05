// The one sender for every Kipper email. Supabase Auth's SMTP settings must use the same identity.
export const KIPPER_FROM = "Organización Kipper <notificaciones@kipperseguros.com>";
// kipperseguros.com has no inbox, so replies go to the operations mailbox.
export const KIPPER_REPLY_TO = "organizacionkipper@gmail.com";

export type SendEmailResult = {
  id?: string;
  error?: string;
  notConfigured?: boolean;
};

export async function sendKipperEmail(params: {
  to: string[];
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
}): Promise<SendEmailResult> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return { error: "RESEND_API_KEY no configurado", notConfigured: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      ...(params.idempotencyKey
        ? { "Idempotency-Key": params.idempotencyKey.slice(0, 256) }
        : {}),
    },
    body: JSON.stringify({
      from: KIPPER_FROM,
      reply_to: KIPPER_REPLY_TO,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: `Resend ${res.status}: ${JSON.stringify(body).slice(0, 280)}` };
  }
  return { id: typeof body?.id === "string" ? body.id : undefined };
}

export type BatchEmail = { to: string; subject: string; html: string; text: string };

/**
 * One email per recipient (nobody sees the others' addresses), up to 100 per Resend call.
 * Each chunk has its own idempotency key, so a retried event does not resend chunks that went out.
 */
export async function sendKipperEmailBatch(
  emails: BatchEmail[],
  idempotencyPrefix: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ sent: number; error?: string; notConfigured?: boolean }> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return { sent: 0, error: "RESEND_API_KEY no configurado", notConfigured: true };

  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100);
    const res = await fetchFn("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `${idempotencyPrefix}/${i / 100}`.slice(0, 256),
      },
      body: JSON.stringify(
        chunk.map((e) => ({
          from: KIPPER_FROM,
          reply_to: KIPPER_REPLY_TO,
          to: [e.to],
          subject: e.subject,
          html: e.html,
          text: e.text,
        })),
      ),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent, error: `Resend batch ${res.status}: ${body.slice(0, 280)}` };
    }
    sent += chunk.length;
  }
  return { sent };
}
