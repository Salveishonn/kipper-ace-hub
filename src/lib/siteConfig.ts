/** Public site links — override via Vite env in production. */
const whatsappNumber =
  (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined)?.trim() || "5491151615276";

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
  phoneDisplay: import.meta.env.VITE_PHONE_DISPLAY ?? "(011) 5161-5276",
  contactEmail:
    import.meta.env.VITE_CONTACT_EMAIL ?? "info@kipperseguros.com.ar",
  address:
    import.meta.env.VITE_OFFICE_ADDRESS ??
    "Colectora Este Ramal Escobar 959, 1623 Buenos Aires (Ingeniero Maschwitz)",
};

/** True when the WhatsApp number is still a known placeholder. */
export function isWhatsAppPlaceholder() {
  return (
    siteConfig.whatsappNumber === "5491112345678" ||
    siteConfig.whatsappNumber.includes("XXXX")
  );
}

export function getSupabaseFunctionUrl(name: string) {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/functions/v1/${name}`;
}
