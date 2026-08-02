import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mutateAsync = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin-1" },
    loading: false,
    rolesLoaded: true,
    isAdmin: true,
    isProductor: false,
  }),
}));

vi.mock("@/hooks/useGoogleReviews", () => ({
  useGoogleReviews: () => ({
    data: {
      reviews: [{ author: "Old", text: "Old cache", rating: 5 }],
      maps_url: "https://maps.google.com/?cid=9",
      rating: 4.5,
      user_ratings_total: 12,
      fetched_at: "2026-07-01T00:00:00Z",
    },
    isLoading: false,
  }),
  useRefreshGoogleReviews: () => ({
    mutateAsync,
    isPending: false,
    isError: true,
    error: new Error("[google_http] Places API rejected HTTP 403"),
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
      }),
      delete: () => ({ eq: async () => ({ error: null }) }),
      insert: async () => ({ error: null }),
    }),
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
  mutateAsync.mockReset();
});

describe("admin Google reviews status panel", () => {
  it("shows automatic status and secondary diagnostic retry", async () => {
    mutateAsync.mockResolvedValue({
      source: "live",
      fetched_at: "2026-08-02T12:00:00Z",
    });

    const { default: AdminConfig } = await import("@/pages/admin/AdminConfig");
    render(wrap(<AdminConfig />));

    expect(screen.getByText(/cada 12 horas/i)).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: /actualizar reseñas de google/i });
    expect(retry).toHaveAttribute("data-reviews-retry");
    expect(retry).toHaveTextContent(/reintentar ahora/i);
    fireEvent.click(retry);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  it("failed refresh surfaces sanitized error and keeps prior cache stats", async () => {
    mutateAsync.mockRejectedValue(new Error("[google_http] PERMISSION_DENIED HTTP 403"));

    const { default: AdminConfig } = await import("@/pages/admin/AdminConfig");
    render(wrap(<AdminConfig />));

    expect(screen.getByText(/4\.5/)).toBeInTheDocument();
    expect(screen.getByText(/12 reseñas/i)).toBeInTheDocument();
    expect(screen.getByText(/permission_denied|places api rejected/i)).toBeInTheDocument();
  });
});
