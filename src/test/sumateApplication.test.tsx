import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import SumatePage from "@/pages/Sumate";
import { useCreateProducerApplication } from "@/hooks/useProducerApplications";
import { getProducerApplicationErrorMessage } from "@/lib/producerApplicationErrors";
import { isPasswordValid, passwordsMatch } from "@/lib/passwordPolicy";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/Seo", () => ({
  Seo: () => null,
}));

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      ok: true,
      message:
        "Recibimos tu solicitud. Revisá tu email para verificar tu dirección. Una vez verificada, el equipo de Kipper evaluará tu solicitud.",
    }),
  });
});

describe("password policy", () => {
  it("requires complexity rules", () => {
    expect(isPasswordValid("short")).toBe(false);
    expect(isPasswordValid("longenough")).toBe(false);
    expect(isPasswordValid("Longenough")).toBe(false);
    expect(isPasswordValid("Longenough1")).toBe(true);
    expect(passwordsMatch("Longenough1", "Longenough1")).toBe(true);
    expect(passwordsMatch("Longenough1", "other")).toBe(false);
  });
});

describe("getProducerApplicationErrorMessage", () => {
  it("maps duplicate email uniquely", () => {
    expect(
      getProducerApplicationErrorMessage({
        code: "23505",
        message: 'duplicate key value violates unique constraint "producer_applications_email_lower_uidx"',
        details: "Key (lower(email))=(test@example.com) already exists.",
      }),
    ).toMatch(/ya existe una solicitud con este email/i);
  });
});

describe("useCreateProducerApplication", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };

  it("submits via register-pas-application without storing password in a table payload log", async () => {
    const { result } = renderHook(() => useCreateProducerApplication(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        full_name: "Ana Productora",
        email: "ana@example.com",
        password: "SecurePass1",
        confirm_password: "SecurePass1",
      });
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("register-pas-application");
    const body = JSON.parse(init.body as string);
    expect(body.password).toBe("SecurePass1");
    expect(body.full_name).toBe("Ana Productora");
    expect(body).not.toHaveProperty("status");
    expect(body).not.toHaveProperty("user_id");
  });

  it("surfaces edge function validation errors", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Las contraseñas no coinciden." }),
    });
    const { result } = renderHook(() => useCreateProducerApplication(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          full_name: "Dup",
          email: "dup@example.com",
          password: "SecurePass1",
          confirm_password: "OtherPass1",
        });
      }),
    ).rejects.toThrow(/contraseñas no coinciden/i);
  });
});

describe("Sumate form", () => {
  it("failed register restores the button loading state", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "No se pudo registrar la solicitud. Intentá nuevamente." }),
    });

    render(wrap(<SumatePage />));

    fireEvent.change(screen.getByLabelText(/nombre y apellido/i), {
      target: { value: "Fail Case" },
    });
    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: { value: "fail@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^contraseña/i), {
      target: { value: "SecurePass1" },
    });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), {
      target: { value: "SecurePass1" },
    });

    fireEvent.click(screen.getByRole("button", { name: /crear cuenta y enviar solicitud/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /crear cuenta y enviar solicitud/i }),
      ).toBeEnabled();
    });
  });

  it("shows success copy after registration", async () => {
    render(wrap(<SumatePage />));

    fireEvent.change(screen.getByLabelText(/nombre y apellido/i), {
      target: { value: "Ana Productora" },
    });
    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^contraseña/i), {
      target: { value: "SecurePass1" },
    });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), {
      target: { value: "SecurePass1" },
    });

    fireEvent.click(screen.getByRole("button", { name: /crear cuenta y enviar solicitud/i }));

    expect(
      await screen.findByText(/revisá tu email para verificar tu dirección/i),
    ).toBeInTheDocument();
  });
});
