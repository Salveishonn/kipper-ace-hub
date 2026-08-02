import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import SumatePage from "@/pages/Sumate";
import { useCreateProducerApplication } from "@/hooks/useProducerApplications";
import { getProducerApplicationErrorMessage } from "@/lib/producerApplicationErrors";

const insertCalls: Array<{ payload: unknown; chained: string[] }> = [];

const mockState = vi.hoisted(() => ({
  insertError: null as null | {
    code: string;
    message: string;
    details?: string | null;
    hint?: string | null;
  },
  authRole: "anon" as "anon" | "authenticated",
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: {
          session:
            mockState.authRole === "authenticated"
              ? { access_token: "tok", user: { id: "admin-1" } }
              : null,
        },
      }),
    },
    from: (table: string) => {
      if (table !== "producer_applications") {
        throw new Error(`Unexpected table ${table}`);
      }
      const chained: string[] = [];
      const builder: Record<string, unknown> = {
        insert: (payload: unknown) => {
          insertCalls.push({ payload, chained });
          // Return a thenable so `await supabase.from().insert()` works,
          // and also expose chainable methods that tests must NOT use.
          const result = {
            select: (...args: unknown[]) => {
              chained.push("select");
              void args;
              return result;
            },
            single: () => {
              chained.push("single");
              return result;
            },
            maybeSingle: () => {
              chained.push("maybeSingle");
              return result;
            },
            then: (
              resolve: (value: { data: null; error: typeof mockState.insertError }) => unknown,
              reject?: (reason: unknown) => unknown,
            ) =>
              Promise.resolve({
                data: null,
                error: mockState.insertError,
              }).then(resolve, reject),
          };
          return result;
        },
      };
      return builder;
    },
  },
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

// MainLayout pulls in heavy UI; stub it for focused form tests.
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
  insertCalls.length = 0;
  mockState.insertError = null;
  mockState.authRole = "anon";
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

  it("logged-out visitor successfully submits with INSERT only", async () => {
    mockState.authRole = "anon";
    const { result } = renderHook(() => useCreateProducerApplication(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        full_name: "Ana Productora",
        email: "ana@example.com",
      });
    });

    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].payload).toEqual({
      full_name: "Ana Productora",
      email: "ana@example.com",
      phone: null,
      matricula_ssn: null,
      city: null,
      province: null,
      years_experience: null,
      current_companies: null,
      message: null,
    });
    // No workflow fields.
    expect(insertCalls[0].payload).not.toHaveProperty("status");
    expect(insertCalls[0].payload).not.toHaveProperty("user_id");
    expect(insertCalls[0].payload).not.toHaveProperty("reviewed_by");
    expect(insertCalls[0].chained).toEqual([]);
  });

  it("authenticated admin can submit while testing (same INSERT path)", async () => {
    mockState.authRole = "authenticated";
    const { result } = renderHook(() => useCreateProducerApplication(), { wrapper });

    let resolved: unknown;
    await act(async () => {
      resolved = await result.current.mutateAsync({
        full_name: "Admin Tester",
        email: "admin-test@example.com",
      });
    });

    expect(resolved).toEqual({ ok: true });
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].chained).toEqual([]);
    expect(insertCalls[0].payload).not.toHaveProperty("status");
  });

  it("submission performs no SELECT after INSERT", async () => {
    const { result } = renderHook(() => useCreateProducerApplication(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        full_name: "Sin Select",
        email: "noselect@example.com",
      });
    });

    expect(insertCalls[0].chained).not.toContain("select");
    expect(insertCalls[0].chained).not.toContain("single");
    expect(insertCalls[0].chained).not.toContain("maybeSingle");
  });

  it("duplicate email produces a clear Spanish message", async () => {
    mockState.insertError = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
      details: "Key (lower(email))=(dup@example.com) already exists.",
      hint: null,
    };
    const { result } = renderHook(() => useCreateProducerApplication(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          full_name: "Dup",
          email: "dup@example.com",
        });
      }),
    ).rejects.toThrow(/ya existe una solicitud con este email/i);
  });
});

describe("Sumate form loading state", () => {
  it("failed insert restores the button loading state", async () => {
    mockState.insertError = {
      code: "42501",
      message: 'new row violates row-level security policy for table "producer_applications"',
    };

    render(wrap(<SumatePage />));

    fireEvent.change(screen.getByLabelText(/nombre y apellido/i), {
      target: { value: "Fail Case" },
    });
    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: { value: "fail@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /enviar solicitud/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /enviar solicitud/i })).toBeEnabled();
    });
    expect(screen.queryByRole("button", { name: /enviando/i })).not.toBeInTheDocument();
  });
});
