import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSupabaseFunctionUrl } from "@/lib/siteConfig";

export interface CachedGoogleReview {
  author: string;
  rating?: number;
  text: string;
  relativeTime?: string;
}

export function useGoogleReviews() {
  return useQuery({
    queryKey: ["google_reviews"],
    queryFn: async () => {
      const { data: cached, error } = await supabase
        .from("google_reviews_cache")
        .select("*")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && cached) {
        return {
          reviews: (cached.reviews_json as CachedGoogleReview[]) ?? [],
          maps_url: cached.maps_url,
          rating: cached.rating,
          user_ratings_total: cached.user_ratings_total,
          fetched_at: cached.fetched_at,
        };
      }

      const res = await fetch(getSupabaseFunctionUrl("google-reviews"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: false }),
      });

      if (!res.ok) {
        return {
          reviews: [] as CachedGoogleReview[],
          maps_url: null as string | null,
          rating: null,
          user_ratings_total: null,
          fetched_at: null,
        };
      }

      const body = await res.json();
      return {
        reviews: (body.reviews_json as CachedGoogleReview[]) ?? [],
        maps_url: body.maps_url as string,
        rating: body.rating as number | null,
        user_ratings_total: body.user_ratings_total as number | null,
        fetched_at: body.fetched_at as string,
      };
    },
    staleTime: 60 * 60 * 1000,
  });
}
