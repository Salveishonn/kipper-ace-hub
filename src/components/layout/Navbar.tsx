import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { createTimeline, stagger } from "animejs";
import { useAuth } from "@/hooks/useAuth";
import kipperMarkK from "@/assets/kipper-mark-k.png";
import { CotizarButton, PortalPasLink } from "@/components/ui/KipperCta";
import { siteConfig } from "@/lib/siteConfig";
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
      className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--kipper-header))] text-primary-foreground shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)]"
      aria-label="Principal"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[4.25rem] sm:h-[4.75rem]">
          <Link
            to="/"
            className="flex items-center gap-2.5 sm:gap-3 group shrink-0 min-w-0"
            aria-label="Organización Kipper — Inicio"
          >
            <img
              src={kipperMarkK}
              alt=""
              aria-hidden
              className="h-12 sm:h-14 w-auto object-contain mix-blend-screen transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="flex flex-col leading-none text-white">
              <span className="text-[9px] sm:text-[10px] font-medium tracking-[0.28em] uppercase opacity-95">
                Organización
              </span>
              <span className="text-xl sm:text-2xl font-extrabold tracking-wide uppercase">
                Kipper
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-6 xl:gap-7">
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

          <div className="hidden md:flex items-center gap-2.5">
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
            className="md:hidden p-2.5 rounded-lg text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-expanded={isOpen}
            aria-controls="mobile-nav-panel"
          >
            <span className="sr-only">{isOpen ? "Cerrar menú" : "Abrir menú"}</span>
            {isOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>
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
            className="relative bg-[hsl(var(--kipper-header))] border-t border-white/10 shadow-elevated max-h-[calc(100svh-4.25rem)] overflow-y-auto"
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
                    href={siteConfig.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMenu}
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
