import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSupabaseFunctionUrl } from "@/lib/siteConfig";
import {
  formatGoogleReviewsFunctionError,
  type CachedGoogleReview,
  type FunctionErrorBody,
} from "@/lib/googleReviews";

export type { CachedGoogleReview };

export type GoogleReviewsView = {
  reviews: CachedGoogleReview[];
  maps_url: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  fetched_at: string | null;
  place_id?: string | null;
};

/**
 * Public homepage: read google_reviews_cache only.
 * Never calls Google Places or the Edge Function on page load.
 */
export function useGoogleReviews() {
  return useQuery({
    queryKey: ["google_reviews"],
    queryFn: async (): Promise<GoogleReviewsView> => {
      const { data: cached, error } = await supabase
        .from("google_reviews_cache")
        .select("place_id, reviews_json, maps_url, rating, user_ratings_total, fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (import.meta.env.DEV) {
          console.warn("[google_reviews] cache read error", error.message);
        }
        return emptyReviews();
      }

      if (!cached) return emptyReviews();

      const reviews = Array.isArray(cached.reviews_json)
        ? (cached.reviews_json as CachedGoogleReview[]).slice(0, 5)
        : [];

      return {
        reviews,
        maps_url: cached.maps_url,
        rating: cached.rating,
        user_ratings_total: cached.user_ratings_total,
        fetched_at: cached.fetched_at,
        place_id: cached.place_id,
      };
    },
    staleTime: 60 * 60 * 1000,
  });
}

function emptyReviews(): GoogleReviewsView {
  return {
    reviews: [],
    maps_url: null,
    rating: null,
    user_ratings_total: null,
    fetched_at: null,
    place_id: null,
  };
}

export type RefreshGoogleReviewsResult = FunctionErrorBody & {
  source?: string;
  warning?: string;
  fetched_at?: string;
  google_status?: string | null;
};

/** Admin diagnostic only — normal refresh is the 12h cron. */
export function useRefreshGoogleReviews() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<RefreshGoogleReviewsResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sesión requerida");
      }

      const res = await fetch(getSupabaseFunctionUrl("google-reviews"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
        body: JSON.stringify({ refresh: true }),
      });

      const body = (await res.json().catch(() => ({}))) as RefreshGoogleReviewsResult;

      if (!res.ok) {
        throw new Error(formatGoogleReviewsFunctionError(body));
      }

      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["google_reviews"] });
    },
  });
}
