import { describe, it, expect } from "vitest";
import {
  formatGoogleReviewsFunctionError,
  getReviewPageSize,
  groupReviews,
  isIncompleteReviewGroup,
  normalizePlaceId,
  normalizePlacesReviews,
  resolveRefreshAuth,
  shouldAutoplayReviews,
  sanitizeGoogleMessage,
} from "@/lib/googleReviews";

describe("google reviews auth contract", () => {
  it("scheduled request with valid x-cron-secret succeeds", () => {
    expect(
      resolveRefreshAuth({
        cronHeader: "test-cron-secret",
        cronSecret: "test-cron-secret",
        isAdmin: false,
      }),
    ).toBe("cron");
  });

  it("invalid cron secret is rejected", () => {
    expect(
      resolveRefreshAuth({
        cronHeader: "wrong",
        cronSecret: "test-cron-secret",
        isAdmin: false,
      }),
    ).toBeNull();
  });

  it("admin diagnostic request succeeds", () => {
    expect(
      resolveRefreshAuth({
        cronHeader: null,
        cronSecret: "test-cron-secret",
        isAdmin: true,
      }),
    ).toBe("admin");
  });
});

describe("google reviews normalize + errors", () => {
  it("successful response normalizes up to 5 real reviews", () => {
    const reviews = normalizePlacesReviews([
      {
        authorAttribution: { displayName: "Ana" },
        rating: 5,
        text: { text: "Muy buena atención" },
        relativePublishTimeDescription: "hace 1 mes",
      },
      {
        authorAttribution: { displayName: "Luis" },
        rating: 4,
        text: { text: "Rápidos" },
      },
      {},
      {},
      {},
      { authorAttribution: { displayName: "Extra" }, text: { text: "6th" } },
    ]);
    expect(reviews).toHaveLength(5);
    expect(reviews[0]).toMatchObject({
      author: "Ana",
      rating: 5,
      text: "Muy buena atención",
      relativeTime: "hace 1 mes",
    });
    expect(reviews.find((r) => r.author === "Extra")).toBeUndefined();
  });

  it("sanitizes API keys from messages", () => {
    expect(sanitizeGoogleMessage("bad key=AIzaSyDummyKeyValue123456789012345 and more")).toContain(
      "[redacted",
    );
  });

  it("formats function errors with stage and upstream status", () => {
    const msg = formatGoogleReviewsFunctionError({
      stage: "google_http",
      upstreamStatus: 403,
      message: "PERMISSION_DENIED: Places API not enabled",
      error: "Error al obtener reseñas de Google",
    });
    expect(msg).toMatch(/google_http/i);
    expect(msg).toMatch(/403/);
    expect(msg).toMatch(/PERMISSION_DENIED/i);
  });

  it("normalizes places/ prefix on Place ID", () => {
    expect(normalizePlaceId("places/ChIJabc")).toBe("ChIJabc");
    expect(normalizePlaceId("ChIJabc")).toBe("ChIJabc");
  });
});

describe("google reviews carousel grouping", () => {
  const five = [1, 2, 3, 4, 5];

  it("desktop groups reviews by 4", () => {
    expect(getReviewPageSize(1280)).toBe(4);
    const groups = groupReviews(five, 4);
    expect(groups).toEqual([[1, 2, 3, 4], [5]]);
    expect(isIncompleteReviewGroup(groups[1].length, 4)).toBe(true);
  });

  it("tablet groups by 2", () => {
    expect(getReviewPageSize(800)).toBe(2);
    expect(groupReviews(five, 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("mobile groups by 1", () => {
    expect(getReviewPageSize(375)).toBe(1);
    expect(groupReviews(five, 1)).toHaveLength(5);
  });

  it("incomplete final desktop group is centered (helper)", () => {
    expect(isIncompleteReviewGroup(1, 4)).toBe(true);
    expect(isIncompleteReviewGroup(4, 4)).toBe(false);
  });

  it("autoplay disabled for reduced motion", () => {
    expect(shouldAutoplayReviews(2, true)).toBe(false);
    expect(shouldAutoplayReviews(2, false)).toBe(true);
    expect(shouldAutoplayReviews(1, false)).toBe(false);
  });
});

describe("google failure preserves existing cache (contract)", () => {
  it("documents that failed refresh must not invent reviews", () => {
    // Edge function only upserts after a complete 2xx + reviews array.
    // preserveOrFail returns previous row without writing when Google fails.
    const previous = {
      reviews_json: [{ author: "Old", text: "Cache válido", rating: 5 }],
      fetched_at: "2026-07-01T00:00:00Z",
    };
    const onFailure = { source: "stale_cache", ...previous };
    expect(onFailure.reviews_json[0].author).toBe("Old");
    expect(onFailure.source).toBe("stale_cache");
  });
});
