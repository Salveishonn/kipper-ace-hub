import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import logoKipper from "@/assets/logo-kipper.png";

/**
 * Handles Supabase email confirmation / OAuth-style redirects for the Vite SPA.
 * Supports PKCE (?code=), token_hash verify, and implicit hash sessions.
 */
const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { user, rolesLoaded, getDefaultDashboard, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash && type) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "signup" | "email" | "recovery" | "invite" | "magiclink",
          });
          if (otpError) throw otpError;
        } else {
          // Implicit flow: detectSessionInUrl on the client picks up hash tokens.
          await supabase.auth.getSession();
        }

        // Clean sensitive params from the address bar.
        window.history.replaceState({}, document.title, "/auth/callback");
        if (mounted) setHandled(true);
      } catch (e) {
        console.error(e);
        if (mounted) {
          setError(
            e instanceof Error
              ? e.message
              : "No pudimos verificar tu email. Pedí un nuevo enlace o intentá nuevamente.",
          );
          setHandled(true);
        }
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!handled || error || loading || !rolesLoaded) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    navigate(getDefaultDashboard(), { replace: true });
  }, [handled, error, loading, rolesLoaded, user, navigate, getDefaultDashboard]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-muted/30">
        <div className="max-w-md w-full text-center space-y-4">
          <img src={logoKipper} alt="Kipper Seguros" className="h-12 mx-auto" />
          <h1 className="text-xl font-bold">No se pudo completar la verificación</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Link to="/login" className="btn-hero inline-flex">
            Ir a ingresar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="text-center space-y-3">
        <Loader2 className="animate-spin text-primary mx-auto" size={40} />
        <p className="text-muted-foreground">Verificando tu acceso...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
