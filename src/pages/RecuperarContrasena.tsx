import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoKipper from "@/assets/logo-kipper.png";
import { toast } from "sonner";

const GENERIC_SUCCESS =
  "Si existe una cuenta con ese email, te enviamos un enlace para restablecer la contraseña. Revisá tu bandeja de entrada.";

const RecuperarContrasenaPage = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/restablecer-contrasena`,
      });
      // Always show the same success copy (anti-enumeration).
      if (error) {
        console.error("resetPasswordForEmail", error.message);
      }
      setSent(true);
      toast.success("Revisá tu email");
    } catch (err) {
      console.error(err);
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  };

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

        <h1 className="text-3xl font-bold text-foreground mb-2">Recuperar contraseña</h1>
        <p className="text-muted-foreground mb-8">
          Te enviamos un enlace seguro para elegir una nueva contraseña.
        </p>

        {sent ? (
          <div className="bg-card rounded-2xl shadow-soft p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="text-primary" size={22} />
            </div>
            <p className="text-sm text-foreground">{GENERIC_SUCCESS}</p>
            <Link to="/login" className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Volver a ingresar
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="recover-email">
                Email
              </label>
              <input
                id="recover-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-kipper"
                placeholder="tu@email.com"
                required
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-hero w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Enviando...
                </>
              ) : (
                "Enviar enlace de recuperación"
              )}
            </button>
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Volver a ingresar
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};

export default RecuperarContrasenaPage;
