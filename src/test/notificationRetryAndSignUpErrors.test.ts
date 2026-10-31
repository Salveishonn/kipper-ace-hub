import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { describeSignUpFailure } from "../../supabase/functions/_shared/signUpErrors";

describe("signup failure messages", () => {
  it("tells the applicant to fix an email that does not exist", () => {
    const failure = describeSignUpFailure({
      code: "email_address_invalid",
      message: 'Email address "a@b.com.ar" is invalid',
    });
    expect(failure?.status).toBe(400);
    expect(failure?.error).toContain("Ese email no parece existir");
  });

  it("does not blame other applicants when verification email cannot be sent", () => {
    for (const error of [
      { code: "over_email_send_rate_limit", message: "email rate limit exceeded" },
      { code: "unexpected_failure", message: "Error sending confirmation email" },
    ]) {
      const failure = describeSignUpFailure(error);
      expect(failure?.status).toBe(503);
      expect(failure?.error).toContain("No pudimos enviarte el email de verificación");
      expect(failure?.error).not.toContain("muchas solicitudes");
    }
  });

  it("always says the solicitud was not saved", () => {
    for (const error of [
      { code: "weak_password", message: "Password is known to be weak" },
      { code: "over_request_rate_limit", message: "Request rate limit reached" },
    ]) {
      expect(describeSignUpFailure(error)?.error).toContain("Tu solicitud no se registró");
    }
  });

  it("leaves existing accounts to the enumeration-safe flow", () => {
    expect(
      describeSignUpFailure({ code: "user_already_exists", message: "User already registered" }),
    ).toBeNull();
  });
});

describe("notification retry schedule", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20261031120000_notification_outbox_scheduled_retry.sql"),
    "utf8",
  );

  it("runs every five minutes and only calls the function when something is due", () => {
    expect(migration).toContain("'*/5 * * * *'");
    expect(migration).toMatch(/IF EXISTS \([\s\S]*notification_outbox_is_due[\s\S]*request_support_notification_processing/);
  });

  it("keeps the new functions private", () => {
    for (const fn of [
      "notification_outbox_is_due(public.notification_outbox)",
      "claim_notification_outbox(integer)",
      "process_due_notification_outbox()",
    ]) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION public.${fn} FROM PUBLIC, anon, authenticated`);
    }
  });
});
