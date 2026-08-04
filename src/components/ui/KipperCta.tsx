import { Link } from "react-router-dom";
import { ArrowRight, Briefcase } from "lucide-react";
import { siteConfig } from "@/lib/siteConfig";
import { cn } from "@/lib/utils";

type CotizarProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
  /** Dominant quote CTA. Default for public conversion surfaces. */
  variant?: "quote" | "hero" | "onBrand";
};

export function CotizarButton({
  className,
  size = "md",
  label = "Cotizar ahora",
  variant = "quote",
}: CotizarProps) {
  const sizes = {
    sm: "text-sm px-5 py-2.5",
    md: "px-8 py-4",
    lg: "px-10 py-4 text-lg",
  };

  const variantClass =
    variant === "onBrand"
      ? "quote-primary-on-brand"
      : variant === "hero"
        ? "btn-hero"
        : "quote-primary";

  return (
    <Link
      to="/cotizar"
      data-cta="quote-primary"
      className={cn(
        variantClass,
        "inline-flex items-center justify-center gap-2 group/kipper-cta",
        sizes[size],
        className,
      )}
    >
      {label}
      <ArrowRight
        size={size === "sm" ? 16 : 18}
        className="transition-transform duration-200 group-hover/kipper-cta:translate-x-0.5 group-active/kipper-cta:translate-x-1"
        aria-hidden
      />
    </Link>
  );
}

type WhatsAppProps = {
  className?: string;
  size?: "sm" | "md";
  label?: string;
  message?: string;
};

export function WhatsAppButton({
  className,
  size = "md",
  label = "WhatsApp",
  message,
}: WhatsAppProps) {
  const href = message
    ? `${siteConfig.whatsappUrl}?text=${encodeURIComponent(message)}`
    : siteConfig.whatsappUrl;

  const sizes = {
    sm: "text-sm px-5 py-2.5",
    md: "px-8 py-4",
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-cta="whatsapp"
      className={cn("btn-whatsapp inline-flex items-center justify-center gap-2", sizes[size], className)}
    >
      <svg viewBox="0 0 24 24" className="w-[1.1em] h-[1.1em] fill-current shrink-0" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      {label}
    </a>
  );
}

type PortalPasProps = {
  className?: string;
  href?: string;
  /** Desktop / default label */
  label?: string;
  /** Compact label for narrow viewports; falls back to label */
  mobileLabel?: string;
  showSecondary?: boolean;
  /** Light chrome for the maroon brand header */
  variant?: "default" | "onBrand";
};

/**
 * Internal producer access — visually secondary to Cotizar.
 * Never styled as a customer conversion CTA.
 */
export function PortalPasLink({
  className,
  href = "/login",
  label = "Acceso productores",
  mobileLabel = "Portal Productores",
  showSecondary = true,
  variant = "default",
}: PortalPasProps) {
  const onBrand = variant === "onBrand";
  return (
    <Link
      to={href}
      data-cta="portal-internal"
      className={cn(onBrand ? "portal-pas-link-brand" : "portal-pas-link", className)}
    >
      <Briefcase size={15} className="shrink-0 opacity-80" aria-hidden />
      <span className="flex flex-col items-start leading-tight">
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{mobileLabel}</span>
        {showSecondary && (
          <span
            className={cn(
              "hidden lg:inline text-[10px] font-normal tracking-wide",
              onBrand ? "text-white/65" : "text-muted-foreground",
            )}
          >
            Área interna
          </span>
        )}
      </span>
    </Link>
  );
}

export function SumatePasLink({ className }: { className?: string }) {
  return (
    <Link to="/sumate" className={cn("sumate-pas-link", className)} data-cta="sumate-pas">
      Sumate como PAS
    </Link>
  );
}
