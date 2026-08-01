import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'productor')[];
}

export const ProtectedRoute = ({ 
  children, 
  allowedRoles 
}: ProtectedRouteProps) => {
  const { user, roles, loading, rolesLoaded, isAdmin, isProductor, isAccountActive, profile } = useAuth();
  const location = useLocation();

  if (loading || !rolesLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const getCorrectDashboard = (): string => {
    if (isAdmin) return "/admin";
    if (isProductor) return "/productor";
    return "/login";
  };

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = allowedRoles.some(role => roles.includes(role));
    
    if (!hasAccess) {
      const correctDashboard = getCorrectDashboard();
      if (location.pathname !== correctDashboard) {
        return <Navigate to={correctDashboard} replace />;
      }
    }
  }

  if (allowedRoles?.includes("productor") && !isAdmin) {
    if (!isProductor) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  }

  if (!isAdmin && isProductor && profile && !isAccountActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold">Cuenta pendiente</h1>
          <p className="text-muted-foreground">
            Tu acceso al Portal Productores aún no está activo. Si recibiste una invitación,
            completá el registro desde el enlace del email.
          </p>
          <Link to="/sumate" className="btn-hero inline-block">Sumate a Kipper</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
