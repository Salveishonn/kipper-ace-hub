import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, User, LogOut, Menu, X,
  Video, FolderOpen, BookOpen, MessageSquare
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import logoKipper from "@/assets/logo-kipper.png";

const productorLinks = [
  { href: "/productor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/productor/novedades", label: "Recursos semanales", icon: FolderOpen },
  { href: "/productor/consultas", label: "Consultas", icon: MessageSquare },
  { href: "/productor/tutoriales", label: "Videos Instructivos", icon: Video },
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
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-emerald-700 to-emerald-800 text-white transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-white/20">
            <Link to="/" className="flex items-center gap-3">
              <img src={logoKipper} alt="Kipper" className="h-10 brightness-0 invert" />
              <div>
                <span className="font-bold">KIPPER</span>
                <span className="text-xs opacity-80 block">Portal PAS</span>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {productorLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-sm ${
                  location.pathname === link.href || (link.href !== "/productor" && location.pathname.startsWith(link.href))
                    ? "bg-white/20"
                    : "hover:bg-white/10"
                }`}
              >
                <link.icon size={18} />
                <span className="font-medium">{link.label}</span>
              </Link>
            ))}

            <Link
              to="/academy/contenido"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-sm hover:bg-white/10 mt-4 border border-white/20"
            >
              <BookOpen size={18} />
              <span className="font-medium">Kipper Academy</span>
            </Link>
          </nav>

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
              type="button"
              onClick={handleLogout}
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
            <span className="font-semibold">Portal PAS</span>
            <button type="button" onClick={() => setSidebarOpen(false)} className="p-2 lg:hidden">
              <X size={24} className={sidebarOpen ? "" : "opacity-0"} />
            </button>
          </div>
        </header>
        <main className="p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ProductorLayout;
