import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import LoginPage from "@/pages/Login";
import AdminLoginPage from "@/pages/AdminLogin";

/**
 * Mutable state consumed by the supabase client mock below.
 * Each test configures it in beforeEach / at the top of the test.
 */
const mockState = vi.hoisted(() => ({
  session: null as { user: { id: string; email: string } } | null,
  profile: null as Record<string, unknown> | null,
  profileError: null as { message: string } | null,
  roles: { data: [] as Array<{ role: string }> | null, error: null as { message: string } | null },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: mockState.session } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
      updateUser: async () => ({ data: { user: null }, error: null }),
      refreshSession: async () => ({ data: {}, error: null }),
      getUser: async () => ({ data: { user: mockState.session?.user ?? null } }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => {
          if (table === "profiles") {
            return {
              maybeSingle: async () => ({
                data: mockState.profile,
                error: mockState.profileError,
              }),
            };
          }
          // user_roles: the query builder itself is awaited.
          return Promise.resolve(mockState.roles);
        },
      }),
    }),
  },
}));

const makeSession = () => ({
  user: { id: "user-1", email: "test@example.com" },
});

const makeProfile = (overrides: Record<string, unknown> = {}) => ({
  id: "profile-1",
  user_id: "user-1",
  email: "test@example.com",
  full_name: "Test User",
  phone: null,
  dni: null,
  address: null,
  city: null,
  province: null,
  postal_code: null,
  avatar_url: null,
  marketing_consent: false,
  preferred_contact: "email",
  account_status: "active",
  ...overrides,
});

const renderAt = (path: string) =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<div>HOME</div>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<div>ADMIN_DASHBOARD</div>} />
          <Route path="/productor" element={<div>PRODUCTOR_DASHBOARD</div>} />
          <Route path="/sumate" element={<div>SUMATE</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

beforeEach(() => {
  mockState.session = null;
  mockState.profile = null;
  mockState.profileError = null;
  mockState.roles = { data: [], error: null };
});

describe("auth routing", () => {
  it("anonymous user opens /login: the login form renders (no infinite spinner)", async () => {
    renderAt("/login");

    expect(
      await screen.findByRole("heading", { name: /portal productores/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("tu@email.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ingresar/i })).toBeInTheDocument();
  });

  it("anonymous user opens /admin/login: the admin login renders", async () => {
    renderAt("/admin/login");

    expect(
      await screen.findByRole("heading", { name: /administración kipper/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("authenticated admin opens /login: redirects to /admin", async () => {
    mockState.session = makeSession();
    mockState.profile = makeProfile();
    mockState.roles = { data: [{ role: "admin" }], error: null };

    renderAt("/login");

    expect(await screen.findByText("ADMIN_DASHBOARD")).toBeInTheDocument();
  });

  it("authenticated productor opens /login: redirects to /productor", async () => {
    mockState.session = makeSession();
    mockState.profile = makeProfile();
    mockState.roles = { data: [{ role: "productor" }], error: null };

    renderAt("/login");

    expect(await screen.findByText("PRODUCTOR_DASHBOARD")).toBeInTheDocument();
  });

  it("authenticated user with no role: clear access message, login page stays visible", async () => {
    mockState.session = makeSession();
    mockState.profile = makeProfile();
    mockState.roles = { data: [], error: null };

    renderAt("/login");

    expect(
      await screen.findByText(/tu cuenta no tiene acceso asignado/i),
    ).toBeInTheDocument();
    // The page did not get stuck on a spinner and did not redirect away.
    expect(screen.getByPlaceholderText("tu@email.com")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN_DASHBOARD")).not.toBeInTheDocument();
    expect(screen.queryByText("PRODUCTOR_DASHBOARD")).not.toBeInTheDocument();
  });

  it("failed role query: loading finishes and an error state appears", async () => {
    mockState.session = makeSession();
    mockState.profile = makeProfile();
    mockState.roles = { data: null, error: { message: "permission denied for table user_roles" } };

    renderAt("/login");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no pudimos verificar el acceso/i);
    // Loading resolved: the form is interactive again.
    expect(screen.getByPlaceholderText("tu@email.com")).toBeInTheDocument();
  });
});
