// Safe GA4 wrapper. No-ops if window.gtag is not loaded.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export type AnalyticsEvent =
  | "quote_started"
  | "quote_request_submitted"
  | "contact_form_submitted"
  | "producer_application_submitted"
  | "academy_landing_viewed"
  | "login_success"
  | "portal_claim_created"
  | "payment_proof_uploaded"
  | "whatsapp_click";

export function trackEvent(
  name: AnalyticsEvent,
  params: Record<string, unknown> = {}
) {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", name, params);
    }
  } catch {
    // Fail silently — analytics must never break the app.
  }
}
