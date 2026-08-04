import { describe, it, expect } from "vitest";
import { resolvePostAuthDestination } from "@/lib/authRouting";
import {
  isSelfRegistrationPending,
  isLegacyInviteFlow,
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
});
