import { describe, expect, it } from "vitest";
import { safeExternalUrl } from "@/lib/safeUrl";
import { getVideoEmbedUrl } from "@/lib/videoEmbed";
import { isAllowedOrigin } from "../../supabase/functions/_shared/cors";
import {
  firstOversizedField,
  randomDigits,
  signInProvesPassword,
  timingSafeEqual,
} from "../../supabase/functions/_shared/security";

describe("safeExternalUrl", () => {
  it("passes http(s) links", () => {
    expect(safeExternalUrl("https://www.canva.com/design/x")).toBe("https://www.canva.com/design/x");
    expect(safeExternalUrl(" http://example.com ")).toBe("http://example.com/");
  });

  it("drops script-capable and malformed values", () => {
    expect(safeExternalUrl("javascript:alert(document.cookie)")).toBeNull();
    expect(safeExternalUrl("JaVaScRiPt:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeExternalUrl("/relative")).toBeNull();
    expect(safeExternalUrl("")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });

  it("never embeds a javascript: video URL", () => {
    expect(getVideoEmbedUrl("javascript:alert(1)")).toBe("about:blank");
    expect(getVideoEmbedUrl("https://cdn.example.com/v.mp4")).toBe("https://cdn.example.com/v.mp4");
  });
});

describe("Edge Function CORS", () => {
  it("allows the site and this project's Vercel previews", () => {
    expect(isAllowedOrigin("https://kipperseguros.com")).toBe(true);
    expect(isAllowedOrigin("https://kipper-ace-hub.vercel.app")).toBe(true);
    expect(isAllowedOrigin("https://kipper-ace-hub-git-feat-x-salveishonn.vercel.app")).toBe(true);
  });

  it("rejects other Vercel deployments and look-alikes", () => {
    expect(isAllowedOrigin("https://attacker.vercel.app")).toBe(false);
    expect(isAllowedOrigin("https://kipper-ace-hub.vercel.app.attacker.com")).toBe(false);
    expect(isAllowedOrigin("http://kipper-ace-hub.vercel.app")).toBe(false);
  });
});

describe("Edge Function security helpers", () => {
  it("compares secrets in constant time semantics", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });

  it("makes six-digit codes without modulo bias", () => {
    // Bytes >= 250 would favour 0-5; they must be skipped, not wrapped.
    let call = 0;
    const fake = (buf: Uint8Array) => {
      buf.fill(call++ === 0 ? 255 : 7);
      return buf;
    };
    expect(randomDigits(6, fake)).toBe("777777");
    expect(randomDigits(6)).toMatch(/^\d{6}$/);
  });

  it("flags oversized public form fields", () => {
    expect(firstOversizedField({ message: "a".repeat(2001) }, { message: 2000 })).toBe("message");
    expect(firstOversizedField({ message: "ok", phone: null }, { message: 2000, phone: 50 })).toBeNull();
  });

  it("treats only a session or email_not_confirmed as proof of the password", () => {
    expect(signInProvesPassword({ hasSession: true })).toBe(true);
    expect(signInProvesPassword({ hasSession: false, errorCode: "email_not_confirmed" })).toBe(true);
    expect(signInProvesPassword({ hasSession: false, errorCode: "invalid_credentials" })).toBe(false);
    expect(signInProvesPassword({ hasSession: false })).toBe(false);
  });
});
