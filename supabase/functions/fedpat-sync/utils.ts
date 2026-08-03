// Server-side only. Never import from frontend.
const ALLOWED_ORIGINS = [
  "https://kipperseguros.com",
  "https://www.kipperseguros.com",
  "https://kipperseguros.com.ar",
  "https://www.kipperseguros.com.ar",
  "https://app.kipperseguros.com.ar",
  "https://kipperseguros.info",
  "https://kipper-ace-hub.vercel.app",
  // Legacy Lovable hosts kept during cutover rollback window
  "https://kipper-ace-hub.lovable.app",
  "https://id-preview--4cdc6eb5-eca8-4412-9273-dc0ba6d8d8c5.lovable.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // server-to-server / curl
  return (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".vercel.app") ||
    origin.endsWith(".lovable.app") ||
    origin.endsWith(".lovableproject.com")
  );
}

export function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = Boolean(origin && isAllowedOrigin(origin));
  return {
    "Access-Control-Allow-Origin": allowed ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function isOriginAllowed(origin: string | null): boolean {
  return isAllowedOrigin(origin);
}

export function ok(data: unknown, cors: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export function err(message: string, cors: Record<string, string>, status = 400) {
  // Sanitize: never include stack traces or secrets
  return new Response(JSON.stringify({ status: "error", error: message }), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export function getMode(): "mock" | "sandbox" | "production" {
  const m = (Deno.env.get("FEDPAT_MODE") || "mock").toLowerCase();
  if (m === "sandbox" || m === "production") return m;
  return "mock";
}

export function isConfigured(): boolean {
  return !!(
    Deno.env.get("FEDPAT_BASE_URL") &&
    Deno.env.get("FEDPAT_CLIENT_ID") &&
    Deno.env.get("FEDPAT_CLIENT_SECRET")
  );
}

export async function writeAudit(
  adminClient: any,
  params: {
    actor_user_id: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  await adminClient.from("audit_logs").insert({
    actor_user_id: params.actor_user_id,
    actor_role: "admin",
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id ?? null,
    metadata: params.metadata ?? {},
  });
}

export async function startRun(adminClient: any, run_type: string, userId: string) {
  const { data } = await adminClient
    .from("integration_runs")
    .insert({
      provider: "fedpat",
      run_type,
      status: "started",
      started_at: new Date().toISOString(),
      created_by: userId,
    })
    .select()
    .single();
  return data;
}

export async function finishRun(
  adminClient: any,
  runId: string,
  status: "success" | "error" | "skipped",
  metadata: Record<string, unknown> = {},
  errorMessage?: string
) {
  await adminClient
    .from("integration_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      metadata,
      error_message: errorMessage || null,
    })
    .eq("id", runId);
}
