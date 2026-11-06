import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminLayout from "@/pages/admin/AdminLayout";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin-1" },
    profile: { full_name: "Ana Admin", email: "ana@example.test", avatar_url: null },
    isAdmin: true,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useSupportTickets", () => ({
  useConsultasLive: () => undefined,
  useConsultaUnreadCount: () => 3,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { admin_push_forum: false }, error: null }) }),
      }),
    }),
  },
}));

function wrap(ui: React.ReactNode, path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("admin PWA", () => {
  it("installs as Kipper Admin and shows a mobile tab bar with unread consultas", () => {
    render(
      wrap(
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="consultas" element={<p>lista</p>} />
          </Route>
        </Routes>,
        "/admin/consultas",
      ),
    );

    expect(document.querySelector('link[rel="manifest"]')?.getAttribute("href")).toBe("/manifest-admin.webmanifest");

    const tabs = screen.getByRole("navigation", { name: "Accesos rápidos" });
    const consultas = within(tabs).getByRole("link", { name: /Consultas/ });
    expect(consultas).toHaveAttribute("aria-current", "page");
    expect(within(consultas).getByLabelText("3 sin leer")).toBeInTheDocument();
    expect(within(tabs).getByRole("button", { name: /Más/ })).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Mis notificaciones/ })).toHaveAttribute("href", "/admin/notificaciones");
  });

  it("lets admins choose which team events reach their devices", async () => {
    render(wrap(<NotificationSettings variant="admin" />, "/admin/notificaciones"));
    expect(await screen.findByRole("switch", { name: "Avisos push de consultas" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Avisos push de solicitudes pas" })).toBeChecked();
    // Stored preference wins over the default.
    expect(await screen.findByRole("switch", { name: "Avisos push de foro" })).not.toBeChecked();
  });

  it("producers do not see the admin push options", () => {
    render(wrap(<NotificationSettings />, "/productor/perfil"));
    expect(screen.queryByRole("switch", { name: /Avisos push de/ })).not.toBeInTheDocument();
  });
});
