import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limiter (MVP - TODO: move to Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

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

// Retry/backoff placeholder (TODO: implement real retries when API is live)
async function withRetry<T>(
  fn: () => Promise<T>,
  _maxRetries = 3,
  _baseDelay = 1000
): Promise<T> {
  // For now, just call once - real retry logic when FedPat API is connected
  return fn();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub as string;

    // Check admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Acceso restringido a administradores" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit check
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: "Demasiadas solicitudes. Intentá de nuevo en un minuto." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const body = await req.json();
    const { action, run_type } = body as { action: string; run_type?: string };

    // Check FedPat credentials
    const fedpatBaseUrl = Deno.env.get("FEDPAT_BASE_URL");
    const fedpatClientId = Deno.env.get("FEDPAT_CLIENT_ID");
    const fedpatClientSecret = Deno.env.get("FEDPAT_CLIENT_SECRET");

    const isConfigured = !!(fedpatBaseUrl && fedpatClientId && fedpatClientSecret);

    // Use service role for DB writes
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // --- ACTION: check-status ---
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

      return new Response(
        JSON.stringify({
          configured: isConfigured,
          last_token_refresh: lastToken?.refreshed_at || null,
          last_runs: lastRuns || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- ACTION: test-token ---
    if (action === "test-token") {
      if (!isConfigured) {
        return new Response(
          JSON.stringify({
            error: "Integración no configurada",
            message: "Las credenciales de Federación Patronal no están configuradas. Contactá al equipo técnico para agregar FEDPAT_BASE_URL, FEDPAT_CLIENT_ID y FEDPAT_CLIENT_SECRET.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // TODO: Real OAuth2 token exchange when API is live
      // For now, simulate a successful token fetch
      const mockToken = {
        provider: "fedpat",
        access_token: "mock_token_placeholder_" + Date.now(),
        token_type: "bearer",
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
        refreshed_at: new Date().toISOString(),
      };

      await adminClient
        .from("integration_tokens")
        .upsert(mockToken, { onConflict: "provider" });

      // Audit log
      await adminClient.from("audit_logs").insert({
        actor_user_id: userId,
        actor_role: "admin",
        action: "integration.token_refreshed",
        entity_type: "integration",
        entity_id: null,
        metadata: { provider: "fedpat", mock: true },
      });

      return new Response(
        JSON.stringify({ success: true, message: "Token de prueba generado (mock)", token: mockToken }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- ACTION: sync ---
    if (action === "sync") {
      const validTypes = ["policies", "installments", "documents", "claims"];
      if (!run_type || !validTypes.includes(run_type)) {
        return new Response(
          JSON.stringify({ error: `run_type debe ser uno de: ${validTypes.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!isConfigured) {
        return new Response(
          JSON.stringify({
            error: "Integración no configurada",
            message: "Configurá las credenciales de FedPat antes de sincronizar.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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

      // Audit log: sync started
      await adminClient.from("audit_logs").insert({
        actor_user_id: userId,
        actor_role: "admin",
        action: `integration.sync_started`,
        entity_type: "integration",
        entity_id: run?.id || null,
        metadata: { provider: "fedpat", run_type },
      });

      // TODO: Real FedPat API call with withRetry()
      // For now, simulate success after a brief delay
      // In production this would call:
      // const result = await withRetry(() => fetchFromFedPat(run_type));

      // Mark run as success (stub)
      if (run) {
        await adminClient
          .from("integration_runs")
          .update({
            status: "success",
            finished_at: new Date().toISOString(),
            metadata: { provider: "fedpat", run_type, mock: true, message: "Stub sync - no real API call" },
          })
          .eq("id", run.id);
      }

      // Audit log: sync finished
      await adminClient.from("audit_logs").insert({
        actor_user_id: userId,
        actor_role: "admin",
        action: `integration.sync_finished`,
        entity_type: "integration",
        entity_id: run?.id || null,
        metadata: { provider: "fedpat", run_type, status: "success", mock: true },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `Sincronización de ${run_type} completada (stub). Cuando se conecte la API real, los datos se actualizarán automáticamente.`,
          run_id: run?.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Acción no reconocida. Usá: check-status, test-token, sync" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Never leak secrets in error messages
    console.error("FedPat sync error:", err);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
