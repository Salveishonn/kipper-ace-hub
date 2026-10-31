import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { escapeHtml, renderKipperEmail } from "../../supabase/functions/_shared/emailLayout";
import { KIPPER_FROM } from "../../supabase/functions/_shared/sendEmail";
import { AUTH_EMAILS } from "../../supabase/templates/authEmails";

const functionsDir = resolve(process.cwd(), "supabase/functions");

describe("Kipper email identity", () => {
  it("sends every function email through the shared sender", () => {
    expect(KIPPER_FROM).toBe("Organización Kipper <notificaciones@kipperseguros.com>");
    const direct = readdirSync(functionsDir, { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".ts"))
      .filter((file) => readFileSync(resolve(functionsDir, file), "utf8").includes("api.resend.com"))
      .map((file) => file.replaceAll("\\", "/"));
    expect(direct).toEqual(["_shared/sendEmail.ts"]);
  });

  it("escapes values passed to the layout", () => {
    const html = renderKipperEmail({
      subject: "<s>",
      preheader: "<p>",
      eyebrow: "<e>",
      headline: "<h>",
      bodyHtml: "",
      cta: { label: "<l>", url: 'https://x.test/"><script>' },
      footerNote: "<f>",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain(escapeHtml("<h>"));
  });
});

describe("Supabase Auth email templates", () => {
  it.each(AUTH_EMAILS.map((email) => [email.key, email] as const))("%s is branded", (_key, email) => {
    expect(email.html).toContain("kipper-wordmark.png");
    expect(email.html).toContain("#601410");
    expect(email.subject).toContain("Organización Kipper");
    expect(email.html).toContain(email.key === "reauthentication" ? "{{ .Token }}" : 'href="{{ .ConfirmationURL }}"');
  });

  it("keeps the generated files in sync", () => {
    for (const email of AUTH_EMAILS) {
      const file = resolve(process.cwd(), `supabase/templates/${email.key}.html`);
      expect(readFileSync(file, "utf8").replaceAll("\r\n", "\n")).toBe(`${email.html}\n`);
    }
  });
});
