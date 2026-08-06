import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { createTimeline, stagger } from "animejs";
import { useAuth } from "@/hooks/useAuth";
import kipperMarkK from "@/assets/kipper-mark-k.png";
import { CotizarButton, PortalPasLink } from "@/components/ui/KipperCta";
import { buildWhatsAppUrl, whatsappCtaClickHandler } from "@/lib/whatsappCta";
import { motion } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/seguros", label: "Seguros" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/comunidad", label: "Comunidad" },
  { href: "/academy", label: "Academy" },
  { href: "/contacto", label: "Contacto" },
];

type NavbarProps = {
  /** @deprecated Brand bar is always solid; kept for MainLayout compat. */
  overlay?: boolean;
};

export function Navbar({ overlay: _overlay = false }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin, loading, rolesLoaded, getDefaultDashboard } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLAnchorElement>(null);

  const getPortalHref = () => {
    if (loading || !rolesLoaded || !user) return "/login";
    return getDefaultDashboard();
  };

  const portalLabel =
    !loading && rolesLoaded && user && isAdmin ? "Admin" : "Acceso productores";
  const portalMobileLabel =
    !loading && rolesLoaded && user && isAdmin ? "Admin" : "Portal Productores";

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const panel = menuPanelRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (panel && !reduced) {
      const links = panel.querySelectorAll("[data-mobile-nav-item]");
      const ctas = panel.querySelectorAll("[data-mobile-nav-cta]");
      const tl = createTimeline({ defaults: { ease: motion.easing.out } });
      tl.add(panel, {
        opacity: [0, 1],
        translateY: [-8, 0],
        duration: motion.duration.nav,
      })
        .add(
          links,
          {
            opacity: [0, 1],
            translateX: [-12, 0],
            duration: motion.duration.standard,
            delay: stagger(motion.stagger.tight),
          },
          "-=120",
        )
        .add(
          ctas,
          {
            opacity: [0, 1],
            translateY: [8, 0],
            duration: motion.duration.standard,
            delay: stagger(motion.stagger.tight),
          },
          "-=280",
        );
    }

    firstFocusRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const closeMenu = useCallback(() => setIsOpen(false), []);

  return (
    <nav
      className="kipper-header-bar fixed top-0 left-0 right-0 z-50 h-[4.25rem] sm:h-[4.75rem] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)]"
      aria-label="Principal"
    >
      <div className="relative h-full w-full">
        {/* Brand: K flush to left / top / bottom edges */}
        <Link
          to="/"
          className="absolute left-0 top-0 bottom-0 z-20 flex items-stretch gap-2 sm:gap-2.5 group min-w-0"
          aria-label="Organización Kipper — Inicio"
        >
          <img
            src={kipperMarkK}
            alt=""
            aria-hidden
            className="block h-full w-auto object-cover object-left mix-blend-screen"
          />
          <div className="flex flex-col justify-center leading-none text-white pr-2">
            <span className="text-[9px] sm:text-[10px] font-medium tracking-[0.28em] uppercase opacity-95">
              Organización
            </span>
            <span className="font-kipper text-[1.85rem] sm:text-[2.35rem] font-normal tracking-[0.04em] uppercase leading-none mt-0.5">
              Kipper
            </span>
          </div>
        </Link>

        {/* Desktop: nav links centered */}
        <div className="hidden lg:flex absolute inset-0 z-10 items-center justify-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-5 xl:gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "nav-link-brand text-sm",
                  location.pathname === link.href && "nav-link-brand-active",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Cotizar + Productores flush right */}
        <div className="hidden md:flex absolute right-3 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 z-20 items-center gap-2.5">
          <PortalPasLink
            href={getPortalHref()}
            label={portalLabel}
            mobileLabel={portalMobileLabel}
            showSecondary={!isAdmin}
            variant="onBrand"
          />
          <CotizarButton
            size="sm"
            label="Cotizar ahora"
            variant="onBrand"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-lg text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-expanded={isOpen}
          aria-controls="mobile-nav-panel"
        >
          <span className="sr-only">{isOpen ? "Cerrar menú" : "Abrir menú"}</span>
          {isOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
        </button>
      </div>

      {isOpen && (
        <div
          id="mobile-nav-panel"
          ref={menuRef}
          className="md:hidden fixed inset-0 top-[4.25rem] z-40"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
        >
          <button
            type="button"
            className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
            aria-label="Cerrar menú"
            onClick={closeMenu}
          />
          <div
            ref={menuPanelRef}
            className="kipper-header-bar relative border-t border-white/10 shadow-elevated max-h-[calc(100svh-4.25rem)] overflow-y-auto"
          >
            <div className="px-4 py-5 space-y-1">
              {navLinks.map((link, i) => (
                <Link
                  key={link.href}
                  ref={i === 0 ? firstFocusRef : undefined}
                  to={link.href}
                  onClick={closeMenu}
                  data-mobile-nav-item
                  className={cn(
                    "block py-3 px-3 rounded-lg text-base font-medium transition-colors",
                    location.pathname === link.href
                      ? "bg-white/15 text-white"
                      : "text-white/85 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-5 mt-3 border-t border-white/15 flex flex-col gap-3">
                <div data-mobile-nav-cta>
                  <CotizarButton
                    size="sm"
                    label="Cotizar ahora"
                    variant="onBrand"
                    className="w-full justify-center"
                  />
                </div>
                <div data-mobile-nav-cta>
                  <PortalPasLink
                    href={getPortalHref()}
                    label={portalLabel}
                    mobileLabel={portalMobileLabel}
                    showSecondary={false}
                    variant="onBrand"
                    className="w-full justify-center"
                  />
                </div>
                <div data-mobile-nav-cta>
                  <Link
                    to="/sumate"
                    onClick={closeMenu}
                    className="sumate-pas-link-brand w-full justify-center"
                  >
                    Sumate como PAS
                  </Link>
                </div>
                <div data-mobile-nav-cta>
                  <a
                    href={buildWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      closeMenu();
                      whatsappCtaClickHandler(e);
                    }}
                    className="block py-3 px-3 rounded-lg text-base font-medium text-white/85 hover:bg-white/10"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
