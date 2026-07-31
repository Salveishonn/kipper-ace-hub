import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Users, FileText, TrendingUp,
  AlertTriangle, User, LogOut, Menu, X, Bell,
  Video, FolderOpen, BookOpen, FileCheck, FileX
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import logoKipper from "@/assets/logo-kipper.png";

const productorLinks = [
  { href: "/productor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/productor/leads", label: "Mis Leads", icon: TrendingUp },
  { href: "/productor/clientes", label: "Mis Clientes", icon: Users },
  { href: "/productor/polizas", label: "Pólizas", icon: FileText },
  { href: "/productor/emisiones", label: "Emisiones", icon: FileCheck },
  { href: "/productor/anulaciones", label: "Anulaciones", icon: FileX },
  { href: "/productor/siniestros", label: "Siniestros", icon: AlertTriangle },
  { href: "/productor/notas", label: "Notas de Gestión", icon: FileText },
  { href: "/productor/tutoriales", label: "Videos Instructivos", icon: Video },
  { href: "/productor/materiales", label: "Material de Producción", icon: FolderOpen },
  { href: "/productor/perfil", label: "Mi Perfil", icon: User },
];

const ProductorLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "PR";

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-emerald-700 to-emerald-800 text-white transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/20">
            <Link to="/" className="flex items-center gap-3">
              <img src={logoKipper} alt="Kipper" className="h-10 brightness-0 invert" />
              <div>
                <span className="font-bold">KIPPER</span>
                <span className="text-xs opacity-80 block">Portal Productor</span>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {productorLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-sm ${
                  location.pathname === link.href
                    ? "bg-white/20"
                    : "hover:bg-white/10"
                }`}
              >
                <link.icon size={18} />
                <span className="font-medium">{link.label}</span>
              </Link>
            ))}
            
            {/* Kipper Academy Link */}
            <a
              href="/academy"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-sm hover:bg-white/10 mt-4 border border-white/20"
            >
              <BookOpen size={18} />
              <span className="font-medium">Kipper Academy</span>
            </a>
          </nav>

          {/* User */}
          <div className="p-4 border-t border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                {initials}
              </div>
              <div>
                <p className="font-medium text-sm">{profile?.full_name || "Productor"}</p>
                <p className="text-xs opacity-80">{profile?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity text-sm w-full"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
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
        <header className="bg-card border-b border-border px-4 py-4 flex items-center gap-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-foreground"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">Portal Productor</h1>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
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

export default ProductorLayout;
