import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoKipper from "@/assets/logo-kipper.png";
import { toast } from "sonner";
import {
  isPasswordValid,
  passwordsMatch,
  PASSWORD_REQUIREMENTS,
} from "@/lib/passwordPolicy";
import { getAuthHashError } from "@/lib/inviteSession";

const RestablecerContrasenaPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    let mounted = true;

    const prepare = async () => {
      const hashError = getAuthHashError();
      if (hashError) {
        if (mounted) setInvalid(true);
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && (type === "recovery" || type === "email")) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "recovery" | "email",
          });
          if (error) throw error;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          // Wait briefly for PASSWORD_RECOVERY / hash detection.
          await new Promise((r) => setTimeout(r, 400));
          const again = await supabase.auth.getSession();
          if (!again.data.session) {
            if (mounted) setInvalid(true);
            return;
          }
        }

        window.history.replaceState({}, document.title, "/restablecer-contrasena");
        if (mounted) setReady(true);
      } catch {
        if (mounted) setInvalid(true);
      }
    };

    void prepare();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && mounted) {
        setReady(true);
        setInvalid(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid(password)) {
      toast.error("La contraseña no cumple los requisitos");
      return;
    }
    if (!passwordsMatch(password, confirmPassword)) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toast.error("No se pudo actualizar la contraseña", { description: error.message });
      return;
    }

    toast.success("Contraseña actualizada");
    navigate("/login", { replace: true });
  };

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-muted/30">
        <div className="max-w-md w-full text-center space-y-4">
          <img src={logoKipper} alt="Kipper Seguros" className="h-12 mx-auto" />
          <h1 className="text-xl font-bold">Enlace inválido o expirado</h1>
          <p className="text-muted-foreground text-sm">
            Solicitá un nuevo enlace de recuperación e intentá nuevamente.
          </p>
          <Link to="/recuperar-contrasena" className="btn-hero inline-flex">
            Recuperar contraseña
          </Link>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="animate-spin text-primary" size={40} />
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
        <h1 className="text-3xl font-bold mb-2">Nueva contraseña</h1>
        <p className="text-muted-foreground mb-8">Elegí una contraseña segura para tu cuenta.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-kipper pr-12"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <ul className="mt-2 space-y-1 text-xs">
              {PASSWORD_REQUIREMENTS.map((req) => {
                const ok = req.test(password);
                return (
                  <li key={req.id} className={ok ? "text-primary" : "text-muted-foreground"}>
                    {ok ? "✓" : "○"} {req.label}
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Confirmar contraseña</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-kipper"
              required
              autoComplete="new-password"
            />
            {confirmPassword.length > 0 && !passwordsMatch(password, confirmPassword) && (
              <p className="text-xs text-destructive mt-1">Las contraseñas no coinciden</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !isPasswordValid(password) || !passwordsMatch(password, confirmPassword)}
            className="btn-hero w-full flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : "Guardar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RestablecerContrasenaPage;
