/** Pure helpers for Google reviews cache + carousel (Places API New, max 5). */

export type CachedGoogleReview = {
  author: string;
  rating?: number;
  text: string;
  relativeTime?: string;
};

export type GoogleReviewsCacheRow = {
  place_id: string;
  reviews_json: CachedGoogleReview[];
  maps_url: string;
  rating: number | null;
  user_ratings_total: number | null;
  fetched_at: string;
};

/** Matches remote `google_reviews_cache` columns. */
export const GOOGLE_REVIEWS_CACHE_COLUMNS = [
  "place_id",
  "reviews_json",
  "maps_url",
  "rating",
  "user_ratings_total",
  "fetched_at",
] as const;

export type ReviewPageSize = 1 | 2 | 4;

export function getReviewPageSize(viewportWidth: number): ReviewPageSize {
  if (viewportWidth >= 1024) return 4;
  if (viewportWidth >= 768) return 2;
  return 1;
}

export function groupReviews<T>(items: T[], pageSize: number): T[][] {
  if (pageSize < 1) return [];
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += pageSize) {
    groups.push(items.slice(i, i + pageSize));
  }
  return groups;
}

export function shouldAutoplayReviews(groupCount: number, reducedMotion: boolean): boolean {
  return groupCount > 1 && !reducedMotion;
}

/** Desktop incomplete final group stays centered, not stretched. */
export function isIncompleteReviewGroup(groupLength: number, pageSize: number): boolean {
  return groupLength > 0 && groupLength < pageSize;
}

export type RefreshAuthMode = "cron" | "admin" | null;

export function resolveRefreshAuth(input: {
  cronHeader: string | null;
  cronSecret: string | null | undefined;
  isAdmin: boolean;
}): RefreshAuthMode {
  const expected = input.cronSecret?.trim();
  const provided = input.cronHeader?.trim();
  if (expected && provided && provided === expected) return "cron";
  if (input.isAdmin) return "admin";
  return null;
}

export function sanitizeGoogleMessage(raw: string): string {
  return raw
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-key]")
    .replace(/key=[^&\s]+/gi, "key=[redacted]")
    .slice(0, 400);
}

/** Strip optional `places/` prefix from a Place ID env value. */
export function normalizePlaceId(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith("places/") ? trimmed.slice("places/".length) : trimmed;
}

export type PlacesReviewRaw = {
  authorAttribution?: { displayName?: string };
  rating?: number;
  text?: { text?: string };
  relativePublishTimeDescription?: string;
};

export function normalizePlacesReviews(reviews: unknown): CachedGoogleReview[] {
  if (!Array.isArray(reviews)) return [];
  return reviews.slice(0, 5).map((r) => {
    const row = r as PlacesReviewRaw;
    return {
      author: row.authorAttribution?.displayName?.trim() || "Usuario de Google",
      rating: typeof row.rating === "number" ? row.rating : undefined,
      text: row.text?.text?.trim() || "",
      relativeTime: row.relativePublishTimeDescription || "",
    };
  });
}

export type FunctionErrorBody = {
  error?: string;
  stage?: string;
  upstreamStatus?: number | null;
  message?: string;
  google_message?: string;
  google_http_status?: number;
};

export function formatGoogleReviewsFunctionError(body: FunctionErrorBody, fallback =
  "Error al obtener reseñas de Google"): string {
  const sanitized = body.message || body.google_message;
  const stage = body.stage ? `[${body.stage}] ` : "";
  const status = body.upstreamStatus ?? body.google_http_status;
  const statusPart = status != null ? ` HTTP ${status}` : "";
  if (sanitized) return `${stage}${sanitized}${statusPart}`.trim();
  if (body.error) return `${stage}${body.error}${statusPart}`.trim();
  return fallback;
}
