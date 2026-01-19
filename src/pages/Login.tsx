import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import logoKipper from "@/assets/logo-kipper.png";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate login - replace with real auth
    setTimeout(() => {
      setIsLoading(false);
      navigate("/portal");
    }, 1000);
  };

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
              Bienvenido al Portal
            </h1>
            <p className="text-muted-foreground">
              Ingresá tus datos para acceder a tu cuenta
            </p>
          </div>

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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                <span className="text-sm text-muted-foreground">Recordarme</span>
              </label>
              <Link to="/recuperar" className="text-sm text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-hero w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  Ingresar
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            ¿No tenés cuenta?{" "}
            <Link to="/contacto" className="text-primary font-medium hover:underline">
              Contactanos
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <h2 className="text-3xl font-bold mb-6">
            Todo tu seguro en un solo lugar
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <span>Consultá tus pólizas y coberturas vigentes</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <span>Pagá tus cuotas de forma rápida y segura</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <span>Descargá comprobantes y tarjetas de circulación</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
              <span>Reportá siniestros y hacé seguimiento online</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
