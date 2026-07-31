/** Public site links — override via Vite env in production. */
export const siteConfig = {
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER ?? "5491112345678",
  whatsappUrl: `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER ?? "5491112345678"}`,
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

export function getSupabaseFunctionUrl(name: string) {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/functions/v1/${name}`;
}
