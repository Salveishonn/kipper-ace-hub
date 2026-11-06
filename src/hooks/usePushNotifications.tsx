import { useCallback, useEffect, useState } from "react";
import {
  currentPushSubscription,
  disablePush,
  enablePush,
  isStandalone,
  pushSupport,
  refreshPushSubscription,
  registerServiceWorker,
  type PushSupport,
} from "@/lib/push";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferredInstall: InstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e as InstallPromptEvent;
    window.dispatchEvent(new Event("kipper-install-available"));
  });
}

/** Registers the service worker for portal users and keeps their push subscription fresh. */
export function usePortalServiceWorker(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    void registerServiceWorker().then(() => refreshPushSubscription());
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "kipper-push-resubscribe") void enablePush().catch(() => undefined);
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [enabled]);
}

export function usePushNotifications() {
  const [support] = useState<PushSupport>(() => pushSupport());
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [canInstall, setCanInstall] = useState(Boolean(deferredInstall));
  const [installed] = useState(() => (typeof window !== "undefined" ? isStandalone() : false));

  useEffect(() => {
    let alive = true;
    void currentPushSubscription().then((s) => alive && setEnabled(Boolean(s) && Notification.permission === "granted"));
    const onInstall = () => setCanInstall(true);
    window.addEventListener("kipper-install-available", onInstall);
    return () => {
      alive = false;
      window.removeEventListener("kipper-install-available", onInstall);
    };
  }, []);

  const turnOn = useCallback(async () => {
    setBusy(true);
    try {
      await enablePush();
      setEnabled(true);
    } finally {
      setBusy(false);
    }
  }, []);

  const turnOff = useCallback(async () => {
    setBusy(true);
    try {
      await disablePush();
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferredInstall) return;
    await deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    setCanInstall(false);
  }, []);

  return { support, enabled, busy, turnOn, turnOff, canInstall, install, installed };
}

export type PortalApp = "productor" | "admin";

const APP_MANIFEST: Record<PortalApp, { href: string; title: string }> = {
  productor: { href: "/manifest.webmanifest", title: "Kipper PAS" },
  admin: { href: "/manifest-admin.webmanifest", title: "Kipper Admin" },
};

/**
 * Points the page at the right installable app. index.html picks it on first load, but an
 * admin who signs in at /login lands on /admin through client-side navigation.
 */
export function usePortalManifest(app: PortalApp) {
  useEffect(() => {
    const { href, title } = APP_MANIFEST[app];
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute("content", title);
  }, [app]);
}

/** Shows the unread count on the installed app icon, where the platform supports it. */
export function useAppBadge(count: number) {
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!nav.setAppBadge || !isStandalone()) return;
    void (count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge?.())?.catch(() => undefined);
  }, [count]);
}
