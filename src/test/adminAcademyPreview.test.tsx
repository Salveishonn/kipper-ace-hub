import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAcademy from "@/pages/admin/AdminAcademy";

const academyState = vi.hoisted(() => ({
  modules: [] as Array<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    published: boolean;
    sort_order: number;
    academy_lessons: Array<{
      id: string;
      module_id: string;
      title: string;
      slug: string;
      type: string;
      video_url: string | null;
      content_text: string | null;
      file_path: string | null;
      file_name: string | null;
      mime_type: string | null;
      published: boolean;
      sort_order: number;
    }>;
  }>,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin-1" },
    isAdmin: true,
    isProductor: false,
    loading: false,
    rolesLoaded: true,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: async () => ({ data: academyState.modules, error: null }),
        eq: (_col: string, val: string) => ({
          maybeSingle: async () => {
            const mod = academyState.modules.find((m) => m.slug === val || m.id === val);
            return {
              data: mod
                ? { id: mod.id, title: mod.title, slug: mod.slug, published: mod.published }
                : null,
              error: null,
            };
          },
          order: async () => {
            const mod = academyState.modules.find((m) => m.id === val) ?? academyState.modules[0];
            return { data: mod?.academy_lessons ?? [], error: null };
          },
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
            order: async () => ({ data: academyState.modules[0]?.academy_lessons ?? [], error: null }),
          }),
        }),
      }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
      delete: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  },
}));

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/admin/academy"]}>
        <AdminAcademy />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  academyState.modules = [
    {
      id: "mod-1",
      title: "Producción",
      slug: "produccion",
      description: null,
      published: true,
      sort_order: 1,
      academy_lessons: [
        {
          id: "les-1",
          module_id: "mod-1",
          title: "Cotización en SELF - Producto ART",
          slug: "cotizacion-self-art",
          type: "video",
          video_url: "https://youtube.com/watch?v=abc",
          content_text: null,
          file_path: null,
          file_name: null,
          mime_type: null,
          published: true,
          sort_order: 1,
        },
      ],
    },
  ];
});

describe("admin academy preview links", () => {
  it("opens a maximize dialog for the lesson instead of leaving the admin list", async () => {
    render(wrap());

    const moduleLink = await screen.findByRole("link", { name: /producción/i });
    expect(moduleLink).toHaveAttribute("href", "/admin/academy/produccion");

    fireEvent.click(screen.getByRole("button", { name: /expandir producción/i }));

    fireEvent.click(
      screen.getByRole("button", { name: /cotización en self - producto art/i }),
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/así la ven los productores/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /cotización en self/i })).not.toBeInTheDocument();
  });

  it("keeps edit controls on the list", async () => {
    render(wrap());
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /editar módulo/i })).toBeInTheDocument();
    });
  });
});
