import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

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

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let raw = "";
  for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw).replace(/[+/=]/g, "A") + "Aa1!";
}

async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<User | null> {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.trim().toLowerCase() === target);
    if (match) return match;
    if (data.users.length < 200) break;
  }
  return null;
}

async function sendSetupEmail(params: {
  to: string;
  fullName: string;
  setupUrl: string;
}): Promise<{ sent: boolean; warning?: string }> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from =
    Deno.env.get("RESEND_FROM_EMAIL")?.trim() ||
    "Kipper Seguros <noreply@kipperseguros.com>";

  if (!resendKey) {
    return {
      sent: false,
      warning:
        "Cuenta creada, pero no hay proveedor de email configurado (RESEND_API_KEY). Pedile al productor que use Recuperar contraseña.",
    };
  }

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; color: #1a2332;">
      <h1 style="font-size: 22px; margin-bottom: 16px;">Kipper Seguros</h1>
      <p>Hola ${escapeHtml(params.fullName)},</p>
      <p>
        Te dimos acceso al Portal de Productores de Kipper Seguros.
        Elegí tu contraseña con este enlace (vence en unas horas):
      </p>
      <p style="margin: 28px 0;">
        <a href="${params.setupUrl}"
           style="background:#0f3d5c;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;">
          Crear mi contraseña
        </a>
      </p>
      <p style="font-size: 13px; color: #5a6570;">Si el botón no funciona, visitá: ${params.setupUrl}</p>
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
      subject: "Creá tu contraseña para el Portal de Productores Kipper",
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Resend error", res.status, text.slice(0, 300));
    return {
      sent: false,
      warning:
        "Cuenta creada, pero falló el envío del email. Pedile al productor que use Recuperar contraseña en el login.",
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
    const full_name = trimOrNull(body.full_name);
    const email = trimOrNull(body.email)?.toLowerCase();
    const phone = trimOrNull(body.phone);
    const matricula_ssn = trimOrNull(body.matricula_ssn);
    const city = trimOrNull(body.city);
    const province = trimOrNull(body.province);

    if (!full_name || !email) {
      return json({ error: "Completá nombre y email." }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Ingresá un email válido." }, 400);
    }

    const { data: existingApp } = await admin
      .from("producer_applications")
      .select("id, status")
      .eq("email", email)
      .maybeSingle();
    if (existingApp) {
      if (existingApp.status === "pending" || existingApp.status === "nuevo" || existingApp.status === "en_revision") {
        return json(
          { error: "Ya hay una solicitud pendiente para ese email. Aprobala desde la lista." },
          409,
        );
      }
      return json(
        { error: "Ya existe un productor con ese email. Si estaba eliminado, restaurá el acceso." },
        409,
      );
    }

    const existingUser = await findAuthUserByEmail(admin, email);
    if (existingUser) {
      return json(
        { error: "Ese email ya tiene una cuenta. Si se registró por Sumate, aprobá la solicitud." },
        409,
      );
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: randomPassword(),
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "No se pudo crear la cuenta." }, 400);
    }
    const userId = created.user.id;

    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        user_id: userId,
        email,
        full_name,
        phone,
        city,
        province,
        account_status: "active",
      },
      { onConflict: "user_id" },
    );
    if (profileErr) {
      console.error("profiles upsert", profileErr);
      return json({ error: "No se pudo crear el perfil." }, 500);
    }

    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: userId, role: "productor" });
    if (roleErr) {
      console.error("user_roles insert", roleErr);
      return json({ error: "No se pudo asignar el rol de productor." }, 500);
    }

    const now = new Date().toISOString();
    const { error: appErr } = await admin.from("producer_applications").insert({
      full_name,
      email,
      phone,
      matricula_ssn,
      city,
      province,
      status: "activo",
      user_id: userId,
      approved_at: now,
      approved_by: user.id,
      reviewed_at: now,
      reviewed_by: user.id,
      admin_notes: "Alta manual desde administración",
    });
    if (appErr) {
      console.error("producer_applications insert", appErr);
      return json({ error: "No se pudo registrar la solicitud del productor." }, 500);
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteUrl}/restablecer-contrasena` },
    });
    const setupUrl =
      (linkData as { properties?: { action_link?: string }; action_link?: string } | null)
        ?.properties?.action_link ??
      (linkData as { action_link?: string } | null)?.action_link ??
      null;
    if (linkErr || !setupUrl) {
      return json({
        ok: true,
        email_sent: false,
        message: "Productor creado, pero no se pudo generar el enlace de contraseña.",
        warning:
          "Pedile al productor que use Recuperar contraseña en el login.",
      });
    }

    const emailResult = await sendSetupEmail({
      to: email,
      fullName: full_name,
      setupUrl,
    });

    return json({
      ok: true,
      email_sent: emailResult.sent,
      warning: emailResult.warning ?? null,
      message: emailResult.sent
        ? "Productor creado. Le enviamos un email para elegir su contraseña."
        : "Productor creado.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno";
    console.error("create-pas-producer", message);
    return json({ error: message }, 500);
  }
});
