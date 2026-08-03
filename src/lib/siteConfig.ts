/** Public site links — override via Vite env in production. */
const whatsappNumber = (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined)?.trim() || "5491112345678";

/** Canonical production origin (apex). */
export const SITE_ORIGIN =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://kipperseguros.com";

export const siteConfig = {
  siteOrigin: SITE_ORIGIN,
  whatsappNumber,
  whatsappUrl: `https://wa.me/${whatsappNumber}`,
  instagramUrl:
    import.meta.env.VITE_INSTAGRAM_URL ?? "https://www.instagram.com/kipperseguros",
  facebookUrl:
    import.meta.env.VITE_FACEBOOK_URL ?? "https://www.facebook.com/kipperseguros",
  linkedinUrl:
    import.meta.env.VITE_LINKEDIN_URL ?? "https://www.linkedin.com/company/kipperseguros",
  phoneDisplay: import.meta.env.VITE_PHONE_DISPLAY ?? "(011) 4XXX-XXXX",
  contactEmail:
    import.meta.env.VITE_CONTACT_EMAIL ?? "info@kipperseguros.com.ar",
};

/** True when the WhatsApp number is still the known placeholder. */
export function isWhatsAppPlaceholder() {
  return siteConfig.whatsappNumber === "5491112345678";
}

export function getSupabaseFunctionUrl(name: string) {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/functions/v1/${name}`;
}
