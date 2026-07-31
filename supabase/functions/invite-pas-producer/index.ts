import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

const INVITE_TTL_DAYS = 7;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getValidatedSiteUrl(): string {
  const raw = Deno.env.get("SITE_URL");
  if (!raw?.trim()) {
    throw new Error("SITE_URL no configurado en secrets de la Edge Function");
  }
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("SITE_URL inválido");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("SITE_URL debe usar http o https");
  }
  return parsed.origin.replace(/\/$/, "");
}

async function assertCallerIsAdmin(
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
): Promise<void> {
  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error || !data) {
    throw new Error("FORBIDDEN");
  }
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

function isAlreadyRegisteredError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("already") || m.includes("registered") || m.includes("exists");
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

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "No autorizado" }, 401);

    try {
      await assertCallerIsAdmin(supabaseUrl, serviceKey, user.id);
    } catch {
      return json({ error: "Acceso restringido a administradores" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const applicationId = body.application_id as string | undefined;
    const resend = Boolean(body.resend);

    if (!applicationId || typeof applicationId !== "string") {
      return json({ error: "application_id requerido" }, 400);
    }

    const siteUrl = getValidatedSiteUrl();
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: app, error: appErr } = await admin
      .from("producer_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appErr || !app) {
      return json({ error: "Solicitud no encontrada" }, 404);
    }

    if (app.status === "activo" && app.user_id) {
      return json({ error: "Este productor ya tiene cuenta activa" }, 409);
    }

    if (app.status === "rechazado") {
      return json({ error: "La solicitud fue rechazada" }, 400);
    }

    const allowedInvite = ["nuevo", "en_revision", "invitado"];
    if (!allowedInvite.includes(app.status)) {
      return json({ error: "Estado de solicitud no válido para invitar" }, 400);
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

    if (app.status === "invitado" && app.invite_expires_at && !resend) {
      const exp = new Date(app.invite_expires_at);
      if (exp > now) {
        return json(
          {
            error:
              "Ya hay una invitación vigente. Usá reenviar si expiró o querés un nuevo enlace.",
          },
          409,
        );
      }
    }

    let existingUser: User | null = null;
    if (app.user_id) {
      const { data: byId } = await admin.auth.admin.getUserById(app.user_id);
      existingUser = byId.user ?? null;
    }
    if (!existingUser) {
      existingUser = await findAuthUserByEmail(admin, app.email);
    }

    if (existingUser?.email_confirmed_at) {
      return json({ error: "Este email ya tiene una cuenta confirmada" }, 409);
    }

    const inviteExpired =
      !app.invite_expires_at || new Date(app.invite_expires_at) <= now;

    if (resend && existingUser && !existingUser.email_confirmed_at && inviteExpired) {
      await admin.auth.admin.deleteUser(existingUser.id);
      existingUser = null;
      await admin
        .from("producer_applications")
        .update({ user_id: null })
        .eq("id", applicationId);
    }

    const { error: preUpdateErr } = await admin
      .from("producer_applications")
      .update({
        status: "invitado",
        reviewed_by: user.id,
        reviewed_at: now.toISOString(),
        invited_at: now.toISOString(),
        invite_expires_at: expiresAt.toISOString(),
      })
      .eq("id", applicationId);

    if (preUpdateErr) {
      console.error(preUpdateErr);
      return json({ error: "No se pudo actualizar la solicitud" }, 500);
    }

    const redirectTo = `${siteUrl}/registro`;
    const inviteMetadata = {
      application_id: applicationId,
      full_name: app.full_name,
    };

    if (resend && existingUser && !existingUser.email_confirmed_at && !inviteExpired) {
      await admin.auth.admin.updateUserById(existingUser.id, {
        user_metadata: inviteMetadata,
      });
      return json({
        ok: true,
        email: app.email,
        user_id: existingUser.id,
        invite_expires_at: expiresAt.toISOString(),
        redirect_to: redirectTo,
        resent: true,
        message:
          "Invitación vigente: actualizamos metadata. El enlace anterior sigue siendo válido hasta su expiración.",
      });
    }

    const { data: inviteData, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(app.email, {
        redirectTo,
        data: inviteMetadata,
      });

    if (inviteErr) {
      if (
        resend &&
        existingUser &&
        !existingUser.email_confirmed_at &&
        isAlreadyRegisteredError(inviteErr.message)
      ) {
        await admin.auth.admin.updateUserById(existingUser.id, {
          user_metadata: inviteMetadata,
        });
        await admin
          .from("producer_applications")
          .update({ user_id: existingUser.id })
          .eq("id", applicationId);

        return json({
          ok: true,
          email: app.email,
          user_id: existingUser.id,
          invite_expires_at: expiresAt.toISOString(),
          redirect_to: redirectTo,
          resent: true,
          message:
            "Usuario invitado ya existía sin confirmar. Metadata actualizada; estado invitado mantenido.",
        });
      }

      console.error("inviteUserByEmail", inviteErr);
      await admin
        .from("producer_applications")
        .update({
          status: "en_revision",
          admin_notes: `Fallo envío invitación: ${inviteErr.message}`.slice(0, 500),
        })
        .eq("id", applicationId);
      return json({ error: inviteErr.message }, 400);
    }

    await admin
      .from("producer_applications")
      .update({
        user_id: inviteData.user?.id ?? existingUser?.id ?? app.user_id,
      })
      .eq("id", applicationId);

    return json({
      ok: true,
      email: app.email,
      invite_expires_at: expiresAt.toISOString(),
      redirect_to: redirectTo,
      user_id: inviteData.user?.id ?? null,
      message:
        "Invitación enviada. El productor se activará al confirmar la invitación (email confirmado).",
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
