import { describe, it, expect } from "vitest";
import {
  shouldActivatePasOnEmailConfirmed,
  shouldLinkPendingProfileOnInsert,
  isNormalSignupWithoutInvite,
  isInviteApplicationValid,
} from "@/lib/pasProvisioningRules";

const app = {
  id: "app-1",
  email: "Producer@Example.com",
  status: "invitado",
  invite_expires_at: new Date(Date.now() + 86400000).toISOString(),
  user_id: null as string | null,
};

const invitedUser = (overrides: Partial<{
  id: string;
  email: string;
  invited_at: string | null;
  email_confirmed_at: string | null;
  application_id: string | null;
}> = {}) => ({
  id: "user-1",
  email: "producer@example.com",
  invited_at: "2026-01-01T00:00:00Z",
  email_confirmed_at: null,
  application_id: "app-1",
  ...overrides,
});

describe("PAS provisioning rules", () => {
  it("send invite but do not open: no activation on insert-only (no email confirmed)", () => {
    const user = invitedUser();
    expect(shouldLinkPendingProfileOnInsert(app, user)).toBe(true);
    expect(
      shouldActivatePasOnEmailConfirmed(
        app,
        user,
        invitedUser({ email_confirmed_at: null }),
      ),
    ).toBe(false);
  });

  it("open valid invite: activation when email becomes confirmed", () => {
    const before = invitedUser({ email_confirmed_at: null });
    const after = invitedUser({ email_confirmed_at: "2026-01-02T00:00:00Z" });
    expect(shouldActivatePasOnEmailConfirmed(app, before, after)).toBe(true);
  });

  it("expired invite: no link and no activation", () => {
    const expiredApp = {
      ...app,
      invite_expires_at: new Date(Date.now() - 1000).toISOString(),
    };
    const user = invitedUser();
    expect(shouldLinkPendingProfileOnInsert(expiredApp, user)).toBe(false);
    expect(
      shouldActivatePasOnEmailConfirmed(
        expiredApp,
        user,
        invitedUser({ email_confirmed_at: "2026-01-02T00:00:00Z" }),
      ),
    ).toBe(false);
  });

  it("random confirmed user without invited application metadata: no provisioning", () => {
    const random = invitedUser({
      invited_at: null,
      application_id: null,
      email_confirmed_at: "2026-01-02T00:00:00Z",
    });
    expect(isNormalSignupWithoutInvite(random)).toBe(true);
    expect(isInviteApplicationValid(app, random)).toBe(false);
  });

  it("repeated activation: valid only once at confirmation boundary", () => {
    const confirmed = invitedUser({ email_confirmed_at: "2026-01-02T00:00:00Z" });
    expect(
      shouldActivatePasOnEmailConfirmed(app, confirmed, confirmed),
    ).toBe(false);
  });

  it("email mismatch: fail closed", () => {
    const user = invitedUser({ email: "other@example.com" });
    expect(isInviteApplicationValid(app, user)).toBe(false);
  });

  it("wrong application status: fail closed", () => {
    const user = invitedUser();
    expect(isInviteApplicationValid({ ...app, status: "nuevo" }, user)).toBe(false);
    expect(isInviteApplicationValid({ ...app, status: "activo" }, user)).toBe(false);
  });
});
