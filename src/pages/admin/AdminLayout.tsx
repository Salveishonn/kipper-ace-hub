import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Settings, LogOut,
  Menu, X, UserCheck, MessageSquare,
  FileText, BookOpen, Palette, Newspaper, Shield, MessagesSquare, BellRing, Bell,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConsultasLive, useConsultaUnreadCount } from "@/hooks/useSupportTickets";
import { UnreadBadge } from "@/components/consultas/UnreadBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { KipperBrandLockup } from "@/components/layout/KipperBrandLockup";
import { useAppBadge, usePortalManifest, usePortalServiceWorker } from "@/hooks/usePushNotifications";
import { PushPromptBanner } from "@/components/notifications/PushPromptBanner";

const adminLinks = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/productores", label: "Productores", icon: UserCheck },
  { href: "/admin/administradores", label: "Administradores", icon: Shield },
  { href: "/admin/academy", label: "Academy", icon: BookOpen },
  { href: "/admin/recursos-graficos", label: "Recursos gráficos", icon: Palette },
  { href: "/admin/novedades", label: "Novedades", icon: Newspaper },
  { href: "/admin/consultas", label: "Consultas", icon: MessageSquare },
  { href: "/admin/foro", label: "Foro", icon: MessagesSquare },
  { href: "/admin/avisos", label: "Avisos push", icon: BellRing },
  { href: "/admin/notificaciones", label: "Mis notificaciones", icon: Bell },
];

// Mobile bottom bar (installed app): the sections an admin opens most from the phone.
const tabLinks = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/consultas", label: "Consultas", icon: MessageSquare },
  { href: "/admin/productores", label: "Productores", icon: UserCheck },
  { href: "/admin/foro", label: "Foro", icon: MessagesSquare },
];

const siteLinks = [
  { href: "/admin/blog", label: "Blog público", icon: FileText },
  { href: "/admin/config", label: "Configuración del sitio", icon: Settings },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  useConsultasLive(!!user);
  const unreadConsultas = useConsultaUnreadCount("equipo");
  usePortalManifest("admin");
  usePortalServiceWorker(!!user);
  useAppBadge(unreadConsultas);

  const isLinkActive = (href: string) =>
    location.pathname === href || (href !== "/admin" && location.pathname.startsWith(href));
  const currentSection =
    [...adminLinks, ...siteLinks].find((l) => l.href !== "/admin" && isLinkActive(l.href))?.label ??
    (location.pathname === "/admin" ? "Resumen" : "Administración");

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const renderLink = (link: { href: string; label: string; icon: typeof UserCheck }) => {
    const isActive = isLinkActive(link.href);
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
        {link.href === "/admin/consultas" && <UnreadBadge count={unreadConsultas} />}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside
        className={`kipper-header-bar fixed inset-y-0 left-0 z-50 w-64 overflow-x-hidden transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navegación de administración"
      >
        <div className="flex flex-col h-full">
          <KipperBrandLockup />

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
            <span className="font-semibold truncate">{currentSection}</span>
            <div className="w-10" />
          </div>
        </header>
        <main className="p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8">
          <PushPromptBanner variant="admin" />
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur lg:hidden pb-[env(safe-area-inset-bottom)]"
        aria-label="Accesos rápidos"
      >
        <div className="grid grid-cols-5">
          {tabLinks.map((tab) => {
            const active = isLinkActive(tab.href);
            const showBadge = tab.href === "/admin/consultas" && unreadConsultas > 0;
            return (
              <Link
                key={tab.href}
                to={tab.href}
                onClick={() => setSidebarOpen(false)}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative">
                  <tab.icon size={22} aria-hidden />
                  {showBadge && (
                    <span
                      className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
                      aria-label={`${unreadConsultas} sin leer`}
                    >
                      {unreadConsultas > 9 ? "9+" : unreadConsultas}
                    </span>
                  )}
                </span>
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              sidebarOpen ? "text-primary" : "text-muted-foreground"
            }`}
            aria-expanded={sidebarOpen}
          >
            <Menu size={22} aria-hidden />
            Más
          </button>
        </div>
      </nav>
    </div>
  );
};

export default AdminLayout;
