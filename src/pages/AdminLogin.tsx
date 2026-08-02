import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import logoKipper from "@/assets/logo-kipper.png";

/**
 * Discreet admin entry point. Not linked from public navigation.
 * Producers who authenticate here are sent to their own portal, never /admin.
 */
const AdminLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, loading, rolesLoaded, isAdmin, isProductor } = useAuth();

  const fromPath: string | null = location.state?.from?.pathname ?? null;
  // Only honor a preserved destination if it is an admin destination.
  const adminTarget = fromPath && fromPath.startsWith("/admin") ? fromPath : "/admin";

  useEffect(() => {
    if (loading || !rolesLoaded || !user) return;
    if (isAdmin) {
      navigate(adminTarget, { replace: true });
      return;
    }
    if (isProductor) {
      toast.info("Tu cuenta no tiene acceso a la administración", {
        description: "Te llevamos a tu Portal Productores.",
      });
      navigate("/productor", { replace: true });
      return;
    }
    // Authenticated but without any runtime role: no access.
    navigate("/login", { replace: true });
  }, [loading, rolesLoaded, user, isAdmin, isProductor, adminTarget, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error("Error al iniciar sesión", {
        description:
          error.message === "Invalid login credentials"
            ? "Email o contraseña incorrectos"
            : error.message,
      });
      setIsLoading(false);
      return;
    }
    // The useEffect above routes by role once roles are loaded.
  };

  // Anonymous visitors never wait on rolesLoaded — they have no roles to load.
  if (loading || (user && !rolesLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 size={48} className="animate-spin text-primary" aria-label="Cargando" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-card border border-border/60 p-8">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <img src={logoKipper} alt="Kipper Seguros" className="h-10" />
          </Link>
          <div className="flex items-center justify-center gap-2 mb-1">
            <ShieldCheck size={20} className="text-primary" aria-hidden />
            <h1 className="text-xl font-bold text-foreground">Administración Kipper</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Acceso interno para el equipo administrador.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-foreground mb-2">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@kipper.com"
              className="input-kipper"
              required
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-foreground mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-kipper pr-12"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-hero w-full flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden />
                Ingresando...
              </>
            ) : (
              <>
                Ingresar
                <ArrowRight size={18} aria-hidden />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿Sos productor?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Ingresá al Portal Productores
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
