/**
 * Places API (New) Place Details → google_reviews_cache (max 5 reviews).
 *
 * Auth for refresh:
 * 1) Header `x-cron-secret` === CRON_SECRET (scheduled)
 * 2) Bearer JWT of an admin (diagnostic)
 *
 * Unauthenticated requests only return the latest cache row (no Google call).
 * Failed Google/refresh paths never overwrite a successful cache row.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

type ReviewRow = {
  author: string;
  rating?: number;
  text: string;
  relativeTime?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const placeIdRaw = Deno.env.get("GOOGLE_PLACE_ID");
  const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const wantsRefresh = await shouldRefresh(req);
    const authMode = wantsRefresh
      ? await resolveAuth(req, {
          cronSecret,
          supabaseUrl,
          anonKey,
          admin,
        })
      : null;

    if (wantsRefresh && !authMode) {
      return json(
        {
          error: "No autorizado",
          stage: "auth",
          upstreamStatus: null,
          message: "Se requiere x-cron-secret válido o sesión admin",
        },
        401,
      );
    }

    if (!wantsRefresh) {
      return await returnCache(admin);
    }

    // —— Refresh (cron or admin diagnostic) ——
    if (!placeIdRaw || !apiKey) {
      console.error("google-reviews secrets missing", {
        hasPlaceId: Boolean(placeIdRaw),
        hasApiKey: Boolean(apiKey),
      });
      return json(
        {
          error: "Secrets incompletos",
          stage: "secrets",
          upstreamStatus: null,
          message: "GOOGLE_PLACE_ID o GOOGLE_PLACES_API_KEY no configurados",
          hasPlaceId: Boolean(placeIdRaw),
          hasApiKey: Boolean(apiKey),
        },
        503,
      );
    }

    const placeId = normalizePlaceId(placeIdRaw);
    const { data: previous } = await admin
      .from("google_reviews_cache")
      .select("*")
      .eq("place_id", placeId)
      .maybeSingle();

      const url =
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}` +
      `?languageCode=es-419`;
    const fieldMask =
      "id,displayName,rating,userRatingCount,reviews,googleMapsUri";

    let placesRes: Response;
    try {
      placesRes = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": fieldMask,
        },
      });
    } catch (netErr) {
      const message = sanitizeGoogleMessage(
        netErr instanceof Error ? netErr.message : "Network error",
      );
      console.error("Places API network failure", {
        httpStatus: null,
        message,
        hasPlaceId: true,
        hasApiKey: true,
      });
      return preserveOrFail(previous, {
        stage: "google_network",
        upstreamStatus: null,
        message,
      });
    }

    if (!placesRes.ok) {
      const errText = await placesRes.text();
      let googleStatus: string | null = null;
      let googleMessage: string;
      try {
        const parsed = JSON.parse(errText);
        googleStatus = parsed?.error?.status ?? null;
        googleMessage = sanitizeGoogleMessage(
          parsed?.error?.message ?? errText,
        );
      } catch {
        googleMessage = sanitizeGoogleMessage(errText);
      }

      console.error("Places API non-2xx", {
        httpStatus: placesRes.status,
        message: googleMessage,
        googleStatus,
        hasPlaceId: true,
        hasApiKey: true,
      });

      return preserveOrFail(previous, {
        stage: "google_http",
        upstreamStatus: placesRes.status,
        message: googleMessage,
        googleStatus,
      });
    }

    const place = await placesRes.json();
    if (!Array.isArray(place.reviews)) {
      console.error("Places API unexpected reviews shape", {
        httpStatus: placesRes.status,
        message: "reviews is not an array",
        hasPlaceId: true,
        hasApiKey: true,
      });
      return preserveOrFail(previous, {
        stage: "google_shape",
        upstreamStatus: placesRes.status,
        message: "La respuesta de Google no incluye un array reviews",
      });
    }

    const reviews = normalizeReviews(place.reviews);
    const mapsUrl =
      (place.googleMapsUri as string) ||
      `https://www.google.com/maps/place/?q=place_id:${placeId}`;

    // Remote schema: place_id, reviews_json, maps_url, rating, user_ratings_total, fetched_at
    const row = {
      place_id: placeId,
      reviews_json: reviews,
      maps_url: mapsUrl,
      rating: place.rating ?? null,
      user_ratings_total: place.userRatingCount ?? null,
      fetched_at: new Date().toISOString(),
    };

    const { data: upserted, error: upsertErr } = await admin
      .from("google_reviews_cache")
      .upsert(row, { onConflict: "place_id" })
      .select()
      .single();

    if (upsertErr) {
      console.error("cache upsert failed", {
        message: upsertErr.message,
        code: upsertErr.code,
      });
      return preserveOrFail(previous, {
        stage: "cache_upsert",
        upstreamStatus: null,
        message: sanitizeGoogleMessage(upsertErr.message),
      }, 500);
    }

    return json({
      source: "live",
      auth: authMode,
      ...upserted,
    });
  } catch (e) {
    console.error(
      "google-reviews internal",
      e instanceof Error ? e.message : e,
    );
    return json(
      {
        error: "Error interno",
        stage: "internal",
        upstreamStatus: null,
        message: e instanceof Error ? sanitizeGoogleMessage(e.message) : "Error interno",
      },
      500,
    );
  }
});

async function shouldRefresh(req: Request): Promise<boolean> {
  // Cron jobs always refresh (secret checked later).
  if (req.headers.get("x-cron-secret")) return true;
  if (req.method !== "POST") return false;
  const body = await req.clone().json().catch(() => ({}));
  return Boolean((body as { refresh?: boolean }).refresh);
}

async function resolveAuth(
  req: Request,
  opts: {
    cronSecret: string | null | undefined;
    supabaseUrl: string;
    anonKey: string | undefined;
    admin: ReturnType<typeof createClient>;
  },
): Promise<"cron" | "admin" | null> {
  const cronHeader = req.headers.get("x-cron-secret")?.trim();
  const expected = opts.cronSecret?.trim();
  if (expected && cronHeader && cronHeader === expected) return "cron";

  const isAdmin = await requireAdmin(req, opts.supabaseUrl, opts.anonKey, opts.admin);
  return isAdmin ? "admin" : null;
}

async function requireAdmin(
  req: Request,
  supabaseUrl: string,
  anonKey: string | undefined,
  admin: ReturnType<typeof createClient>,
): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ") || !anonKey) return false;

  const token = authHeader.slice(7);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) return false;

  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  return Boolean(roles?.some((r) => r.role === "admin"));
}

async function returnCache(admin: ReturnType<typeof createClient>) {
  const { data: cached } = await admin
    .from("google_reviews_cache")
    .select("*")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) return json({ source: "cache", ...cached });
  return json(
    {
      error: "Sin cache de reseñas",
      stage: "cache_empty",
      upstreamStatus: null,
      message: "Todavía no hay una respuesta exitosa cacheada",
      source: "empty",
    },
    404,
  );
}

function preserveOrFail(
  previous: Record<string, unknown> | null,
  detail: {
    stage: string;
    upstreamStatus: number | null;
    message: string;
    googleStatus?: string | null;
  },
  failStatus = 502,
) {
  if (previous) {
    return json({
      source: "stale_cache",
      warning: "Google/refresh falló; se conserva el último cache válido",
      stage: detail.stage,
      upstreamStatus: detail.upstreamStatus,
      message: detail.message,
      google_status: detail.googleStatus ?? null,
      ...previous,
    });
  }

  return json(
    {
      error: "Error al obtener reseñas de Google",
      stage: detail.stage,
      upstreamStatus: detail.upstreamStatus,
      message: detail.message,
      google_status: detail.googleStatus ?? null,
    },
    failStatus,
  );
}

function normalizePlaceId(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith("places/") ? trimmed.slice("places/".length) : trimmed;
}

function normalizeReviews(reviews: unknown[]): ReviewRow[] {
  return reviews.slice(0, 5).map((r) => {
    const row = r as {
      authorAttribution?: {
        displayName?: string;
      };
      rating?: number;
      text?: {
        text?: string;
        languageCode?: string;
      };
      originalText?: {
        text?: string;
        languageCode?: string;
      };
      relativePublishTimeDescription?: string;
    };

    const originalText = row.originalText?.text?.trim();
    const localizedText = row.text?.text?.trim();

    return {
      author:
        row.authorAttribution?.displayName?.trim() ||
        "Usuario de Google",
      rating:
        typeof row.rating === "number"
          ? row.rating
          : undefined,
      text: originalText || localizedText || "",
      relativeTime:
        row.relativePublishTimeDescription || "",
    };
  });
}

function sanitizeGoogleMessage(raw: string): string {
  return raw
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-key]")
    .replace(/key=[^&\s]+/gi, "key=[redacted]")
    .slice(0, 400);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
