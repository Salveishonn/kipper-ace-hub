// Server-side only: FedPat OAuth token handling.
// IMPORTANT: never return access_token to the frontend.
import { isConfigured } from "./utils.ts";

export interface FedPatTokenRow {
  provider: string;
  access_token: string;
  token_type: string | null;
  expires_at: string | null;
  refreshed_at: string | null;
}

export async function getCachedToken(adminClient: any): Promise<FedPatTokenRow | null> {
  const { data } = await adminClient
    .from("integration_tokens")
    .select("*")
    .eq("provider", "fedpat")
    .maybeSingle();
  return data;
}

export async function upsertToken(adminClient: any, token: Omit<FedPatTokenRow, "provider">) {
  await adminClient.from("integration_tokens").upsert(
    {
      provider: "fedpat",
      ...token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" }
  );
}

/**
 * Real OAuth2 client_credentials exchange against FedPat.
 * TODO: replace endpoint contract once Federación Patronal entrega documentación oficial.
 * Currently a placeholder: returns null so callers fall back to "not_configured".
 */
export async function fetchOAuthToken(): Promise<FedPatTokenRow | null> {
  if (!isConfigured()) return null;
  // const tokenUrl = Deno.env.get("FEDPAT_TOKEN_URL")!;
  // const clientId = Deno.env.get("FEDPAT_CLIENT_ID")!;
  // const clientSecret = Deno.env.get("FEDPAT_CLIENT_SECRET")!;
  // TODO: implement real fetch when contract is known.
  return null;
}

/**
 * Generate a mock token (mock mode only). Never use in production.
 */
export function generateMockToken(): Omit<FedPatTokenRow, "provider"> {
  const now = new Date();
  const expires = new Date(now.getTime() + 3600_000);
  return {
    access_token: "mock_token_DO_NOT_USE_IN_PROD",
    token_type: "bearer",
    expires_at: expires.toISOString(),
    refreshed_at: now.toISOString(),
  };
}
