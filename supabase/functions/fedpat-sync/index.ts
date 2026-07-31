// Federación Patronal sync — server-side only.
// SECURITY:
// - Admin-only.
// - Never returns access_token to frontend.
// - CORS restricted to allowed origins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, isOriginAllowed, ok, err, getMode, isConfigured, writeAudit, startRun, finishRun } from "./utils.ts";
import { fetchOAuthToken, generateMockToken, getCachedToken, upsertToken } from "./auth.ts";
import { syncPolicies } from "./syncPolicies.ts";
import { syncInstallments } from "./syncInstallments.ts";
import { syncDocuments } from "./syncDocuments.ts";
import { syncClaims } from "./syncClaims.ts";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const e = rateLimitMap.get(key);
  if (!e || now > e.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (e.count >= RATE_LIMIT) return false;
  e.count++;
  return true;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const cors = buildCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  if (!isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ status: "error", error: "Origen no permitido" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return err("No autorizado", cors, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return err("No autorizado", cors, 401);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (!roles?.length) return err("Acceso restringido a administradores", cors, 403);

    if (!checkRateLimit(user.id)) return err("Demasiadas solicitudes. Intentá en un minuto.", cors, 429);

    const body = await req.json().catch(() => ({}));
    const action = (body as any).action as string;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const mode = getMode();
    const configured = isConfigured();

    // ------- check-status -------
    if (action === "check-status") {
      const tokenRow = await getCachedToken(adminClient);
      const { data: lastRuns } = await adminClient
        .from("integration_runs")
        .select("id, run_type, status, started_at, finished_at, error_message, metadata")
        .eq("provider", "fedpat")
        .order("started_at", { ascending: false })
        .limit(20);

      const { data: pending } = await adminClient
        .from("external_identity_matches")
        .select("id")
        .eq("status", "needs_review");

      return ok(
        {
          status: "ok",
          provider: "fedpat",
          mode,
          configured,
          // Never expose access_token. Only metadata.
          last_token_refresh: tokenRow?.refreshed_at ?? null,
          token_expires_at: tokenRow?.expires_at ?? null,
          last_runs: lastRuns ?? [],
          pending_matches: pending?.length ?? 0,
        },
        cors
      );
    }

    // ------- test-token -------
    if (action === "test-token") {
      if (mode === "mock") {
        const t = generateMockToken();
        await upsertToken(adminClient, t);
        await writeAudit(adminClient, {
          actor_user_id: user.id,
          action: "fedpat.token_refreshed",
          entity_type: "integration",
          metadata: { mode, mock: true },
        });
        return ok({ status: "ok", message: "Token mock generado correctamente.", mode }, cors);
      }
      if (!configured) {
        return ok(
          { status: "not_configured", message: "Credenciales de Federación Patronal no configuradas" },
          cors
        );
      }
      const t = await fetchOAuthToken();
      if (!t) {
        return ok(
          { status: "not_configured", message: "Endpoint OAuth FedPat aún no implementado (esperando documentación oficial)" },
          cors
        );
      }
      await upsertToken(adminClient, t);
      await writeAudit(adminClient, {
        actor_user_id: user.id,
        action: "fedpat.connection_tested",
        entity_type: "integration",
        metadata: { mode },
      });
      return ok({ status: "ok", message: "Conexión OK. Token actualizado.", mode }, cors);
    }

    // ------- sync actions -------
    const syncMap: Record<string, "policies" | "installments" | "documents" | "claims" | "full"> = {
      "sync-policies": "policies",
      "sync-installments": "installments",
      "sync-documents": "documents",
      "sync-claims": "claims",
      "sync-full": "full",
      // backwards-compat with previous body shape { action: 'sync', run_type }
      sync: ((body as any).run_type as any) ?? "policies",
    };

    if (action in syncMap) {
      const runType = syncMap[action];

      if (mode !== "mock" && !configured) {
        return ok(
          { status: "not_configured", message: "Credenciales de Federación Patronal no configuradas" },
          cors
        );
      }

      const run = await startRun(adminClient, runType, user.id);
      await writeAudit(adminClient, {
        actor_user_id: user.id,
        action: "fedpat.sync_started",
        entity_type: "integration",
        entity_id: run?.id,
        metadata: { run_type: runType, mode },
      });

      try {
        const tokenRow = mode === "mock" ? null : await getCachedToken(adminClient);
        const token = tokenRow?.access_token ?? null;

        const results: Record<string, number> = {};
        if (runType === "policies" || runType === "full")
          results.policies = (await syncPolicies(adminClient, user.id, mode, token)).inserted;
        if (runType === "installments" || runType === "full")
          results.installments = (await syncInstallments(adminClient, user.id, mode)).inserted;
        if (runType === "documents" || runType === "full")
          results.documents = (await syncDocuments(adminClient, user.id, mode)).inserted;
        if (runType === "claims" || runType === "full")
          results.claims = (await syncClaims(adminClient, user.id, mode)).inserted;

        await finishRun(adminClient, run!.id, "success", { mode, results });
        await writeAudit(adminClient, {
          actor_user_id: user.id,
          action: "fedpat.sync_success",
          entity_type: "integration",
          entity_id: run?.id,
          metadata: { run_type: runType, mode, results },
        });

        return ok(
          { status: "ok", message: `Sincronización (${runType}) completada (${mode}).`, run_id: run?.id, mode, results },
          cors
        );
      } catch (e: any) {
        const msg = e?.message || "Error desconocido";
        await finishRun(adminClient, run!.id, "error", { mode }, msg);
        await writeAudit(adminClient, {
          actor_user_id: user.id,
          action: "fedpat.sync_failed",
          entity_type: "integration",
          entity_id: run?.id,
          metadata: { run_type: runType, mode, error: msg },
        });
        return ok({ status: "error", message: `Error en sincronización (${runType}): ${msg}`, run_id: run?.id }, cors);
      }
    }

    return err("Acción no reconocida. Usá: check-status, test-token, sync-policies, sync-installments, sync-documents, sync-claims, sync-full", cors, 400);
  } catch (e) {
    console.error("fedpat-sync error", e);
    return err("Error interno del servidor", cors, 500);
  }
});
