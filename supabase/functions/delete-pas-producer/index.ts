import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json(req, { error: "Método no permitido" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(req, { error: "No autorizado" }, 401);
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
    if (userErr || !user) return json(req, { error: "No autorizado" }, 401);

    const { data: adminSession, error: mfaErr } = await userClient.rpc("is_admin_session");
    if (mfaErr || adminSession !== true) {
      return json(req, { error: "Acceso restringido a administradores" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const applicationId = body.application_id as string | undefined;
    if (!applicationId || typeof applicationId !== "string") {
      return json(req, { error: "application_id requerido" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: app, error: appErr } = await admin
      .from("producer_applications")
      .select("id, status, user_id")
      .eq("id", applicationId)
      .maybeSingle();
    if (appErr) {
      console.error("application lookup", appErr.message);
      return json(req, { error: "No se pudo eliminar el productor" }, 500);
    }
    if (!app) return json(req, { error: "Solicitud no encontrada" }, 404);

    const userId: string | null = app.user_id;
    let accountStatus: string | null = null;
    let roles: string[] = [];

    if (userId) {
      if (userId === user.id) {
        return json(req, { error: "No podés eliminar tu propia cuenta" }, 403);
      }
      const [{ data: profile }, { data: roleRows, error: rolesErr }] = await Promise.all([
        admin.from("profiles").select("account_status").eq("user_id", userId).maybeSingle(),
        admin.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (rolesErr) {
        console.error("roles lookup", rolesErr.message);
        return json(req, { error: "No se pudo eliminar el productor" }, 500);
      }
      accountStatus = profile?.account_status ?? null;
      roles = (roleRows ?? []).map((row) => String(row.role));
    }

    if (roles.includes("admin")) {
      return json(req, { error: "No se puede eliminar una cuenta de administrador" }, 403);
    }

    // Only access that was already removed: an active producer must go through Eliminar first.
    const eligible =
      (app.status === "activo" && (!userId || accountStatus === "suspended")) ||
      (app.status === "rechazado" && !roles.includes("productor"));
    if (!eligible) {
      return json(
        req,
        { error: "Primero eliminá el acceso del productor. Solo se borran definitivamente los eliminados o rechazados." },
        409,
      );
    }

    const warnings: string[] = [];

    if (userId) {
      // Read before deleting the user: their tickets and messages cascade away with the account.
      const { data: tickets } = await admin
        .from("support_tickets")
        .select("id")
        .eq("producer_id", userId);
      const ticketIds = (tickets ?? []).map((ticket) => ticket.id);
      const { data: attachments } = ticketIds.length
        ? await admin
            .from("support_messages")
            .select("attachment_path")
            .in("ticket_id", ticketIds)
            .not("attachment_path", "is", null)
        : { data: [] };
      const { data: avatars } = await admin.storage.from("avatars").list(userId);

      const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
      // A 404 means the account is already gone, so only the leftovers remain to clean up.
      if (deleteErr && deleteErr.status !== 404) {
        console.error("deleteUser", deleteErr.message);
        return json(req, { error: "No se pudo eliminar la cuenta del productor" }, 500);
      }

      const attachmentPaths = (attachments ?? [])
        .map((row) => row.attachment_path)
        .filter((path): path is string => Boolean(path));
      if (attachmentPaths.length) {
        const { error } = await admin.storage.from("consulta-attachments").remove(attachmentPaths);
        if (error) {
          console.error("attachments cleanup", error.message);
          warnings.push("adjuntos de consultas");
        }
      }
      const avatarPaths = (avatars ?? []).map((file) => `${userId}/${file.name}`);
      if (avatarPaths.length) {
        const { error } = await admin.storage.from("avatars").remove(avatarPaths);
        if (error) {
          console.error("avatar cleanup", error.message);
          warnings.push("foto de perfil");
        }
      }

      await admin.from("notification_outbox").delete().eq("payload->>producer_id", userId);
    }

    await admin
      .from("notification_outbox")
      .delete()
      .eq("event_type", "pas.application.created")
      .eq("event_id", applicationId);

    const { error: appDeleteErr } = await admin
      .from("producer_applications")
      .delete()
      .eq("id", applicationId);
    if (appDeleteErr) {
      console.error("application delete", appDeleteErr.message);
      return json(req, { error: "No se pudo borrar la solicitud del productor" }, 500);
    }

    return json(req, {
      ok: true,
      warning: warnings.length ? `No se pudieron borrar: ${warnings.join(", ")}.` : null,
    });
  } catch (e) {
    console.error(e);
    return json(req, { error: "Error interno" }, 500);
  }
});
