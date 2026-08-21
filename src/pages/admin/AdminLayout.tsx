import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Settings, LogOut,
  Menu, X, UserCheck, MessageSquare, Mail,
  FileText, BookOpen, Palette, Newspaper, Shield,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { UserAvatar } from "@/components/shared/UserAvatar";
import logoKipper from "@/assets/logo-kipper.png";

const adminLinks = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/solicitudes-pas", label: "Solicitudes PAS", icon: Mail },
  { href: "/admin/productores", label: "Productores", icon: UserCheck },
  { href: "/admin/administradores", label: "Administradores", icon: Shield },
  { href: "/admin/academy", label: "Academy", icon: BookOpen },
  { href: "/admin/recursos-graficos", label: "Recursos gráficos", icon: Palette },
  { href: "/admin/novedades", label: "Novedades", icon: Newspaper },
  { href: "/admin/consultas", label: "Consultas", icon: MessageSquare },
];

const siteLinks = [
  { href: "/admin/blog", label: "Blog público", icon: FileText },
  { href: "/admin/config", label: "Configuración del sitio", icon: Settings },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const renderLink = (link: { href: string; label: string; icon: typeof Mail }) => {
    const isActive = location.pathname === link.href ||
      (link.href !== '/admin' && location.pathname.startsWith(link.href));
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
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary text-primary-foreground transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navegación de administración"
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-primary-foreground/20">
            <Link to="/" className="flex items-center gap-3">
              <img src={logoKipper} alt="Kipper" className="h-10 brightness-0 invert" />
              <div>
                <span className="font-bold">KIPPER</span>
                <span className="text-xs opacity-80 block">Administración</span>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {adminLinks.map(renderLink)}

            <p className="px-4 pt-5 pb-1 text-[11px] uppercase tracking-wider opacity-60">
              Sitio público
            </p>
            {siteLinks.map(renderLink)}
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
                <p className="font-medium text-sm truncate">{profile?.full_name || 'Admin'}</p>
                <p className="text-xs opacity-80 truncate">{profile?.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
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
            <span className="font-semibold">Administración</span>
            <div className="w-10" />
          </div>
        </header>
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
