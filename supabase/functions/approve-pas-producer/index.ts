import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

async function sendApprovalEmail(params: {
  to: string;
  fullName: string;
  loginUrl: string;
}): Promise<{ sent: boolean; warning?: string }> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from =
    Deno.env.get("RESEND_FROM_EMAIL")?.trim() ||
    "Kipper Seguros <noreply@kipperseguros.com>";

  if (!resendKey) {
    return {
      sent: false,
      warning:
        "Acceso aprobado, pero no hay proveedor de email configurado (RESEND_API_KEY). Configurá Resend para notificar al productor.",
    };
  }

  const subject = "Tu acceso como Productor Kipper fue aprobado";
  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; color: #1a2332;">
      <h1 style="font-size: 22px; margin-bottom: 16px;">Kipper Seguros</h1>
      <p>Hola ${escapeHtml(params.fullName)},</p>
      <p>
        Aprobamos tu solicitud para acceder al Portal de Productores de Kipper Seguros.
        Ya podés ingresar con el email y la contraseña que elegiste al registrarte.
      </p>
      <p style="margin: 28px 0;">
        <a href="${params.loginUrl}"
           style="background:#0f3d5c;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;">
          Ingresar al Portal
        </a>
      </p>
      <p style="font-size: 13px; color: #5a6570;">Si el botón no funciona, visitá: ${params.loginUrl}</p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Resend error", res.status, text.slice(0, 300));
    return {
      sent: false,
      warning:
        "Acceso aprobado, pero falló el envío del email de notificación. El productor ya puede ingresar con su contraseña.",
    };
  }

  return { sent: true };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

    const emailResult = await sendApprovalEmail({
      to: result.email || app.email,
      fullName: result.full_name || app.full_name || "Productor",
      loginUrl: `${siteUrl}/login`,
    });

    return json({
      ok: true,
      application_id: applicationId,
      user_id: result.user_id || app.user_id,
      status: "activo",
      idempotent: Boolean(result.idempotent),
      email_verified: emailVerified,
      email_notification_sent: emailResult.sent,
      warning: emailResult.warning ?? null,
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
