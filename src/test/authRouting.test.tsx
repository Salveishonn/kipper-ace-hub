import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import LoginPage from "@/pages/Login";
import AdminLoginPage from "@/pages/AdminLogin";
import { resolvePostAuthDestination } from "@/lib/authRouting";

/**
 * Mutable state consumed by the supabase client mock below.
 * Each test configures it in beforeEach / at the top of the test.
 */
const mockState = vi.hoisted(() => ({
  session: null as { user: { id: string; email: string } } | null,
  profile: null as Record<string, unknown> | null,
  profileError: null as { message: string } | null,
  roles: { data: [] as Array<{ role: string }> | null, error: null as { message: string } | null },
  application: null as Record<string, unknown> | null,
  adminMfaVerified: false,
}));

vi.mock("@/lib/adminMfa", () => ({
  requestAdminMfaCode: async () => ({ ok: true, email: "test@example.com" }),
  verifyAdminMfaCode: async () => ({ ok: true }),
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
      resend: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ error: null }),
    },
    rpc: async (name: string) => {
      if (name === "get_my_producer_application") {
        return { data: mockState.application ? [mockState.application] : [], error: null };
      }
      if (name === "admin_mfa_is_verified") {
        return { data: mockState.adminMfaVerified, error: null };
      }
      return { data: null, error: null };
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
        order: () => ({
          limit: async () => ({
            data: mockState.application ? [mockState.application] : [],
            error: null,
          }),
        }),
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
          <Route path="/productor/solicitud-pendiente" element={<div>PENDING_SCREEN</div>} />
          <Route path="/productor/acceso-no-disponible" element={<div>DENIED_SCREEN</div>} />
          <Route path="/sumate" element={<div>SUMATE</div>} />
          <Route path="/recuperar-contrasena" element={<div>RECOVER</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

beforeEach(() => {
  mockState.session = null;
  mockState.profile = null;
  mockState.profileError = null;
  mockState.roles = { data: [], error: null };
  mockState.application = null;
  mockState.adminMfaVerified = false;
});

describe("resolvePostAuthDestination", () => {
  it("routes pending applicants to solicitud-pendiente", () => {
    expect(
      resolvePostAuthDestination({
        user: { id: "1" } as never,
        roles: [],
        application: { status: "pending", email: "a@b.com" },
      }),
    ).toBe("/productor/solicitud-pendiente");
  });

  it("routes admin without MFA to login for the email code", () => {
    expect(
      resolvePostAuthDestination({
        user: { id: "1" } as never,
        roles: ["admin"],
        application: null,
        adminMfaVerified: false,
      }),
    ).toBe("/login");
  });

  it("routes MFA-verified admin to /admin", () => {
    expect(
      resolvePostAuthDestination({
        user: { id: "1" } as never,
        roles: ["admin"],
        application: null,
        adminMfaVerified: true,
      }),
    ).toBe("/admin");
  });

  it("routes productor ahead of pending application", () => {
    expect(
      resolvePostAuthDestination({
        user: { id: "1" } as never,
        roles: ["productor"],
        application: { status: "pending", email: "a@b.com" },
      }),
    ).toBe("/productor");
  });
});

describe("auth routing", () => {
  it("anonymous user opens /login: the login form renders (no infinite spinner)", async () => {
    renderAt("/login");

    expect(
      await screen.findByRole("heading", { name: /^ingresar$/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("tu@email.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ingresar/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /olvidaste tu contraseña/i })).toHaveAttribute(
      "href",
      "/recuperar-contrasena",
    );
  });

  it("anonymous user opens /admin/login: redirects to the unified login", async () => {
    renderAt("/admin/login");

    expect(
      await screen.findByRole("heading", { name: /^ingresar$/i }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("tu@email.com")).toBeInTheDocument();
  });

  it("authenticated admin without MFA stays on login for the email code", async () => {
    mockState.session = makeSession();
    mockState.profile = makeProfile();
    mockState.roles = { data: [{ role: "admin" }], error: null };
    mockState.adminMfaVerified = false;

    renderAt("/login");

    expect(
      await screen.findByRole("heading", { name: /verificá tu identidad/i }),
    ).toBeInTheDocument();
  });

  it("authenticated admin with MFA opens /login: redirects to /admin", async () => {
    mockState.session = makeSession();
    mockState.profile = makeProfile();
    mockState.roles = { data: [{ role: "admin" }], error: null };
    mockState.adminMfaVerified = true;

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

  it("authenticated pending applicant: redirects to pending screen", async () => {
    mockState.session = makeSession();
    mockState.profile = makeProfile({ account_status: "pending" });
    mockState.roles = { data: [], error: null };
    mockState.application = {
      id: "app-1",
      email: "test@example.com",
      full_name: "Test User",
      status: "pending",
      created_at: new Date().toISOString(),
      approved_at: null,
    };

    renderAt("/login");

    expect(await screen.findByText("PENDING_SCREEN")).toBeInTheDocument();
  });

  it("failed role query: loading finishes and an error state appears", async () => {
    mockState.session = makeSession();
    mockState.profile = makeProfile();
    mockState.roles = { data: null, error: { message: "permission denied for table user_roles" } };

    renderAt("/login");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no pudimos verificar el acceso/i);
    expect(screen.getByPlaceholderText("tu@email.com")).toBeInTheDocument();
  });
});
