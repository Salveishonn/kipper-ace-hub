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

export const PUBLIC_ASSISTANT_BODY_CLASS = "kipper-no-assistant";

const BOTMAKER_SELECTORS = [
  'iframe[name="Botmaker"]',
  'iframe[title="Botmaker"]',
  "#botmaker-webchat-container",
].join(", ");

const HIDE_RETRY_MS = [0, 500, 1500, 3000];

let hideTimers: number[] = [];
let hideObserver: MutationObserver | null = null;

function hideElement(el: HTMLElement) {
  el.setAttribute("data-kipper-hidden", "1");
  el.style.setProperty("display", "none", "important");
  el.style.setProperty("visibility", "hidden", "important");
  el.style.setProperty("pointer-events", "none", "important");
  el.style.setProperty("opacity", "0", "important");
}

function restoreHiddenElements() {
  document.querySelectorAll<HTMLElement>("[data-kipper-hidden]").forEach((el) => {
    el.removeAttribute("data-kipper-hidden");
    el.style.removeProperty("display");
    el.style.removeProperty("visibility");
    el.style.removeProperty("pointer-events");
    el.style.removeProperty("opacity");
  });
}

/** Hide the official Botmaker launcher (classless wrapper + nameless-src iframe). */
export function forceHideBotmakerDom(): void {
  if (typeof document === "undefined") return;
  window.bmHide?.();
  window.bmMinimize?.();
  document.querySelectorAll(BOTMAKER_SELECTORS).forEach((node) => {
    const el = node as HTMLElement;
    hideElement(el);
    const wrap = el.parentElement;
    if (wrap && wrap !== document.body && wrap !== document.documentElement) {
      hideElement(wrap);
    }
  });
}

function stopHideLoop() {
  hideTimers.forEach((id) => window.clearTimeout(id));
  hideTimers = [];
  hideObserver?.disconnect();
  hideObserver = null;
}

function startHideLoop() {
  stopHideLoop();
  const run = () => {
    if (!document.body.classList.contains(PUBLIC_ASSISTANT_BODY_CLASS)) {
      stopHideLoop();
      return;
    }
    forceHideBotmakerDom();
  };
  hideTimers = HIDE_RETRY_MS.map((ms) => window.setTimeout(run, ms));
  if (typeof MutationObserver !== "undefined") {
    hideObserver = new MutationObserver(run);
    hideObserver.observe(document.body, { childList: true, subtree: true });
  }
}

/** Paths where the floating assistant must never mount. */
export function shouldMountPublicAssistant(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/productor")) return false;
  if (pathname.startsWith("/auth/")) return false;
  if (pathname === "/login" || pathname.startsWith("/login/")) return false;
  if (pathname === "/registro" || pathname.startsWith("/registro/")) return false;
  if (pathname === "/recuperar-contrasena" || pathname.startsWith("/recuperar-contrasena/")) return false;
  if (pathname === "/restablecer-contrasena" || pathname.startsWith("/restablecer-contrasena/")) return false;
  return true;
}

/**
 * Hide leftover Botmaker DOM when leaving public pages.
 * The official widget paints onto document.body and survives MainLayout unmount.
 */
export function syncPublicAssistant(pathname: string): void {
  if (typeof document === "undefined") return;
  const allowed = shouldMountPublicAssistant(pathname);
  if (allowed) {
    document.body.classList.remove(PUBLIC_ASSISTANT_BODY_CLASS);
    stopHideLoop();
    restoreHiddenElements();
    window.bmShow?.();
    return;
  }
  document.body.classList.add(PUBLIC_ASSISTANT_BODY_CLASS);
  forceHideBotmakerDom();
  startHideLoop();
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
