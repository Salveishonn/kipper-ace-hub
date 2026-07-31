/**
 * Fetches a limited subset of reviews via Places API (New) Place Details.
 * Google does not return the full review list — the public site must link out
 * to Maps for "Ver todas las reseñas en Google".
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const placeId = Deno.env.get("GOOGLE_PLACE_ID");
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!placeId || !apiKey) {
      return json(
        {
          error: "GOOGLE_PLACE_ID o GOOGLE_PLACES_API_KEY no configurados",
        },
        503,
      );
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const forceRefresh = Boolean((body as { refresh?: boolean }).refresh);

    const admin = createClient(supabaseUrl, serviceKey);

    if (!forceRefresh) {
      const { data: cached } = await admin
        .from("google_reviews_cache")
        .select("*")
        .eq("place_id", placeId)
        .maybeSingle();

      if (cached?.fetched_at) {
        const ageMs = Date.now() - new Date(cached.fetched_at).getTime();
        if (ageMs < 24 * 60 * 60 * 1000) {
          return json({ source: "cache", ...cached });
        }
      }
    }

    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
    const fieldMask =
      "id,displayName,rating,userRatingCount,googleMapsUri,reviews";

    const placesRes = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
    });

    if (!placesRes.ok) {
      const errText = await placesRes.text();
      console.error("Places API", placesRes.status, errText);
      return json({ error: "Error al obtener reseñas de Google" }, 502);
    }

    const place = await placesRes.json();
    const reviews = (place.reviews ?? []).map((r: Record<string, unknown>) => ({
      author: (r.authorAttribution as { displayName?: string })?.displayName ??
        "Usuario de Google",
      rating: r.rating,
      text: (r.text as { text?: string })?.text ?? "",
      relativeTime: (r.relativePublishTimeDescription as string) ?? "",
    }));

    const mapsUrl =
      (place.googleMapsUri as string) ??
      `https://www.google.com/maps/place/?q=place_id:${placeId}`;

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
      console.error(upsertErr);
      return json({ error: "No se pudo guardar el cache" }, 500);
    }

    return json({ source: "live", ...upserted });
  } catch (e) {
    console.error(e);
    return json({ error: "Error interno" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
