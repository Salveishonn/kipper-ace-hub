import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emailCode, emailParagraph, renderKipperEmail } from "../_shared/emailLayout.ts";
import { sendKipperEmail } from "../_shared/sendEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CODE_TTL_MS = 10 * 60 * 1000;
const VERIFY_TTL_MS = 12 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSessionIdFromJwt(token: string): string | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const padded = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const withPad = padded + "=".repeat((4 - (padded.length % 4)) % 4);
    const jsonPayload = atob(withPad);
    const payload = JSON.parse(jsonPayload) as { session_id?: string };
    return payload.session_id?.trim() || null;
  } catch {
    return null;
  }
}

function randomSixDigitCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => (b % 10).toString()).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function sendCodeEmail(params: {
  to: string;
  code: string;
}): Promise<{ sent: boolean; warning?: string }> {
  const subject = "Código de acceso a Administración Kipper";
  const footerNote = "Si no pediste este código, ignorá este email.";
  const html = renderKipperEmail({
    subject,
    preheader: "Tu código de seguridad vence en 10 minutos.",
    eyebrow: "Seguridad",
    headline: "Tu código de acceso",
    bodyHtml: `${emailParagraph("Tu código de seguridad para acceder a la administración es:")}
              ${emailCode(params.code)}
              ${emailParagraph("Vence en 10 minutos.")}`,
    footerNote,
  });

  const result = await sendKipperEmail({
    to: [params.to],
    subject,
    html,
    text: [
      "Tu código de seguridad para acceder a la administración es:",
      "",
      params.code,
      "",
      "Vence en 10 minutos.",
      footerNote,
    ].join("\n"),
  });

  if (result.notConfigured) {
    return {
      sent: false,
      warning: "No hay proveedor de email configurado (RESEND_API_KEY).",
    };
  }

  if (result.error) {
    console.error("Resend error", result.error);
    return { sent: false, warning: "No se pudo enviar el email con el código." };
  }

  return { sent: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "No autorizado" }, 401);
    }
    const accessToken = authHeader.slice("Bearer ".length);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user?.email) return json({ error: "No autorizado" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: adminRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) {
      return json({ error: "Acceso restringido a administradores" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as string | undefined;
    const sessionId = getSessionIdFromJwt(accessToken) ?? "";

    if (action === "send") {
      const { data: recent } = await admin
        .from("admin_mfa_challenges")
        .select("created_at")
        .eq("user_id", user.id)
        .is("consumed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recent?.created_at) {
        const elapsed = Date.now() - new Date(recent.created_at).getTime();
        if (elapsed < RESEND_COOLDOWN_MS) {
          const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
          return json(
            {
              error: "Esperá un momento antes de pedir otro código",
              retryAfterSeconds,
            },
            429,
          );
        }
      }

      await admin
        .from("admin_mfa_challenges")
        .update({ consumed_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("consumed_at", null);

      const code = randomSixDigitCode();
      const codeHash = await sha256Hex(`${code}:${user.id}`);
      const now = Date.now();

      const { error: insertErr } = await admin.from("admin_mfa_challenges").insert({
        user_id: user.id,
        session_id: sessionId,
        code_hash: codeHash,
        expires_at: new Date(now + CODE_TTL_MS).toISOString(),
        max_attempts: MAX_ATTEMPTS,
      });
      if (insertErr) {
        console.error("insert challenge", insertErr);
        return json({ error: "No se pudo generar el código" }, 500);
      }

      const emailResult = await sendCodeEmail({ to: user.email, code });
      if (!emailResult.sent) {
        return json(
          { error: emailResult.warning || "No se pudo enviar el código" },
          503,
        );
      }

      return json({ ok: true, email: user.email });
    }

    if (action === "verify") {
      const code = typeof body.code === "string" ? body.code.replace(/\s/g, "") : "";
      if (!/^\d{6}$/.test(code)) {
        return json({ error: "Ingresá el código de 6 dígitos" }, 400);
      }

      const { data: challenge } = await admin
        .from("admin_mfa_challenges")
        .select("id, code_hash, expires_at, attempts, max_attempts, consumed_at")
        .eq("user_id", user.id)
        .is("consumed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!challenge) {
        return json({ error: "Código incorrecto o vencido" }, 400);
      }
      if (new Date(challenge.expires_at).getTime() < Date.now()) {
        await admin
          .from("admin_mfa_challenges")
          .update({ consumed_at: new Date().toISOString() })
          .eq("id", challenge.id);
        return json({ error: "El código venció. Pedí uno nuevo." }, 400);
      }
      if (challenge.attempts >= challenge.max_attempts) {
        await admin
          .from("admin_mfa_challenges")
          .update({ consumed_at: new Date().toISOString() })
          .eq("id", challenge.id);
        return json({ error: "Demasiados intentos. Pedí un código nuevo." }, 400);
      }

      const expected = await sha256Hex(`${code}:${user.id}`);
      if (!timingSafeEqual(expected, challenge.code_hash)) {
        const nextAttempts = challenge.attempts + 1;
        await admin
          .from("admin_mfa_challenges")
          .update({
            attempts: nextAttempts,
            consumed_at:
              nextAttempts >= challenge.max_attempts ? new Date().toISOString() : null,
          })
          .eq("id", challenge.id);
        return json({ error: "Código incorrecto o vencido" }, 400);
      }

      await admin
        .from("admin_mfa_challenges")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", challenge.id);

      const expiresAt = new Date(Date.now() + VERIFY_TTL_MS).toISOString();
      const { error: upsertErr } = await admin.from("admin_mfa_verifications").upsert(
        {
          user_id: user.id,
          session_id: sessionId,
          verified_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: "user_id,session_id" },
      );

      if (upsertErr) {
        await admin
          .from("admin_mfa_verifications")
          .delete()
          .eq("user_id", user.id)
          .eq("session_id", sessionId);
        const { error: insertVerifyErr } = await admin.from("admin_mfa_verifications").insert({
          user_id: user.id,
          session_id: sessionId,
          expires_at: expiresAt,
        });
        if (insertVerifyErr) {
          console.error("insert verification", insertVerifyErr);
          return json({ error: "No se pudo completar la verificación" }, 500);
        }
      }

      return json({ ok: true });
    }

    return json({ error: "Acción no válida" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Error interno" }, 500);
  }
});
