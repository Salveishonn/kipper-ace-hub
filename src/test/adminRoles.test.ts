import { describe, it, expect } from "vitest";
import { mapAdminRoleError } from "@/lib/adminRoles";

describe("mapAdminRoleError", () => {
  it("maps last-admin and self-revoke guards", () => {
    expect(mapAdminRoleError("LAST_ADMIN")).toMatch(/al menos un administrador/i);
    expect(mapAdminRoleError("CANNOT_REVOKE_SELF")).toMatch(/a vos mismo/i);
    expect(mapAdminRoleError("FORBIDDEN")).toMatch(/permiso/i);
    expect(mapAdminRoleError("PROFILE_NOT_FOUND")).toMatch(/encontramos/i);
  });
});
