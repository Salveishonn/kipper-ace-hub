import { supabase } from "@/integrations/supabase/client";

/** VAPID public key (P-256, base64url). The private half lives in Supabase Vault. */
export const VAPID_PUBLIC_KEY =
  "BCP6M1w1YsiOQqsW_foICW9wtNJAjombqvX6M0EHrSFZEeWR_GjhP0ltypQK1taFjuv1Wo98FkrXOML0mZSCHIQ";

export type PushSupport =
  | "supported"
  | "unsupported"
  /** iPhone/iPad Safari: push only works once the portal is added to the home screen. */
  | "ios-needs-install";

export function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const hasApis = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (isIos() && !isStandalone()) return "ios-needs-install";
  return hasApis ? "supported" : "unsupported";
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (e) {
    console.error("service worker registration failed", e);
    return null;
  }
}

async function readyRegistration() {
  const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await registerServiceWorker());
  if (!reg) throw new Error("Este navegador no permite notificaciones");
  return navigator.serviceWorker.ready;
}

async function saveSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  const { error } = await supabase.rpc("register_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? "",
    p_auth: json.keys?.auth ?? "",
    p_user_agent: navigator.userAgent.slice(0, 400),
  });
  if (error) throw error;
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "supported") return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Asks for permission, subscribes this device and stores it for the signed-in user. */
export async function enablePush(): Promise<void> {
  if (pushSupport() !== "supported") throw new Error("Este dispositivo no admite notificaciones");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Bloqueaste las notificaciones. Activalas desde la configuración del navegador."
        : "No se activaron las notificaciones",
    );
  }
  const reg = await readyRegistration();
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));
  await saveSubscription(sub);
}

export async function disablePush(): Promise<void> {
  const sub = await currentPushSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

/** Keeps the stored subscription current (rotated keys, or a different user on this device). */
export async function refreshPushSubscription(): Promise<void> {
  if (pushSupport() !== "supported" || Notification.permission !== "granted") return;
  const sub = await currentPushSubscription();
  if (sub) await saveSubscription(sub).catch(() => undefined);
}
