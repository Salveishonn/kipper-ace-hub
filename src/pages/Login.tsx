import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import logoKipper from "@/assets/logo-kipper.png";
import { siteConfig } from "@/lib/siteConfig";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, roles, loading, rolesLoaded, authError, getDefaultDashboard } = useAuth();

  const from = location.state?.from?.pathname || null;

  // Redirect if already logged in and roles are loaded
  useEffect(() => {
    if (loading || !rolesLoaded || !user) return;

    const fallback = getDefaultDashboard();
    let targetPath = from || fallback;
    // Never send a non-admin toward /admin from here; use their own dashboard.
    if (targetPath.startsWith("/admin") && fallback !== "/admin") {
      targetPath = fallback;
    }
    // No runtime role: stay on the page instead of looping through redirects.
    if (targetPath === "/login") {
      setIsLoading(false);
      return;
    }

    navigate(targetPath, { replace: true });
  }, [loading, rolesLoaded, user, from, navigate, getDefaultDashboard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error("Error al iniciar sesión", {
        description: error.message === "Invalid login credentials" 
          ? "Email o contraseña incorrectos" 
          : error.message,
      });
      setIsLoading(false);
      return;
    }

    toast.success("¡Bienvenido!");
    // The useEffect will handle the redirect once roles are loaded
  };

  // Show loading while checking auth state. Anonymous visitors never wait on
  // rolesLoaded — they have no roles to load.
  if (loading || (user && !rolesLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  const hasNoAssignedAccess = !!user && rolesLoaded && !authError && roles.length === 0;

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <Link to="/" className="inline-flex items-center gap-3 mb-8">
              <img src={logoKipper} alt="Kipper Seguros" className="h-12" />
              <div>
                <span className="text-xl font-bold text-primary block">KIPPER</span>
                <span className="text-xs text-muted-foreground tracking-wider">SEGUROS</span>
              </div>
            </Link>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Portal Productores
            </h1>
            <p className="text-muted-foreground">
              Acceso exclusivo para productores asesores (PAS) aprobados por Kipper.
              Ingresá con tu email y contraseña de productor.
            </p>
          </div>

          {authError && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            >
              {authError}
            </div>
          )}

          {hasNoAssignedAccess && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
            >
              <p className="font-semibold mb-1">Tu cuenta no tiene acceso asignado</p>
              <p>
                Iniciaste sesión correctamente, pero tu cuenta todavía no tiene un rol de
                productor o administrador. Escribinos a{" "}
                <a href={`mailto:${siteConfig.contactEmail}`} className="underline">
                  {siteConfig.contactEmail}
                </a>{" "}
                para activar tu acceso.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="input-kipper"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-kipper pr-12"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              ¿Olvidaste tu contraseña? Escribinos a{" "}
              <a href={`mailto:${siteConfig.contactEmail}`} className="text-primary hover:underline">
                {siteConfig.contactEmail}
              </a>{" "}
              y te ayudamos a recuperar el acceso.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-hero w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  Ingresar
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            ¿Querés sumarte como productor?{" "}
            <Link to="/sumate" className="text-primary font-medium hover:underline">
              Enviá tu solicitud
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <h2 className="text-3xl font-bold mb-6">
            Herramientas para productores PAS
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <span>Recursos gráficos y novedades semanales</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <span>Kipper Academy y capacitación continua</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <span>Consultas y casos con el equipo Kipper</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
              <span>Acceso exclusivo por invitación aprobada</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
