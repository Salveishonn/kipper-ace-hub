import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FEATURED_INSURER, OTHER_INSURERS, PUBLIC_INSURERS } from "@/lib/insurers";
import NosotrosPage from "@/pages/Nosotros";
import { TrustSection } from "@/components/home/TrustSection";
import { FedpatWidgetFrame } from "@/components/cotizar/FedpatWidgetFrame";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    rolesLoaded: true,
    isAdmin: false,
    isProductor: false,
    getDefaultDashboard: () => "/login",
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

describe("public insurers", () => {
  it("keeps only Federación Patronal plus three partners", () => {
    expect(FEATURED_INSURER).toBe("Federación Patronal");
    expect(OTHER_INSURERS).toEqual(["La Caja", "Mercantil Andina", "Go Assistance"]);
    expect(PUBLIC_INSURERS).toHaveLength(4);
  });
});

describe("Nuestra historia", () => {
  it("renders the five canonical paragraphs and new team members", () => {
    render(
      <MemoryRouter>
        <NosotrosPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /nuestra historia/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Kipper Seguros nació hace más de 20 años, cuando su fundadora, Cristina Kipper/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/acercar el mundo de los seguros de una manera simple, honesta y transparente/),
    ).toBeInTheDocument();
    expect(screen.getByText("Salvador Marín")).toBeInTheDocument();
    expect(screen.getByText("Juan Marín")).toBeInTheDocument();
  });
});

describe("TrustSection partners", () => {
  it("does not render retired insurer names", () => {
    render(<TrustSection />);
    expect(screen.getByText("Federación Patronal")).toBeInTheDocument();
    expect(screen.queryByText("Allianz")).not.toBeInTheDocument();
    expect(screen.queryByText("Mapfre")).not.toBeInTheDocument();
  });
});

describe("FedPat widget isolation", () => {
  it("loads the widget inside a sandboxed iframe, not on document.body", () => {
    render(<FedpatWidgetFrame />);
    const iframe = document.querySelector("iframe");
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute("sandbox")).toContain("allow-scripts");
    expect(document.getElementById("fedpat-widget-script")).toBeNull();
  });
});
