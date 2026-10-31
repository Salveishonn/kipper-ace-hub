import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendKipperEmail } from "../_shared/sendEmail.ts";
import { buildWelcomeEmail } from "../_shared/welcomeEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getValidatedSiteUrl(): string {
  const raw = Deno.env.get("SITE_URL");
  if (!raw?.trim()) {
    throw new Error("SITE_URL no configurado en secrets de la Edge Function");
  }
  const parsed = new URL(raw.trim());
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("SITE_URL debe usar http o https");
  }
  return parsed.origin.replace(/\/$/, "");
}

async function sendWelcomeEmail(params: {
  applicationId: string;
  to: string;
  fullName: string;
  siteUrl: string;
  emailVerified: boolean;
}): Promise<{ sent: boolean; warning?: string }> {
  const { subject, html, text } = buildWelcomeEmail({
    fullName: params.fullName,
    email: params.to,
    siteUrl: params.siteUrl,
    emailVerified: params.emailVerified,
  });

  const result = await sendKipperEmail({
    to: [params.to],
    subject,
    html,
    text,
    idempotencyKey: `pas-welcome/${params.applicationId}`,
  });

  if (result.notConfigured) {
    return {
      sent: false,
      warning:
        "Acceso aprobado, pero no hay proveedor de email configurado (RESEND_API_KEY). Configurá Resend para notificar al productor.",
    };
  }

  if (result.error) {
    console.error("Resend error", result.error);
    return {
      sent: false,
      warning:
        "Acceso aprobado, pero falló el envío del email de notificación. El productor ya puede ingresar con su contraseña.",
    };
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const siteUrl = getValidatedSiteUrl();

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "No autorizado" }, 401);

    const { data: adminSession, error: mfaErr } = await userClient.rpc("is_admin_session");
    if (mfaErr || adminSession !== true) {
      return json({ error: "Acceso restringido a administradores" }, 403);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const applicationId = body.application_id as string | undefined;
    if (!applicationId || typeof applicationId !== "string") {
      return json({ error: "application_id requerido" }, 400);
    }

    const { data: app, error: appErr } = await admin
      .from("producer_applications")
      .select("id, email, full_name, status, user_id")
      .eq("id", applicationId)
      .single();

    if (appErr || !app) {
      return json({ error: "Solicitud no encontrada" }, 404);
    }

    if (!app.user_id) {
      return json(
        {
          error:
            "Esta solicitud no tiene cuenta Auth vinculada (flujo legacy). Usá la acción de invitación legacy o pedile al productor que se registre nuevamente desde Sumate.",
          legacy: true,
        },
        400,
      );
    }

    const { data: authUser } = await admin.auth.admin.getUserById(app.user_id);
    const emailVerified = Boolean(authUser.user?.email_confirmed_at);

    const { data: rpcResult, error: rpcErr } = await admin.rpc(
      "approve_pas_application",
      {
        p_application_id: applicationId,
        p_admin_user_id: user.id,
      },
    );

    if (rpcErr) {
      const msg = rpcErr.message || "";
      if (msg.includes("FORBIDDEN")) return json({ error: "Acceso denegado" }, 403);
      if (msg.includes("NOT_FOUND")) return json({ error: "Solicitud no encontrada" }, 404);
      if (msg.includes("REJECTED")) {
        return json({ error: "La solicitud fue rechazada" }, 400);
      }
      if (msg.includes("NO_AUTH_USER")) {
        return json({ error: "La solicitud no tiene usuario Auth vinculado" }, 400);
      }
      if (msg.includes("INVALID_STATUS")) {
        return json({ error: "Estado de solicitud no válido para aprobar" }, 400);
      }
      if (msg.includes("account_status") || msg.includes("FORBIDDEN_ACCOUNT_STATUS")) {
        return json({ error: "No se pudo actualizar el estado de la cuenta" }, 500);
      }
      console.error("approve_pas_application", rpcErr);
      return json({ error: "No se pudo aprobar la solicitud" }, 500);
    }

    const result = rpcResult as {
      ok?: boolean;
      idempotent?: boolean;
      full_name?: string;
      email?: string;
      user_id?: string;
      status?: string;
    };

    // Re-approving an active producer must not send a second welcome.
    const emailResult: { sent: boolean; warning?: string } = result.idempotent
      ? { sent: false }
      : await sendWelcomeEmail({
          applicationId,
          to: result.email || app.email,
          fullName: result.full_name || app.full_name || "",
          siteUrl,
          emailVerified,
        });

    return json({
      ok: true,
      application_id: applicationId,
      user_id: result.user_id || app.user_id,
      status: "activo",
      idempotent: Boolean(result.idempotent),
      email_verified: emailVerified,
      email_notification_sent: emailResult.sent,
      warning:
        emailResult.warning ??
        (emailVerified
          ? null
          : "Acceso aprobado, pero el productor todavía no verificó su email: al ingresar se le va a pedir que lo verifique."),
      message: result.idempotent
        ? "El productor ya estaba activo."
        : "Acceso aprobado. El productor ya puede ingresar al portal.",
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Error interno";
    if (msg.includes("SITE_URL")) {
      return json({ error: msg }, 503);
    }
    return json({ error: "Error interno" }, 500);
  }
});
