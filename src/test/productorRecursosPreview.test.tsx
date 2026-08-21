import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProductorRecursos from "@/pages/productor/ProductorRecursos";

const designState = vi.hoisted(() => ({
  items: [] as Array<{
    id: string;
    title: string;
    description: string | null;
    category: string;
    preview_path: string | null;
    download_path: string | null;
    editable_url: string | null;
    published: boolean;
    sort_order: number;
  }>,
}));

vi.mock("@/hooks/useDesignResources", () => ({
  DESIGN_CATEGORIES: [
    { value: "instagram_post", label: "Instagram post" },
    { value: "flyer", label: "Flyer" },
  ],
  designCategoryLabel: (value: string) => (value === "flyer" ? "Flyer" : value),
  useDesignResources: () => ({ data: designState.items, isLoading: false, error: null }),
  getDesignResourceSignedUrl: async () => "https://example.com/preview.png",
}));

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <ProductorRecursos />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  designState.items = [
    {
      id: "d1",
      title: "Flyer auto",
      description: "Plantilla de auto",
      category: "flyer",
      preview_path: "previews/auto.png",
      download_path: "files/auto.png",
      editable_url: "https://canva.com/example",
      published: true,
      sort_order: 0,
    },
  ];
});

describe("productor recursos gráficos preview", () => {
  it("opens a maximize dialog when the title is clicked", async () => {
    render(wrap());
    fireEvent.click(screen.getByRole("button", { name: /^ver flyer auto$/i }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/plantilla de auto/i);
  });

  it("keeps download and plantilla actions on the card", () => {
    render(wrap());
    expect(screen.getByRole("link", { name: /editar plantilla/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /descargar/i })).toBeInTheDocument();
  });
});
