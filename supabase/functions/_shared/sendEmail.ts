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
