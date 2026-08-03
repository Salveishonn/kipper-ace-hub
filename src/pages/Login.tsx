import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoKipper from "@/assets/logo-kipper.png";
import { isEmailNotConfirmedError } from "@/lib/authRouting";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    signIn,
    user,
    loading,
    rolesLoaded,
    authError,
    getDefaultDashboard,
    isPendingApplicant,
    isRejectedApplicant,
  } = useAuth();

  const from = location.state?.from?.pathname || null;

  useEffect(() => {
    if (loading || !rolesLoaded || !user || authError) return;

    let targetPath = getDefaultDashboard();
    if (from && from.startsWith("/admin") && targetPath === "/admin") {
      targetPath = from;
    }
    if (from && from.startsWith("/productor") && targetPath === "/productor") {
      targetPath = from;
    }

    if (targetPath === "/login") {
      setIsLoading(false);
      return;
    }

    navigate(targetPath, { replace: true });
  }, [loading, rolesLoaded, user, authError, from, navigate, getDefaultDashboard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setNeedsVerification(false);

    const { error } = await signIn(email, password);

    if (error) {
      if (isEmailNotConfirmedError(error.message)) {
        setNeedsVerification(true);
        toast.error("Verificá tu email", {
          description: "Debés confirmar tu dirección antes de ingresar.",
        });
      } else {
        toast.error("Error al iniciar sesión", {
          description: "Email o contraseña incorrectos",
        });
      }
      setIsLoading(false);
      return;
    }

    toast.success("¡Bienvenido!");
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      toast.error("Ingresá tu email para reenviar la verificación");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setResending(false);
    if (error) {
      toast.error("No se pudo reenviar el email");
      return;
    }
    toast.success("Email de verificación reenviado");
  };

  if (loading || (user && !rolesLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  const showPendingBanner = !!user && rolesLoaded && isPendingApplicant;
  const showRejectedBanner = !!user && rolesLoaded && isRejectedApplicant;

  return (
    <div className="min-h-screen flex">
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
              Ingresá con el email y la contraseña que elegiste al registrarte.
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

          {showPendingBanner && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
            >
              <p className="font-semibold mb-1">Tu solicitud está en revisión</p>
              <p className="mb-2">
                Ya podés autenticarte, pero el acceso al portal se habilita cuando Kipper apruebe tu solicitud.
              </p>
              <Link to="/productor/solicitud-pendiente" className="underline font-medium">
                Ver estado de solicitud
              </Link>
            </div>
          )}

          {showRejectedBanner && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            >
              <p className="font-semibold mb-1">Acceso no disponible</p>
              <Link to="/productor/acceso-no-disponible" className="underline font-medium">
                Más información
              </Link>
            </div>
          )}

          {needsVerification && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-2"
            >
              <p>Debés verificar tu email antes de ingresar.</p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                className="text-primary font-medium underline"
              >
                {resending ? "Reenviando..." : "Reenviar email de verificación"}
              </button>
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
              <Link to="/recuperar-contrasena" className="text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
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
              <span>Acceso tras aprobación de tu solicitud</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
