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
