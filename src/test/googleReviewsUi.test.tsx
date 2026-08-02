import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { GoogleReviewsCarousel } from "@/components/home/GoogleReviewsCarousel";

vi.mock("@/hooks/useAnimeScope", () => ({
  useAnimeScope: () => ({ current: null }),
}));

vi.mock("animejs", () => ({
  animate: () => ({ revert: () => {} }),
  createDrawable: () => ({}),
  onScroll: () => ({}),
  stagger: () => 0,
  createTimeline: () => ({ add: () => ({ add: () => ({}) }) }),
}));

vi.mock("embla-carousel-react", () => {
  const listeners: Record<string, Array<() => void>> = {};
  const api = {
    selectedScrollSnap: () => 0,
    scrollNext: vi.fn(),
    scrollPrev: vi.fn(),
    scrollTo: vi.fn(),
    reInit: vi.fn(),
    on: (event: string, cb: () => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    },
    off: vi.fn(),
  };
  return {
    default: () => [vi.fn(), api],
  };
});

const reviewsState = vi.hoisted(() => ({
  data: null as null | {
    reviews: Array<{ author: string; text: string; rating?: number; relativeTime?: string }>;
    maps_url: string | null;
    rating: number | null;
    user_ratings_total: number | null;
    fetched_at: string | null;
  },
  isLoading: false,
}));

const mutateAsync = vi.fn();

vi.mock("@/hooks/useGoogleReviews", () => ({
  useGoogleReviews: () => ({
    data: reviewsState.data,
    isLoading: reviewsState.isLoading,
  }),
  useRefreshGoogleReviews: () => ({
    mutateAsync,
    isPending: false,
    isError: true,
    error: new Error("[google_http] PERMISSION_DENIED HTTP 403"),
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin-1" },
    loading: false,
    rolesLoaded: true,
    isAdmin: true,
    isProductor: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
        order: () => ({
          limit: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
      delete: () => ({ eq: async () => ({ error: null }) }),
      insert: async () => ({ error: null }),
    }),
    auth: { getSession: async () => ({ data: { session: null } }) },
  },
}));

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  reviewsState.data = null;
  reviewsState.isLoading = false;
  mutateAsync.mockReset();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
});

describe("public reviews UI", () => {
  it("public frontend only reads cache (hook mock has no function fetch on render)", () => {
    reviewsState.data = {
      reviews: [{ author: "María", text: "Excelente", rating: 5 }],
      maps_url: "https://maps.google.com/?cid=1",
      rating: 4.9,
      user_ratings_total: 33,
      fetched_at: "2026-08-01T12:00:00Z",
    };
    render(wrap(<TestimonialsSection />));
    expect(screen.getByText(/reseñas destacadas de google/i)).toBeInTheDocument();
    expect(screen.getByText(/excelente/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver todas en google/i })).toBeInTheDocument();
  });

  it("empty cache shows honest fallback", () => {
    reviewsState.data = {
      reviews: [],
      maps_url: null,
      rating: null,
      user_ratings_total: null,
      fetched_at: null,
    };
    render(wrap(<TestimonialsSection />));
    expect(screen.getByText(/conocé nuestras reseñas en google/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver nuestras reseñas en google/i })).toBeInTheDocument();
    expect(screen.queryByText(/configurar google place id/i)).not.toBeInTheDocument();
  });

  it("desktop groups reviews by 4 with centered incomplete final group", () => {
    const reviews = [1, 2, 3, 4, 5].map((n) => ({
      author: `User ${n}`,
      text: `Review text ${n}`,
      rating: 5,
    }));
    render(wrap(<GoogleReviewsCarousel reviews={reviews} />));
    const carousel = document.querySelector("[data-reviews-carousel]");
    expect(carousel).toHaveAttribute("data-page-size", "4");
    const groups = document.querySelectorAll("[data-review-group]");
    expect(groups.length).toBe(2);
    expect(groups[1]).toHaveAttribute("data-incomplete", "true");
    expect(groups[1].firstElementChild?.className ?? "").toMatch(/justify-center/);
  });
});

describe("admin reviews panel", () => {
  it("shows compact status and sanitized diagnostic error; retry is secondary", async () => {
    reviewsState.data = {
      reviews: [{ author: "Old", text: "Cache válido", rating: 5 }],
      maps_url: "https://maps.google.com/?cid=2",
      rating: 4.5,
      user_ratings_total: 12,
      fetched_at: "2026-07-01T00:00:00Z",
    };

    const { default: AdminConfig } = await import("@/pages/admin/AdminConfig");
    render(wrap(<AdminConfig />));

    expect(screen.getByText(/actualización automática/i)).toBeInTheDocument();
    expect(screen.getByText(/cada 12 horas/i)).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: /actualizar reseñas de google/i });
    expect(retry).toHaveAttribute("data-reviews-retry");
    expect(retry).toHaveTextContent(/reintentar ahora/i);
    expect(screen.getByText(/permission_denied/i)).toBeInTheDocument();

    mutateAsync.mockResolvedValue({ source: "live", fetched_at: "2026-08-02T00:00:00Z" });
    fireEvent.click(retry);
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
  });
});
