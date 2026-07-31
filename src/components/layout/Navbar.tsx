import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { createTimeline, stagger } from "animejs";
import { useAuth } from "@/hooks/useAuth";
import logoKipper from "@/assets/logo-kipper.png";
import { CotizarButton, WhatsAppButton, PortalPasLink } from "@/components/ui/KipperCta";
import { motion } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/comunidad", label: "Comunidad" },
  { href: "/academy", label: "Academy" },
  { href: "/contacto", label: "Contacto" },
];

type NavbarProps = {
  overlay?: boolean;
};

export function Navbar({ overlay = false }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [solid, setSolid] = useState(!overlay);
  const location = useLocation();
  const { user, isAdmin, isProductor, loading, rolesLoaded } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLAnchorElement>(null);

  const getPortalHref = () => {
    if (loading || !rolesLoaded || !user) return "/login";
    if (isAdmin) return "/admin";
    if (isProductor) return "/productor";
    return "/login";
  };

  const portalLabel =
    !loading && rolesLoaded && user
      ? isAdmin
        ? "Admin"
        : isProductor
          ? "Portal Productores"
          : "Portal Productores"
      : "Portal Productores";

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!overlay) {
      setSolid(true);
      return;
    }
    const onScroll = () => {
      setSolid(window.scrollY > 48);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

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
      }).add(
        links,
        {
          opacity: [0, 1],
          translateX: [-12, 0],
          duration: motion.duration.standard,
          delay: stagger(motion.stagger.tight),
        },
        "-=120",
      ).add(
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

  const navSurface = solid || isOpen;

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-[background-color,box-shadow,border-color] duration-300",
        navSurface
          ? "bg-background/95 backdrop-blur-md border-b border-border/50 shadow-soft"
          : "bg-transparent border-b border-transparent",
      )}
      aria-label="Principal"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={cn("flex items-center justify-between transition-[height] duration-300", navSurface ? "h-16" : "h-20")}>
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <img
              src={logoKipper}
              alt="Kipper Seguros"
              className="h-11 w-auto transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="flex flex-col leading-none">
              <span className={cn("text-lg font-bold", navSurface ? "text-primary" : "text-primary")}>KIPPER</span>
              <span className={cn("text-[10px] tracking-wider", navSurface ? "text-muted-foreground" : "text-foreground/70")}>
                SEGUROS
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "nav-link text-sm",
                  location.pathname === link.href && "nav-link-active",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <WhatsAppButton size="sm" className="hidden xl:inline-flex" />
            <PortalPasLink href={getPortalHref()} label={portalLabel} />
            <CotizarButton size="sm" />
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="md:hidden p-2.5 rounded-lg text-foreground hover:bg-muted/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
          className="md:hidden fixed inset-0 top-16 z-40"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
        >
          <button
            type="button"
            className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
            aria-label="Cerrar menú"
            onClick={closeMenu}
          />
          <div
            ref={menuPanelRef}
            className="relative bg-background border-t border-border shadow-elevated max-h-[calc(100svh-4rem)] overflow-y-auto"
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
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-5 mt-3 border-t border-border flex flex-col gap-3">
                <div data-mobile-nav-cta>
                  <CotizarButton size="sm" className="w-full justify-center" />
                </div>
                <div data-mobile-nav-cta>
                  <WhatsAppButton size="sm" className="w-full justify-center" />
                </div>
                <div data-mobile-nav-cta>
                  <Link
                    to="/sumate"
                    onClick={closeMenu}
                    className="sumate-pas-link w-full justify-center"
                  >
                    Sumate como PAS
                  </Link>
                </div>
                <div data-mobile-nav-cta>
                  <PortalPasLink href={getPortalHref()} label={portalLabel} className="w-full justify-center" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
