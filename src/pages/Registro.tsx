import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Loader2, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoKipper from "@/assets/logo-kipper.png";
import {
  getAuthHashError,
  isInviteAuthUser,
  isInviteHashPresent,
} from "@/lib/inviteSession";
import { waitForPasProvisioning } from "@/lib/waitForPasProvisioning";

type InviteGate = "loading" | "invalid" | "expired" | "ready";

const RegistroPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteGate, setInviteGate] = useState<InviteGate>("loading");
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { completeInvitePassword, refreshProfile, loading, rolesLoaded, getDefaultDashboard, isProductor, isAccountActive } = useAuth();

  useEffect(() => {
    let mounted = true;

    const resolveInviteGate = async () => {
      const hashError = getAuthHashError();
      if (hashError) {
        if (mounted) setInviteGate("expired");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!session?.user) {
        if (isInviteHashPresent()) {
          setInviteGate("loading");
          return;
        }
        setInviteGate("invalid");
        return;
      }

      const u = session.user;

      if (isProductor && isAccountActive && u.email_confirmed_at && !isInviteAuthUser(u)) {
        navigate(getDefaultDashboard(), { replace: true });
        return;
      }

      if (!isInviteAuthUser(u) && !isInviteHashPresent()) {
        setInviteGate("invalid");
        return;
      }

      if (!isInviteAuthUser(u) && isInviteHashPresent()) {
        setInviteGate("loading");
        return;
      }

      setInviteGate("ready");
    };

    resolveInviteGate();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session?.user) {
        if (isInviteAuthUser(session.user) || isInviteHashPresent()) {
          setInviteGate("ready");
        }
      }
      if (event === "PASSWORD_RECOVERY" || event === "USER_UPDATED") {
        /* no-op */
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, getDefaultDashboard, isProductor, isAccountActive]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inviteGate !== "ready") {
      toast.error("Invitación no válida");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setIsLoading(true);
    setProvisionError(null);
    const { error } = await completeInvitePassword(password);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("expired") || msg.includes("invalid") || msg.includes("session")) {
        setInviteGate("expired");
      }
      toast.error("No se pudo completar el registro", { description: error.message });
      setIsLoading(false);
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.id) {
      const provision = await waitForPasProvisioning(currentUser.id);
      await refreshProfile();
      if (!provision.ok) {
        const message =
          provision.reason === "not_active"
            ? "Tu contraseña se guardó, pero la cuenta PAS aún no está activa. Esperá unos segundos e ingresá desde Login, o contactá a Kipper si persiste."
            : "La activación está demorada. Intentá ingresar en unos segundos desde Login.";
        setProvisionError(message);
        toast.error("Activación pendiente", { description: message });
        setIsLoading(false);
        return;
      }
    }

    toast.success("¡Cuenta activada!");
    navigate(getDefaultDashboard(), { replace: true });
  };

  if (loading || inviteGate === "loading" || (rolesLoaded && inviteGate === "loading")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  if (inviteGate === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-muted/30">
        <div className="max-w-md w-full text-center space-y-6">
          <img src={logoKipper} alt="Kipper Seguros" className="h-14 mx-auto" />
          <div className="bg-card rounded-2xl p-8 shadow-soft">
            <AlertCircle className="mx-auto text-destructive mb-4" size={40} />
            <h1 className="text-2xl font-bold mb-2">Invitación expirada o inválida</h1>
            <p className="text-muted-foreground mb-6">
              El enlace de invitación ya no es válido. Pedile a un administrador de Kipper que reenvíe la invitación.
            </p>
            <Link to="/login" className="btn-hero inline-flex items-center gap-2">
              Ir a ingresar <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (inviteGate === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-muted/30">
        <div className="max-w-md w-full text-center space-y-6">
          <img src={logoKipper} alt="Kipper Seguros" className="h-14 mx-auto" />
          <div className="bg-card rounded-2xl p-8 shadow-soft">
            <Lock className="mx-auto text-primary mb-4" size={40} />
            <h1 className="text-2xl font-bold mb-2">Acceso solo por invitación</h1>
            <p className="text-muted-foreground mb-6">
              El portal PAS es exclusivo para productores aprobados. Recibirás un email con un
              enlace de un solo uso cuando tu solicitud sea aceptada.
            </p>
            <Link to="/sumate" className="btn-hero inline-flex items-center gap-2">
              Quiero sumarme <ArrowRight size={16} />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              ¿Ya tenés cuenta?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Ingresar
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-muted/30">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-3 mb-8">
          <img src={logoKipper} alt="Kipper Seguros" className="h-12" />
          <div>
            <span className="text-xl font-bold text-primary block">KIPPER</span>
            <span className="text-xs text-muted-foreground tracking-wider">SEGUROS</span>
          </div>
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">Activá tu acceso PAS</h1>
        <p className="text-muted-foreground mb-8">
          Definí tu contraseña para ingresar al portal de productores.
        </p>

        {provisionError && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
            {provisionError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-kipper pr-12"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-kipper"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-hero w-full flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Activar cuenta <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegistroPage;
