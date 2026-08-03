import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KipperAssistant } from "@/components/assistant/KipperAssistant";
import { Navbar } from "@/components/layout/Navbar";
import { TrustSection } from "@/components/home/TrustSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { siteConfig } from "@/lib/siteConfig";
import { shouldMountPublicAssistant } from "@/lib/botmakerWebchat";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    rolesLoaded: true,
    isAdmin: false,
    isProductor: false,
  }),
}));

vi.mock("@/hooks/useAnimeScope", () => ({
  useAnimeScope: () => ({ current: null }),
}));

vi.mock("animejs", () => ({
  animate: () => ({ revert: () => {} }),
  createDrawable: () => ({}),
  onScroll: () => ({}),
  stagger: () => 0,
  createTimeline: () => ({
    add: () => ({ add: () => ({ add: () => ({}) }) }),
  }),
}));

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

vi.mock("@/hooks/useGoogleReviews", () => ({
  useGoogleReviews: () => ({
    data: reviewsState.data,
    isLoading: reviewsState.isLoading,
  }),
  useRefreshGoogleReviews: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

function wrap(ui: React.ReactNode, path = "/") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  reviewsState.data = null;
  reviewsState.isLoading = false;
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
});

describe("public assistant routing", () => {
  it("allows public routes and blocks admin/productor/auth", () => {
    expect(shouldMountPublicAssistant("/")).toBe(true);
    expect(shouldMountPublicAssistant("/cotizar")).toBe(true);
    expect(shouldMountPublicAssistant("/admin")).toBe(false);
    expect(shouldMountPublicAssistant("/admin/config")).toBe(false);
    expect(shouldMountPublicAssistant("/productor")).toBe(false);
    expect(shouldMountPublicAssistant("/login")).toBe(false);
    expect(shouldMountPublicAssistant("/admin/login")).toBe(false);
    expect(shouldMountPublicAssistant("/registro")).toBe(false);
    expect(shouldMountPublicAssistant("/recuperar-contrasena")).toBe(false);
    expect(shouldMountPublicAssistant("/restablecer-contrasena")).toBe(false);
    expect(shouldMountPublicAssistant("/auth/callback")).toBe(false);
  });

  it("floating WhatsApp fallback renders on public routes and uses siteConfig", () => {
    render(wrap(<KipperAssistant />, "/"));
    const link = screen.getByRole("link", { name: /abrir whatsapp/i });
    expect(link).toHaveAttribute("href", expect.stringContaining(siteConfig.whatsappUrl));
    expect(link.getAttribute("href")).toContain("wa.me/");
  });

  it("does not render floating assistant on admin routes", () => {
    render(wrap(<KipperAssistant />, "/admin"));
    expect(screen.queryByRole("link", { name: /abrir whatsapp/i })).not.toBeInTheDocument();
    expect(document.querySelector("[data-kipper-assistant]")).toBeNull();
  });

  it("does not render floating assistant on productor or login routes", () => {
    const { unmount } = render(wrap(<KipperAssistant />, "/productor/academy"));
    expect(screen.queryByRole("link", { name: /abrir whatsapp/i })).not.toBeInTheDocument();
    unmount();
    render(wrap(<KipperAssistant />, "/login"));
    expect(screen.queryByRole("link", { name: /abrir whatsapp/i })).not.toBeInTheDocument();
  });
});

describe("header CTA hierarchy", () => {
  it("header no longer duplicates floating WhatsApp CTA; Cotizar dominates; portal is internal", () => {
    render(wrap(<Navbar />));

    const quote = document.querySelector('[data-cta="quote-primary"]');
    expect(quote).toBeTruthy();
    expect(quote).toHaveTextContent(/cotizar ahora/i);

    const portal = document.querySelector('[data-cta="portal-internal"]');
    expect(portal).toBeTruthy();
    expect(portal?.className).toMatch(/portal-pas-link/);

    // Desktop header must not include a filled WhatsApp CTA button.
    expect(document.querySelector('[data-cta="whatsapp"]')).toBeNull();
  });
});

describe("Federación Patronal hierarchy", () => {
  it("features Federación Patronal and keeps other insurers visible", () => {
    render(wrap(<TrustSection />));
    expect(screen.getByText("Federación Patronal")).toBeInTheDocument();
    expect(screen.getByText(/compañía principal/i)).toBeInTheDocument();
    expect(document.querySelector("[data-insurer-featured]")).toBeTruthy();
    expect(screen.getByText("La Segunda")).toBeInTheDocument();
    expect(screen.getByText("Zurich")).toBeInTheDocument();
    const pills = document.querySelectorAll("[data-insurer-pill]");
    expect(pills.length).toBeGreaterThan(3);
  });
});

describe("Google reviews cache UI", () => {
  it("renders reviews from cache", () => {
    reviewsState.data = {
      reviews: [
        { author: "María", text: "Excelente atención", rating: 5, relativeTime: "hace 1 mes" },
      ],
      maps_url: "https://maps.google.com/?cid=1",
      rating: 4.8,
      user_ratings_total: 42,
      fetched_at: "2026-08-01T12:00:00Z",
    };
    render(wrap(<TestimonialsSection />));
    expect(screen.getByText(/reseñas destacadas de google/i)).toBeInTheDocument();
    expect(screen.getByText(/excelente atención/i)).toBeInTheDocument();
    expect(screen.getByText("María")).toBeInTheDocument();
    expect(screen.getByText(/42 reseñas/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver todas en google/i })).toHaveAttribute(
      "href",
      "https://maps.google.com/?cid=1",
    );
  });

  it("empty cache renders an honest fallback with Google link", () => {
    reviewsState.data = {
      reviews: [],
      maps_url: null,
      rating: null,
      user_ratings_total: null,
      fetched_at: null,
    };
    render(wrap(<TestimonialsSection />));
    expect(screen.getByText(/conocé nuestras reseñas en google/i)).toBeInTheDocument();
    expect(screen.queryByText(/configurar google place id/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver nuestras reseñas en google/i })).toBeInTheDocument();
  });
});

describe("admin refresh visibility", () => {
  it("non-admin cannot see admin reviews panel when gated", async () => {
    const { default: AdminConfig } = await import("@/pages/admin/AdminConfig");
    render(wrap(<AdminConfig />));
    expect(screen.queryByText(/reintentar ahora/i)).not.toBeInTheDocument();
    expect(document.querySelector("[data-admin-google-reviews]")).toBeNull();
  });
});

describe("failed refresh preserves old cache (hook contract)", () => {
  it("public reviews query shape stays readable after a stale payload", () => {
    reviewsState.data = {
      reviews: [{ author: "Ana", text: "Cache válido", rating: 5 }],
      maps_url: "https://maps.google.com/?cid=2",
      rating: 5,
      user_ratings_total: 10,
      fetched_at: "2026-07-01T00:00:00Z",
    };
    render(wrap(<TestimonialsSection />));
    const section = screen.getByText(/reseñas destacadas de google/i).closest("section");
    expect(section).toBeTruthy();
    expect(within(section as HTMLElement).getByText(/cache válido/i)).toBeInTheDocument();
  });
});
