import { describe, it, expect } from "vitest";
import { resolvePostAuthDestination } from "@/lib/authRouting";
import {
  isSelfRegistrationPending,
  isLegacyInviteFlow,
  isPasAccessSuspended,
  isPasAccessDeleted,
  matchesPasAdminFilter,
  countPasAdminFilters,
  defaultPasAdminFilter,
} from "@/lib/producerApplicationStatus";

describe("admin PAS management routing", () => {
  it("suspended producer without role is sent to acceso-no-disponible", () => {
    expect(
      resolvePostAuthDestination({
        user: { id: "u1" } as never,
        roles: [],
        accountStatus: "suspended",
        application: { status: "activo", email: "a@b.com" },
      }),
    ).toBe("/productor/acceso-no-disponible");
  });

  it("active productor role goes to portal", () => {
    expect(
      resolvePostAuthDestination({
        user: { id: "u1" } as never,
        roles: ["productor"],
        accountStatus: "active",
        application: { status: "activo", email: "a@b.com" },
      }),
    ).toBe("/productor");
  });

  it("self-registration pending requires user_id", () => {
    expect(
      isSelfRegistrationPending({ status: "pending", user_id: "u1" }),
    ).toBe(true);
    expect(isSelfRegistrationPending({ status: "pending", user_id: null })).toBe(false);
  });

  it("legacy invite is only when no auth user", () => {
    expect(isLegacyInviteFlow({ status: "nuevo", user_id: null })).toBe(true);
    expect(isLegacyInviteFlow({ status: "invitado", user_id: "u1" })).toBe(false);
  });

  it("treats an activo application with suspended profile as revoked access", () => {
    expect(isPasAccessSuspended({ status: "activo", account_status: "suspended" })).toBe(true);
    expect(isPasAccessSuspended({ status: "activo", account_status: "active" })).toBe(false);
    expect(isPasAccessSuspended({ status: "pending", account_status: "suspended" })).toBe(false);
    expect(isPasAccessDeleted({ status: "activo", account_status: "suspended" })).toBe(true);
  });
});

describe("merged PAS admin list filters", () => {
  const sumatePending = { status: "pending", account_status: "pending" };
  const adminCreated = { status: "activo", account_status: "active" };
  const deleted = { status: "activo", account_status: "suspended" };
  const rejected = { status: "rechazado", account_status: "pending" };

  it("hides soft-deleted producers from Activos", () => {
    expect(matchesPasAdminFilter(adminCreated, "activos")).toBe(true);
    expect(matchesPasAdminFilter(deleted, "activos")).toBe(false);
    expect(matchesPasAdminFilter(deleted, "eliminados")).toBe(true);
    expect(matchesPasAdminFilter(sumatePending, "activos")).toBe(false);
  });

  it("keeps Sumate requests in Pendientes and admin-created accounts in Activos", () => {
    expect(matchesPasAdminFilter(sumatePending, "pendientes")).toBe(true);
    expect(matchesPasAdminFilter(adminCreated, "pendientes")).toBe(false);
    expect(matchesPasAdminFilter(adminCreated, "activos")).toBe(true);
  });

  it("defaults to Pendientes when there are open requests, otherwise Activos", () => {
    expect(defaultPasAdminFilter([sumatePending, adminCreated])).toBe("pendientes");
    expect(defaultPasAdminFilter([adminCreated, deleted])).toBe("activos");
    const counts = countPasAdminFilters([sumatePending, adminCreated, deleted, rejected]);
    expect(counts).toEqual({
      pendientes: 1,
      activos: 1,
      rechazados: 1,
      eliminados: 1,
      todos: 4,
    });
  });
});
