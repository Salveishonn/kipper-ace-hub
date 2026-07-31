import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logoKipper from "@/assets/logo-kipper.png";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/comunidad", label: "Comunidad" },
  { href: "/academy", label: "Academy" },
  { href: "/contacto", label: "Contacto" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin, isProductor, loading, rolesLoaded } = useAuth();

  // Determine the correct CTA based on auth state and role
  const getAuthCTA = () => {
    if (loading || !rolesLoaded) {
      return { href: "/login", label: "Portal PAS", variant: "primary" };
    }
    
    if (!user) {
      return { href: "/login", label: "Portal PAS", variant: "primary" };
    }

    if (isAdmin) {
      return { href: "/admin", label: "Admin", variant: "primary" };
    }
    if (isProductor) {
      return { href: "/productor", label: "Portal PAS", variant: "primary" };
    }
    return { href: "/login", label: "Portal PAS", variant: "primary" };
  };

  const authCTA = getAuthCTA();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={logoKipper}
              alt="Kipper Seguros"
              className="h-12 w-auto transition-transform duration-300 group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-primary">KIPPER</span>
              <span className="text-xs text-muted-foreground tracking-wider">SEGUROS</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`nav-link ${
                  location.pathname === link.href ? "nav-link-active" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/cotizar"
              className="btn-hero-outline text-sm px-5 py-2.5"
            >
              Cotizar
            </Link>
            <Link
              to={authCTA.href}
              className="btn-hero text-sm px-5 py-2.5"
            >
              {authCTA.label}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-foreground"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-background border-t border-border animate-slide-up">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsOpen(false)}
                className={`block py-2 px-3 rounded-lg transition-colors ${
                  location.pathname === link.href
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 flex flex-col gap-3 border-t border-border">
              <Link
                to="/cotizar"
                onClick={() => setIsOpen(false)}
                className="btn-hero-outline text-center text-sm py-3"
              >
                Cotizar mi vehículo
              </Link>
              <Link
                to={authCTA.href}
                onClick={() => setIsOpen(false)}
                className="btn-hero text-center text-sm py-3"
              >
                {authCTA.label}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
