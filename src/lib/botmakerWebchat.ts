/**
 * Botmaker Webchat — public config only.
 *
 * Official snippet shape (from Botmaker Channels → Webchat → Installation):
 *   https://go.botmaker.com/rest/webchat/p/<PUBLIC_CHANNEL_ID>/init.js
 *
 * Secrets never belong in VITE_* vars. The init.js URL is public by design.
 */

export type BotmakerWebchatConfig = {
  enabled: boolean;
  /** Full public init.js URL from the Botmaker installation tab. */
  scriptUrl: string | null;
};

declare global {
  interface Window {
    BOTMAKER_VAR?: Record<string, string>;
    bmHide?: () => void;
    bmShow?: () => void;
    bmMinimize?: () => void;
    bmMaximize?: () => void;
  }
}

export function getBotmakerWebchatConfig(): BotmakerWebchatConfig {
  const enabled =
    String(import.meta.env.VITE_BOTMAKER_WEBCHAT_ENABLED ?? "false").toLowerCase() ===
    "true";
  const scriptUrl = (import.meta.env.VITE_BOTMAKER_WEBCHAT_SCRIPT_URL as string | undefined)?.trim() || null;

  return {
    enabled: enabled && Boolean(scriptUrl),
    scriptUrl: enabled ? scriptUrl : null,
  };
}

/** Paths where the floating assistant must never mount. */
export function shouldMountPublicAssistant(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/productor")) return false;
  if (pathname === "/login" || pathname.startsWith("/login/")) return false;
  if (pathname === "/registro" || pathname.startsWith("/registro/")) return false;
  return true;
}

const SCRIPT_ATTR = "data-kipper-botmaker-webchat";

/**
 * Loads the official Botmaker Webchat init script once.
 * Resolves when the script loads; rejects on network/error/timeout.
 */
export function loadBotmakerWebchatScript(scriptUrl: string, timeoutMs = 12000): Promise<void> {
  if (typeof document === "undefined") {
    return Promise.reject(new Error("No document"));
  }

  const existing = document.querySelector<HTMLScriptElement>(`script[${SCRIPT_ATTR}]`);
  if (existing) {
    return existing.dataset.loaded === "true"
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error("Botmaker script failed")), {
            once: true,
          });
        });
  }

  return new Promise((resolve, reject) => {
    const js = document.createElement("script");
    js.type = "text/javascript";
    js.async = true;
    js.src = scriptUrl;
    js.setAttribute(SCRIPT_ATTR, "true");

    const timer = window.setTimeout(() => {
      reject(new Error("Botmaker script timed out"));
    }, timeoutMs);

    js.onload = () => {
      window.clearTimeout(timer);
      js.dataset.loaded = "true";
      resolve();
    };
    js.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Botmaker script failed to load"));
    };

    document.body.appendChild(js);
  });
}
