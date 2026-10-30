import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AcademyModuleLibrary } from "@/components/academy/AcademyModuleLibrary";
import { AcademyLessonPlayer } from "@/components/academy/AcademyLessonPlayer";
import { PRODUCER_ACADEMY_BASE } from "@/components/academy/types";
import { getVideoThumbnailUrl } from "@/lib/videoEmbed";

const lesson = (id: string, title: string, type: string, sort_order: number, extra = {}) => ({
  id,
  module_id: "mod-1",
  title,
  slug: id,
  type,
  video_url: null,
  content_text: null,
  file_path: null,
  file_name: null,
  mime_type: null,
  published: true,
  sort_order,
  ...extra,
});

const lessons = [
  lesson("intro", "Introducción a ART", "video", 1, { video_url: "https://youtu.be/abc123" }),
  lesson("guia", "Guía de cotización", "pdf", 2, { file_path: "guia.pdf", file_name: "guia.pdf" }),
  lesson("oculta", "Lección oculta", "chat", 3, { published: false }),
];

const academyModules = vi.hoisted(() => ({ rows: [] as unknown[] }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ isAdmin: false, isProductor: true }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          eq: async () => ({ data: academyModules.rows, error: null }),
        }),
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: "mod-1", title: "Producción", slug: "produccion", published: true },
              error: null,
            }),
          }),
          order: () => ({
            eq: async () => ({ data: lessons.filter((l) => l.published), error: null }),
          }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: "https://x.supabase.co/guia.pdf" }, error: null }),
      }),
    },
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
  academyModules.rows = [
    {
      id: "mod-1",
      title: "Producción",
      slug: "produccion",
      description: "Cómo cotizar",
      published: true,
      sort_order: 1,
      academy_lessons: lessons,
    },
    {
      id: "mod-2",
      title: "Módulo vacío",
      slug: "vacio",
      description: null,
      published: true,
      sort_order: 2,
      academy_lessons: [],
    },
  ];
});

describe("aula virtual: landing", () => {
  it("links each module with lessons to its own page and hides empty ones", async () => {
    render(wrap(<AcademyModuleLibrary basePath={PRODUCER_ACADEMY_BASE} />));

    const card = await screen.findByRole("link", { name: /ver módulo/i });
    expect(card).toHaveAttribute("href", "/productor/academy/produccion");
    expect(screen.queryByText("Módulo vacío")).not.toBeInTheDocument();
    expect(screen.queryByText("Lección oculta")).not.toBeInTheDocument();
  });

  it("offers file lessons as materials with a direct download", async () => {
    render(wrap(<AcademyModuleLibrary basePath={PRODUCER_ACADEMY_BASE} />));

    const materials = await screen.findByRole("region", { name: "Material de estudio" });
    expect(within(materials).getByRole("link", { name: /guía de cotización/i })).toHaveAttribute(
      "href",
      "/productor/academy/produccion/guia",
    );
    expect(within(materials).getByRole("button", { name: /descargar guía/i })).toBeInTheDocument();
  });

  it("finds lessons ignoring case and accents", async () => {
    render(wrap(<AcademyModuleLibrary basePath={PRODUCER_ACADEMY_BASE} />));

    fireEvent.change(await screen.findByRole("searchbox"), { target: { value: "INTRODUCCION" } });

    const results = screen.getByRole("region", { name: /resultados/i });
    expect(within(results).getByRole("link", { name: /introducción a art/i })).toHaveAttribute(
      "href",
      "/productor/academy/produccion/intro",
    );
    expect(within(results).queryByText(/guía de cotización/i)).not.toBeInTheDocument();
  });
});

describe("aula virtual: módulo", () => {
  it("lists published lessons in order and starts at the first one", async () => {
    render(wrap(<AcademyModuleLibrary basePath={PRODUCER_ACADEMY_BASE} moduleSlug="produccion" />));

    expect(await screen.findByRole("link", { name: /empezar módulo/i })).toHaveAttribute(
      "href",
      "/productor/academy/produccion/intro",
    );
    const section = screen.getByRole("region", { name: "Lecciones" });
    expect(within(section).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/productor/academy/produccion/intro",
      "/productor/academy/produccion/guia",
    ]);
  });

  it("reports a module that does not exist", async () => {
    render(wrap(<AcademyModuleLibrary basePath={PRODUCER_ACADEMY_BASE} moduleSlug="nada" />));
    expect(await screen.findByText("Módulo no encontrado")).toBeInTheDocument();
  });
});

describe("aula virtual: lección", () => {
  const player = () => (
    <AcademyLessonPlayer basePath={PRODUCER_ACADEMY_BASE} moduleSlug="produccion" lessonSlug="intro" />
  );

  it("keeps the YouTube embed and marks the current lesson in the outline", async () => {
    render(wrap(player()));

    const frame = await screen.findByTitle("Introducción a ART");
    expect(frame).toHaveAttribute("src", "https://www.youtube.com/embed/abc123");

    const outline = screen.getByRole("region", { name: "Contenido del módulo" });
    expect(within(outline).getByRole("link", { name: /introducción a art/i })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(within(outline).getByRole("link", { name: /guía de cotización/i })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("uses buttons in the outline when navigation stays in an overlay", async () => {
    const onSelectLesson = vi.fn();
    render(
      wrap(
        <AcademyLessonPlayer
          basePath={PRODUCER_ACADEMY_BASE}
          moduleSlug="produccion"
          lessonSlug="intro"
          onSelectLesson={onSelectLesson}
        />,
      ),
    );

    const outline = await screen.findByRole("region", { name: "Contenido del módulo" });
    expect(within(outline).queryByRole("link")).not.toBeInTheDocument();
    fireEvent.click(within(outline).getByRole("button", { name: /guía de cotización/i }));
    expect(onSelectLesson).toHaveBeenCalledWith("produccion", "guia");
  });
});

describe("getVideoThumbnailUrl", () => {
  it("derives a thumbnail from every YouTube URL form", () => {
    const expected = "https://i.ytimg.com/vi/abc123/hqdefault.jpg";
    expect(getVideoThumbnailUrl("https://www.youtube.com/watch?v=abc123")).toBe(expected);
    expect(getVideoThumbnailUrl("https://youtu.be/abc123?t=4")).toBe(expected);
    expect(getVideoThumbnailUrl("https://www.youtube-nocookie.com/embed/abc123")).toBe(expected);
  });

  it("returns null for providers without a public thumbnail", () => {
    expect(getVideoThumbnailUrl("https://vimeo.com/12345")).toBeNull();
  });
});
