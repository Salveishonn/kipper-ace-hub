import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logoKipper from "@/assets/logo-kipper.png";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/siteConfig";

const AccesoNoDisponiblePage = () => {
  const { user, producerApplication, profile, signOut, isRejectedApplicant } = useAuth();
  const email = producerApplication?.email || user?.email || "";
  const rejected =
    isRejectedApplicant ||
    producerApplication?.status === "rechazado" ||
    profile?.account_status === "suspended";

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-muted/30">
      <div className="w-full max-w-md text-center space-y-6">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src={logoKipper} alt="Kipper Seguros" className="h-12" />
        </Link>
        <div className="bg-card rounded-2xl shadow-soft p-8 space-y-4">
          <h1 className="text-2xl font-bold text-foreground">
            {rejected ? "Acceso no disponible" : "Sin acceso al portal"}
          </h1>
          <p className="text-muted-foreground">
            {rejected
              ? "Tu solicitud como Productor Asesor de Seguros no fue aprobada o tu cuenta no está habilitada. Si creés que se trata de un error, escribinos."
              : "Tu cuenta no tiene acceso al Portal de Productores. Si ya enviaste una solicitud, esperá la evaluación del equipo Kipper."}
          </p>
          {email && (
            <p className="text-sm text-muted-foreground">
              Email: <span className="font-medium text-foreground">{email}</span>
            </p>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="btn-hero inline-flex items-center justify-center"
            >
              Contactar a Kipper
            </a>
            <Button type="button" variant="outline" onClick={() => signOut()}>
              <LogOut className="mr-2" size={16} />
              Cerrar sesión
            </Button>
            <Link to="/" className="text-sm text-primary hover:underline">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccesoNoDisponiblePage;
