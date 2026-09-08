export const ALLOWED_ORIGINS = [
  "https://kipperseguros.com",
  "https://www.kipperseguros.com",
  "https://kipperseguros.com.ar",
  "https://www.kipperseguros.com.ar",
  "https://kipper-ace-hub.vercel.app",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  return (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".vercel.app") ||
    origin === "http://localhost:5173" ||
    origin === "http://localhost:8080" ||
    origin === "http://localhost:3000"
  );
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allow = origin && isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    Vary: "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}
