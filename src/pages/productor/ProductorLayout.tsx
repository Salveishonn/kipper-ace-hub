import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home, User, LogOut, Menu, X,
  Palette, Newspaper, BookOpen, MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { KipperBrandLockup } from "@/components/layout/KipperBrandLockup";

const productorLinks = [
  { href: "/productor", label: "Inicio", icon: Home },
  { href: "/productor/academy", label: "Academy", icon: BookOpen },
  { href: "/productor/recursos", label: "Recursos gráficos", icon: Palette },
  { href: "/productor/novedades", label: "Novedades", icon: Newspaper },
  { href: "/productor/consultas", label: "Consultas", icon: MessageSquare },
  { href: "/productor/perfil", label: "Mi perfil", icon: User },
];

const ProductorLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut, isAdmin } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside
        className={`kipper-header-bar fixed inset-y-0 left-0 z-50 w-64 overflow-hidden transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navegación del portal"
      >
        <div className="flex flex-col h-full">
          <KipperBrandLockup />

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {productorLinks.map((link) => {
              const isActive =
                location.pathname === link.href ||
                (link.href !== "/productor" && location.pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-sm ${
                    isActive ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <link.icon size={18} aria-hidden />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-primary-foreground/20">
            <div className="flex items-center gap-3 mb-4">
              <UserAvatar
                profile={
                  profile
                    ? { full_name: profile.full_name, email: profile.email, avatar_url: profile.avatar_url }
                    : null
                }
                className="h-10 w-10"
              />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{profile?.full_name || "Productor"}</p>
                <p className="text-xs opacity-80 truncate">{profile?.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity text-sm w-full"
            >
              <LogOut size={16} aria-hidden />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-foreground/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border lg:hidden">
          <div className="flex items-center justify-between p-4">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-2"
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {sidebarOpen ? <X size={24} aria-hidden /> : <Menu size={24} aria-hidden />}
            </button>
            <span className="font-semibold">Portal Productores</span>
            <div className="w-10" />
          </div>
        </header>
        <main className="p-6 lg:p-8 max-w-6xl mx-auto">
          {isAdmin && (
            <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p>
                Estás viendo el portal como lo ven los productores, incluidos videos y documentos de
                Academy.
              </p>
              <Link to="/admin/academy" className="text-primary font-medium hover:underline shrink-0">
                Volver a administrar Academy
              </Link>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProductorLayout;
