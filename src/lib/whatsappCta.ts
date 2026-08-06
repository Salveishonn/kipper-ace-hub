import {
  getBotmakerWebchatConfig,
  loadBotmakerWebchatScript,
} from "@/lib/botmakerWebchat";
import { siteConfig } from "@/lib/siteConfig";

declare global {
  interface Window {
    bmSendMessage?: (message: string) => void;
  }
}

/** Coarse mobile detection for CTA routing (phone/tablet → WhatsApp app). */
export function isMobileClient(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }
  // iPadOS 13+ can report as Mac; treat touch Macs with coarse pointer as mobile.
  if (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua)) {
    return true;
  }
  return false;
}

export function buildWhatsAppUrl(message?: string): string {
  if (!message?.trim()) return siteConfig.whatsappUrl;
  return `${siteConfig.whatsappUrl}?text=${encodeURIComponent(message.trim())}`;
}

function openWhatsAppHref(href: string) {
  // Prefer same-tab navigation on mobile so the WhatsApp app can intercept.
  if (isMobileClient()) {
    window.location.assign(href);
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer");
}

async function openBotmakerChat(message?: string): Promise<boolean> {
  const { enabled, scriptUrl } = getBotmakerWebchatConfig();
  if (!enabled || !scriptUrl) return false;

  try {
    await loadBotmakerWebchatScript(scriptUrl);
    window.bmShow?.();
    window.bmMaximize?.();
    const trimmed = message?.trim();
    if (trimmed && typeof window.bmSendMessage === "function") {
      // Give the widget a tick to mount before injecting the seed message.
      window.setTimeout(() => {
        try {
          window.bmSendMessage?.(trimmed);
        } catch {
          /* ignore */
        }
      }, 400);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Public WhatsApp CTAs:
 * - Mobile → open WhatsApp (app / wa.me)
 * - Desktop with Botmaker enabled → open in-page Botmaker webchat
 * - Otherwise → WhatsApp web / wa.me in a new tab
 */
export async function openWhatsAppCta(options?: {
  message?: string;
}): Promise<void> {
  const href = buildWhatsAppUrl(options?.message);

  if (isMobileClient()) {
    openWhatsAppHref(href);
    return;
  }

  const opened = await openBotmakerChat(options?.message);
  if (!opened) {
    openWhatsAppHref(href);
  }
}

/** Click handler for anchors that keep a real WhatsApp href for progressive enhancement. */
export function whatsappCtaClickHandler(
  event: { preventDefault: () => void },
  options?: { message?: string },
) {
  event.preventDefault();
  void openWhatsAppCta(options);
}
