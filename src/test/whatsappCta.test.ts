import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildWhatsAppUrl, isMobileClient, openWhatsAppCta } from "@/lib/whatsappCta";
import { siteConfig } from "@/lib/siteConfig";

const botmakerState = vi.hoisted(() => ({
  enabled: true,
  scriptUrl: "https://go.botmaker.com/rest/webchat/p/TEST/init.js",
}));

vi.mock("@/lib/botmakerWebchat", () => ({
  getBotmakerWebchatConfig: () => ({
    enabled: botmakerState.enabled,
    scriptUrl: botmakerState.enabled ? botmakerState.scriptUrl : null,
  }),
  loadBotmakerWebchatScript: vi.fn(async () => undefined),
}));

describe("whatsappCta", () => {
  const originalUA = navigator.userAgent;
  const assign = vi.fn();
  const open = vi.fn();

  beforeEach(() => {
    botmakerState.enabled = true;
    assign.mockReset();
    open.mockReset();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, assign },
    });
    window.open = open as typeof window.open;
    window.bmShow = vi.fn();
    window.bmMaximize = vi.fn();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: originalUA,
    });
    delete window.bmShow;
    delete window.bmMaximize;
  });

  it("builds wa.me urls with optional message", () => {
    expect(buildWhatsAppUrl()).toBe(siteConfig.whatsappUrl);
    expect(buildWhatsAppUrl("Hola")).toBe(
      `${siteConfig.whatsappUrl}?text=${encodeURIComponent("Hola")}`,
    );
  });

  it("detects mobile user agents", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    expect(isMobileClient()).toBe(true);

    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    });
    expect(isMobileClient()).toBe(false);
  });

  it("opens Botmaker on desktop when enabled", async () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    });

    await openWhatsAppCta({ message: "Hola" });

    expect(window.bmShow).toHaveBeenCalled();
    expect(window.bmMaximize).toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it("opens WhatsApp on mobile", async () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Mobile",
    });

    await openWhatsAppCta({ message: "Hola" });

    expect(assign).toHaveBeenCalledWith(
      `${siteConfig.whatsappUrl}?text=${encodeURIComponent("Hola")}`,
    );
    expect(window.bmShow).not.toHaveBeenCalled();
  });

  it("falls back to WhatsApp when Botmaker is disabled on desktop", async () => {
    botmakerState.enabled = false;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    });

    await openWhatsAppCta();

    expect(open).toHaveBeenCalledWith(siteConfig.whatsappUrl, "_blank", "noopener,noreferrer");
  });
});
