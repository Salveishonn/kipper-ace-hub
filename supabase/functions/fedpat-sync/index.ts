import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return ok({ error: "No autorizado", status: "error" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return ok({ error: "No autorizado", status: "error" });
    }

    const userId = user.id;

    // Check admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return ok({ error: "Acceso restringido a administradores", status: "error" });
    }

    if (!checkRateLimit(userId)) {
      return ok({ error: "Demasiadas solicitudes. Intentá de nuevo en un minuto.", status: "rate_limited" });
    }

    const body = await req.json();
    const { action, run_type } = body as { action: string; run_type?: string };

    const fedpatBaseUrl = Deno.env.get("FEDPAT_BASE_URL");
    const fedpatClientId = Deno.env.get("FEDPAT_CLIENT_ID");
    const fedpatClientSecret = Deno.env.get("FEDPAT_CLIENT_SECRET");
    const fedpatMode = Deno.env.get("FEDPAT_MODE") || "mock";
    const isConfigured = !!(fedpatBaseUrl && fedpatClientId && fedpatClientSecret);

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // --- check-status ---
    if (action === "check-status") {
      const { data: lastToken } = await adminClient
        .from("integration_tokens")
        .select("*")
        .eq("provider", "fedpat")
        .single();

      const { data: lastRuns } = await adminClient
        .from("integration_runs")
        .select("*")
        .eq("provider", "fedpat")
        .order("started_at", { ascending: false })
        .limit(10);

      return ok({
        status: "ok",
        configured: isConfigured,
        mode: fedpatMode,
        last_token_refresh: lastToken?.refreshed_at || null,
        last_runs: lastRuns || [],
      });
    }

    // --- test-token ---
    if (action === "test-token") {
      const mockToken = {
        provider: "fedpat",
        access_token: "mock_token",
        token_type: "bearer",
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
        refreshed_at: new Date().toISOString(),
      };

      await adminClient
        .from("integration_tokens")
        .upsert(mockToken, { onConflict: "provider" });

      await adminClient.from("audit_logs").insert({
        actor_user_id: userId,
        actor_role: "admin",
        action: "integration.token_refreshed",
        entity_type: "integration",
        entity_id: null,
        metadata: { provider: "fedpat", mock: true },
      });

      return ok({
        status: "ok",
        message: "Token de prueba generado correctamente",
      });
    }

    // --- sync ---
    if (action === "sync") {
      const validTypes = ["policies", "installments", "documents", "claims"];
      if (!run_type || !validTypes.includes(run_type)) {
        return ok({ status: "error", error: `run_type debe ser uno de: ${validTypes.join(", ")}` });
      }

      if (!isConfigured && fedpatMode !== "mock") {
        return ok({
          status: "not_configured",
          message: "Credenciales no configuradas. Configurá FEDPAT_BASE_URL, FEDPAT_CLIENT_ID y FEDPAT_CLIENT_SECRET, o usá FEDPAT_MODE=mock para simular.",
        });
      }

      // Create integration run
      const { data: run } = await adminClient
        .from("integration_runs")
        .insert({
          provider: "fedpat",
          run_type,
          status: "started",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      await adminClient.from("audit_logs").insert({
        actor_user_id: userId,
        actor_role: "admin",
        action: "integration.sync_started",
        entity_type: "integration",
        entity_id: run?.id || null,
        metadata: { provider: "fedpat", run_type, mode: fedpatMode },
      });

      try {
        if (fedpatMode === "mock") {
          await runMockSync(adminClient, run_type, userId);
        } else {
          // TODO: Real FedPat API calls go here
        }

        if (run) {
          await adminClient
            .from("integration_runs")
            .update({
              status: "success",
              finished_at: new Date().toISOString(),
              metadata: { provider: "fedpat", run_type, mode: fedpatMode },
            })
            .eq("id", run.id);
        }

        await adminClient.from("audit_logs").insert({
          actor_user_id: userId,
          actor_role: "admin",
          action: "integration.sync_finished",
          entity_type: "integration",
          entity_id: run?.id || null,
          metadata: { provider: "fedpat", run_type, status: "success", mode: fedpatMode },
        });

        return ok({
          status: "ok",
          message: `Sincronización de ${run_type} completada (${fedpatMode}).`,
          run_id: run?.id,
          mode: fedpatMode,
        });
      } catch (syncErr: any) {
        if (run) {
          await adminClient
            .from("integration_runs")
            .update({
              status: "error",
              finished_at: new Date().toISOString(),
              error_message: syncErr.message || "Error desconocido",
            })
            .eq("id", run.id);
        }

        await adminClient.from("audit_logs").insert({
          actor_user_id: userId,
          actor_role: "admin",
          action: "integration.sync_failed",
          entity_type: "integration",
          entity_id: run?.id || null,
          metadata: { provider: "fedpat", run_type, error: syncErr.message },
        });

        return ok({
          status: "error",
          message: `Error en sincronización de ${run_type}: ${syncErr.message}`,
          run_id: run?.id,
        });
      }
    }

    return ok({ status: "error", error: "Acción no reconocida. Usá: check-status, test-token, sync" });
  } catch (err) {
    console.error("FedPat sync error:", err);
    return ok({ status: "error", error: "Error interno del servidor" });
  }
});

// Mock sync: generates fake data for testing
async function runMockSync(adminClient: any, runType: string, userId: string) {
  const now = new Date().toISOString();

  if (runType === "policies") {
    const mockPolicies = Array.from({ length: 3 }, (_, i) => ({
      policy_number: `FP-MOCK-${Date.now()}-${i + 1}`,
      policy_type: ["auto", "moto", "hogar"][i % 3],
      coverage_type: ["terceros_completo", "todo_riesgo", "basica"][i % 3],
      status: "activa",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      premium_amount: [15000, 8500, 22000][i % 3],
      external_source: "fedpat",
      external_policy_id: `FEDPAT-POL-${Date.now()}-${i}`,
      sync_status: "synced",
      last_synced_at: now,
      payment_frequency: "mensual",
    }));

    const { error } = await adminClient.from("policies").insert(mockPolicies);
    if (error) throw error;
  }

  if (runType === "installments") {
    // Get recent mock policies to attach installments
    const { data: policies } = await adminClient
      .from("policies")
      .select("id")
      .eq("external_source", "fedpat")
      .order("created_at", { ascending: false })
      .limit(3);

    if (policies?.length) {
      const installments = policies.flatMap((p: any) =>
        Array.from({ length: 6 }, (_, i) => ({
          policy_id: p.id,
          installment_number: i + 1,
          amount: 2500 + Math.floor(Math.random() * 1000),
          due_date: new Date(Date.now() + i * 30 * 86400000).toISOString().split("T")[0],
          status: i === 0 ? "pagada" : "pendiente",
          external_installment_id: `FEDPAT-INST-${p.id}-${i}`,
          last_synced_at: now,
        }))
      );
      const { error } = await adminClient.from("installments").insert(installments);
      if (error) throw error;
    }
  }

  if (runType === "documents") {
    // Stub: no document storage table yet, just log it
    await adminClient.from("audit_logs").insert({
      actor_user_id: userId,
      actor_role: "admin",
      action: "integration.mock_documents_synced",
      entity_type: "integration",
      metadata: { provider: "fedpat", count: 5, mock: true },
    });
  }

  if (runType === "claims") {
    const { data: policies } = await adminClient
      .from("policies")
      .select("id")
      .eq("external_source", "fedpat")
      .order("created_at", { ascending: false })
      .limit(1);

    if (policies?.length) {
      const { error } = await adminClient.from("claims").insert({
        policy_id: policies[0].id,
        claim_number: `FP-SIN-MOCK-${Date.now()}`,
        status: "recibido",
        description: "Siniestro simulado - colisión trasera en estacionamiento",
        incident_date: new Date().toISOString().split("T")[0],
        external_claim_id: `FEDPAT-CLM-${Date.now()}`,
        last_synced_at: now,
      });
      if (error) throw error;
    }
  }
}
