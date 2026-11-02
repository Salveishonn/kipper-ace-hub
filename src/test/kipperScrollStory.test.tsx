import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KipperScrollStory } from "@/components/home/KipperScrollStory";

function stubReducedMotion() {
  vi.stubGlobal("createImageBitmap", vi.fn());
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("KipperScrollStory static fallback", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the poster and copy with no canvas when motion is reduced", () => {
    stubReducedMotion();
    const { container } = render(
      <MemoryRouter>
        <KipperScrollStory />
      </MemoryRouter>,
    );

    expect(container.querySelector(".scroll-story")).toHaveAttribute("data-static");
    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelector("img")).toHaveAttribute("src", "/videos/kipper-oficina-poster.jpg");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Seguros simples");
    expect(screen.queryByText("Saltar recorrido")).toBeNull();
  });
});
