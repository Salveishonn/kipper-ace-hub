import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Settings, LogOut,
  Menu, X, UserCheck, MessageSquare, Mail,
  FileText, FolderOpen
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import logoKipper from "@/assets/logo-kipper.png";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/solicitudes-pas", label: "Solicitudes PAS", icon: Mail },
  { href: "/admin/productores", label: "Productores", icon: UserCheck },
  { href: "/admin/recursos", label: "Recursos PAS", icon: FolderOpen },
  { href: "/admin/consultas", label: "Consultas PAS", icon: MessageSquare },
  { href: "/admin/blog", label: "Blog", icon: FileText },
  { href: "/admin/academy", label: "Academy", icon: FileText },
  { href: "/admin/config", label: "Configuración", icon: Settings },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary text-primary-foreground transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-primary-foreground/20">
            <Link to="/" className="flex items-center gap-3">
              <img src={logoKipper} alt="Kipper" className="h-10 brightness-0 invert" />
              <div>
                <span className="font-bold">KIPPER</span>
                <span className="text-xs opacity-80 block">Admin Panel</span>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {adminLinks.map((link) => {
              const isActive = location.pathname === link.href ||
                (link.href !== '/admin' && location.pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"
                  }`}
                >
                  <link.icon size={20} />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-primary-foreground/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center font-bold">
                {initials}
              </div>
              <div>
                <p className="font-medium text-sm">{profile?.full_name || 'Admin'}</p>
                <p className="text-xs opacity-80">{profile?.email || 'admin@kipper.com'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity text-sm w-full"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border lg:hidden">
          <div className="flex items-center justify-between p-4">
            <button type="button" onClick={() => setSidebarOpen(true)} className="p-2">
              <Menu size={24} />
            </button>
            <span className="font-semibold">Admin</span>
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
