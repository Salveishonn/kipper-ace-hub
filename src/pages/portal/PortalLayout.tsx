import { Link, Outlet, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, FileText, CreditCard, AlertTriangle, 
  User, LogOut, Menu, X, Bell 
} from "lucide-react";
import { useState } from "react";
import logoKipper from "@/assets/logo-kipper.png";

const sidebarLinks = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/polizas", label: "Mis Pólizas", icon: FileText },
  { href: "/portal/pagos", label: "Pagos", icon: CreditCard },
  { href: "/portal/siniestros", label: "Siniestros", icon: AlertTriangle },
  { href: "/portal/perfil", label: "Mi Perfil", icon: User },
];

const PortalLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link to="/" className="flex items-center gap-3">
              <img src={logoKipper} alt="Kipper" className="h-10" />
              <div>
                <span className="font-bold text-primary">KIPPER</span>
                <span className="text-xs text-muted-foreground block">Portal Cliente</span>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1">
            {sidebarLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  location.pathname === link.href
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <link.icon size={20} />
                <span className="font-medium">{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                JD
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Juan Demo</p>
                <p className="text-xs text-muted-foreground">juan@demo.com</p>
              </div>
            </div>
            <Link
              to="/login"
              className="flex items-center gap-2 text-muted-foreground hover:text-destructive transition-colors text-sm"
            >
              <LogOut size={16} />
              Cerrar sesión
            </Link>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-4 py-4 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-foreground"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;
