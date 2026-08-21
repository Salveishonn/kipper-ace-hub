import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminNovedades from "@/pages/admin/AdminNovedades";

const novedadesState = vi.hoisted(() => ({
  items: [] as Array<{
    id: string;
    title: string;
    description: string | null;
    resource_type: string;
    file_path: string | null;
    file_name: string | null;
    external_url: string | null;
    week_label: string | null;
    published: boolean;
  }>,
}));

vi.mock("@/hooks/usePasResources", () => ({
  usePasResources: () => ({ data: novedadesState.items, isLoading: false, error: null }),
  useSavePasResource: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useDeletePasResource: () => ({ mutate: vi.fn(), isPending: false }),
  uploadPasResourceFile: vi.fn(),
  pasResourceAccept: () => ".pdf",
  isValidPasResourceFile: () => true,
  getPasResourceDownloadUrl: async () => "https://example.com/file.pdf",
}));

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <AdminNovedades />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  novedadesState.items = [
    {
      id: "n1",
      title: "Circular semanal",
      description: "Novedad de prueba",
      resource_type: "pdf",
      file_path: "uploads/circular.pdf",
      file_name: "circular.pdf",
      external_url: null,
      week_label: "Semana 1",
      published: true,
    },
  ];
});

describe("admin novedades preview", () => {
  it("opens a viewer dialog when the title is clicked", async () => {
    render(wrap());
    fireEvent.click(screen.getByRole("button", { name: /ver circular semanal/i }));
    expect(await screen.findByRole("dialog", { name: /circular semanal/i })).toBeInTheDocument();
  });

  it("keeps edit controls on the list", () => {
    render(wrap());
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
  });
});
