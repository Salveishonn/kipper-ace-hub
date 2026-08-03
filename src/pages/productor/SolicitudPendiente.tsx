import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logoKipper from "@/assets/logo-kipper.png";
import { Button } from "@/components/ui/button";
import { PRODUCER_APPLICATION_STATUS } from "@/lib/producerApplicationStatus";

const statusLabel: Record<string, string> = {
  [PRODUCER_APPLICATION_STATUS.PENDING]: "Pendiente de aprobación",
  [PRODUCER_APPLICATION_STATUS.NUEVO]: "Pendiente de aprobación",
  [PRODUCER_APPLICATION_STATUS.EN_REVISION]: "En revisión",
  [PRODUCER_APPLICATION_STATUS.INVITADO]: "Invitación legacy pendiente",
  aprobado: "Pendiente de aprobación",
  [PRODUCER_APPLICATION_STATUS.ACTIVO]: "Activo",
  [PRODUCER_APPLICATION_STATUS.RECHAZADO]: "Rechazada",
};

const SolicitudPendientePage = () => {
  const { user, producerApplication, signOut, refreshProfile, isProductor, isAccountActive } =
    useAuth();
  const [refreshing, setRefreshing] = useState(false);

  if (isProductor && isAccountActive) {
    return <Navigate to="/productor" replace />;
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setRefreshing(false);
    }
  };

  const email = producerApplication?.email || user?.email || "";
  const status = producerApplication?.status ?? "pending";

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-muted/30">
      <div className="w-full max-w-md text-center space-y-6">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src={logoKipper} alt="Kipper Seguros" className="h-12" />
        </Link>
        <div className="bg-card rounded-2xl shadow-soft p-8 space-y-4 text-left">
          <h1 className="text-2xl font-bold text-foreground text-center">
            Tu solicitud está en revisión
          </h1>
          <p className="text-muted-foreground text-center">
            Ya recibimos tus datos. El equipo de Kipper está evaluando tu solicitud como Productor
            Asesor de Seguros. Te avisaremos cuando tu acceso esté habilitado.
          </p>
          <dl className="space-y-2 text-sm border-t border-border pt-4">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium text-foreground break-all">{email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Estado</dt>
              <dd className="font-medium text-primary">
                {statusLabel[status] ?? status}
              </dd>
            </div>
          </dl>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : (
                <RefreshCw className="mr-2" size={16} />
              )}
              Actualizar estado
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={() => signOut()}>
              <LogOut className="mr-2" size={16} />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolicitudPendientePage;
