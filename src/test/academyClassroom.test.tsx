import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AcademyModuleLibrary } from "@/components/academy/AcademyModuleLibrary";
import { AcademyLessonPlayer } from "@/components/academy/AcademyLessonPlayer";
import { findResumePoint } from "@/components/academy/academyProgress";
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
const progressStore = vi.hoisted(() => ({
  rows: [] as Array<{ lesson_id: string; completed_at: string }>,
  error: null as { message: string } | null,
  writeError: null as { message: string } | null,
  writes: [] as Array<{ op: string; payload?: unknown }>,
  reads: 0,
}));
const authState = vi.hoisted(() => ({ isAdmin: false, isProductor: true }));
const toastError = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({ toast: { error: toastError } }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "pas-1" }, ...authState }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "academy_lesson_progress") {
        return {
          select: () => ({
            eq: async () => {
              progressStore.reads += 1;
              return { data: progressStore.error ? null : progressStore.rows, error: progressStore.error };
            },
          }),
          upsert: async (payload: { lesson_id: string }) => {
            progressStore.writes.push({ op: "upsert", payload });
            if (!progressStore.writeError) {
              progressStore.rows = [
                ...progressStore.rows,
                { lesson_id: payload.lesson_id, completed_at: "2026-10-30T12:00:00Z" },
              ];
            }
            return { error: progressStore.writeError };
          },
          delete: () => ({
            eq: () => ({
              eq: async (_column: string, lessonId: string) => {
                progressStore.writes.push({ op: "delete", payload: lessonId });
                progressStore.rows = progressStore.rows.filter((r) => r.lesson_id !== lessonId);
                return { error: progressStore.writeError };
              },
            }),
          }),
        };
      }
      return {
      select: () => ({
        order: () => {
          const result = { data: academyModules.rows, error: null };
          return Object.assign(Promise.resolve(result), { eq: async () => result });
        },
        eq: () => {
          const moduleRow = async () => ({
            data: { id: "mod-1", title: "Producción", slug: "produccion", published: true },
            error: null,
          });
          return {
            maybeSingle: moduleRow,
            eq: () => ({ maybeSingle: moduleRow }),
            // Admins skip the published filter, so the awaited query sees every lesson.
            order: () =>
              Object.assign(Promise.resolve({ data: lessons, error: null }), {
                eq: async () => ({ data: lessons.filter((l) => l.published), error: null }),
              }),
          };
        },
      }),
      };
    },
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
  Object.assign(authState, { isAdmin: false, isProductor: true });
  Object.assign(progressStore, { rows: [], error: null, writeError: null, writes: [], reads: 0 });
  toastError.mockClear();
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

const done = (lesson_id: string, completed_at = "2026-10-01T10:00:00Z") => ({ lesson_id, completed_at });

describe("progreso: landing", () => {
  const landing = () => <AcademyModuleLibrary basePath={PRODUCER_ACADEMY_BASE} />;
  const cta = () => screen.findByRole("link", { name: /primera lección|continuar|repasar/i });

  it("starts at the first lesson with nothing completed", async () => {
    render(wrap(landing()));

    const link = await screen.findByRole("link", { name: "Empezar primera lección" });
    expect(link).toHaveAttribute("href", "/productor/academy/produccion/intro");
    expect(screen.getAllByText("0 de 2 lecciones completadas").length).toBeGreaterThan(0);
  });

  it("continues at the next pending lesson and shows the module's completion", async () => {
    progressStore.rows = [done("intro")];
    render(wrap(landing()));

    const link = await screen.findByRole("link", { name: /continuar.*guía de cotización/i });
    expect(link).toHaveAttribute("href", "/productor/academy/produccion/guia");

    const card = screen.getByRole("link", { name: /ver módulo/i });
    expect(within(card).getByText("1 de 2 lecciones completadas")).toBeInTheDocument();
    expect(within(card).getByRole("progressbar", { name: "Progreso en Producción" })).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
    expect(within(card).getAllByRole("img", { name: "Completada" })).toHaveLength(1);
  });

  it("offers a review once every lesson is completed", async () => {
    progressStore.rows = [done("intro"), done("guia")];
    render(wrap(landing()));

    expect(await screen.findByRole("link", { name: "Repasar desde el inicio" })).toHaveAttribute(
      "href",
      "/productor/academy/produccion/intro",
    );
    expect(screen.getByText("Módulo completado")).toBeInTheDocument();
  });

  it("ignores completions of lessons that are no longer published", async () => {
    progressStore.rows = [done("oculta")];
    render(wrap(landing()));

    expect(await screen.findByRole("link", { name: "Empezar primera lección" })).toBeInTheDocument();
    expect(screen.getAllByText("0 de 2 lecciones completadas").length).toBeGreaterThan(0);
  });

  it("falls back to the plain entry point when progress cannot be loaded", async () => {
    progressStore.error = { message: "relation does not exist" };
    render(wrap(landing()));

    expect(await screen.findByRole("link", { name: "Ir a la primera lección" }, { timeout: 4000 })).toHaveAttribute(
      "href",
      "/productor/academy/produccion/intro",
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/completadas/)).not.toBeInTheDocument();
  });

  it("shows admins no progress and never queries it", async () => {
    Object.assign(authState, { isAdmin: true, isProductor: true });
    progressStore.rows = [done("intro")];
    render(wrap(landing()));

    expect((await cta()).textContent).toBe("Ir a la primera lección");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Completada" })).not.toBeInTheDocument();
    expect(progressStore.reads).toBe(0);
  });
});

describe("progreso: módulo", () => {
  const moduleView = () => <AcademyModuleLibrary basePath={PRODUCER_ACADEMY_BASE} moduleSlug="produccion" />;

  it("resumes at the pending lesson and marks completed rows", async () => {
    progressStore.rows = [done("intro")];
    render(wrap(moduleView()));

    expect(await screen.findByRole("link", { name: "Continuar módulo" })).toHaveAttribute(
      "href",
      "/productor/academy/produccion/guia",
    );
    expect(screen.getByText("1 de 2 lecciones completadas")).toBeInTheDocument();

    const section = screen.getByRole("region", { name: "Lecciones" });
    const [first, second] = within(section).getAllByRole("link");
    expect(within(first).getByRole("img", { name: "Completada" })).toBeInTheDocument();
    expect(within(second).queryByRole("img", { name: "Completada" })).not.toBeInTheDocument();
  });

  it("offers a review of a finished module", async () => {
    progressStore.rows = [done("intro"), done("guia")];
    render(wrap(moduleView()));

    expect(await screen.findByRole("link", { name: "Repasar módulo" })).toHaveAttribute(
      "href",
      "/productor/academy/produccion/intro",
    );
  });
});

describe("progreso: lección", () => {
  const player = () => (
    <AcademyLessonPlayer basePath={PRODUCER_ACADEMY_BASE} moduleSlug="produccion" lessonSlug="intro" />
  );

  it("marks a lesson complete and updates the outline", async () => {
    render(wrap(player()));

    fireEvent.click(await screen.findByRole("button", { name: "Marcar como completada" }));

    expect(await screen.findByText("Lección completada")).toBeInTheDocument();
    expect(progressStore.writes).toEqual([
      { op: "upsert", payload: { producer_id: "pas-1", lesson_id: "intro" } },
    ]);
    const outline = screen.getByRole("region", { name: "Contenido del módulo" });
    expect(within(outline).getByRole("img", { name: "Completada" })).toBeInTheDocument();
    expect(within(outline).getByText("1 de 2 lecciones completadas")).toBeInTheDocument();
  });

  it("unmarks a completed lesson", async () => {
    progressStore.rows = [done("intro")];
    render(wrap(player()));

    fireEvent.click(await screen.findByRole("button", { name: "Desmarcar" }));

    expect(await screen.findByRole("button", { name: "Marcar como completada" })).toBeInTheDocument();
    expect(progressStore.writes).toEqual([{ op: "delete", payload: "intro" }]);
  });

  it("rolls back and warns when saving fails", async () => {
    progressStore.writeError = { message: "denied" };
    render(wrap(player()));

    fireEvent.click(await screen.findByRole("button", { name: "Marcar como completada" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("No se pudo guardar tu progreso. Intentá de nuevo."));
    expect(await screen.findByRole("button", { name: "Marcar como completada" })).toBeInTheDocument();
    expect(screen.queryByText("Lección completada")).not.toBeInTheDocument();
  });

  it("gives admins a preview that cannot write progress", async () => {
    Object.assign(authState, { isAdmin: true, isProductor: true });
    progressStore.rows = [done("intro")];
    render(wrap(player()));

    await screen.findByTitle("Introducción a ART");
    expect(screen.queryByRole("button", { name: /marcar|desmarcar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Completada" })).not.toBeInTheDocument();
    expect(screen.queryByText(/completadas/)).not.toBeInTheDocument();
    expect(progressStore.reads).toBe(0);
    expect(progressStore.writes).toEqual([]);
  });
});

describe("findResumePoint", () => {
  const course = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  const times = (entries: Record<string, string>) => new Map(Object.entries(entries));

  it("picks up after the latest completion rather than the first gap", () => {
    const completed = times({ a: "2026-10-01T00:00:00Z", c: "2026-10-02T00:00:00Z" });
    expect(findResumePoint(course, completed)).toEqual({ status: "continue", lesson: { id: "d" } });
  });

  it("wraps round to lessons skipped earlier", () => {
    const completed = times({ c: "2026-10-01T00:00:00Z", d: "2026-10-02T00:00:00Z" });
    expect(findResumePoint(course, completed)).toEqual({ status: "continue", lesson: { id: "a" } });
  });

  it("handles an empty course", () => {
    expect(findResumePoint([], new Map())).toBeNull();
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
