import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildWelcomeEmail } from "../../supabase/functions/_shared/welcomeEmail";

const base = {
  fullName: "Ana María Pérez",
  email: "ana@example.com",
  siteUrl: "https://kipperseguros.com",
  emailVerified: true,
};

describe("PAS welcome email", () => {
  it("welcomes the producer by first name and links to the login page", () => {
    const { subject, html, text } = buildWelcomeEmail(base);
    expect(subject).toBe("Te damos la bienvenida a Organización Kipper");
    expect(html).toContain("Hola Ana,");
    expect(html).toContain('href="https://kipperseguros.com/login"');
    expect(text).toContain("https://kipperseguros.com/login");
  });

  it("uses a logo that ships with the site", () => {
    const { html } = buildWelcomeEmail(base);
    expect(html).toContain('src="https://kipperseguros.com/email/kipper-wordmark.png"');
    expect(existsSync(resolve(process.cwd(), "public/email/kipper-wordmark.png"))).toBe(true);
  });

  it("escapes applicant-provided values", () => {
    const { html } = buildWelcomeEmail({
      ...base,
      fullName: '<img src=x onerror="alert(1)">',
      email: "a<b>@example.com",
    });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("a<b>@example.com");
  });

  it("mentions email verification only when it is still pending", () => {
    expect(buildWelcomeEmail(base).text).not.toContain("verificar tu email");
    const pending = buildWelcomeEmail({ ...base, emailVerified: false });
    expect(pending.text).toContain("verificar tu email");
    expect(pending.html).toContain("verificar tu email");
  });

  it("still greets the producer when the name is empty", () => {
    expect(buildWelcomeEmail({ ...base, fullName: "  " }).html).toContain("Hola,");
  });
});
