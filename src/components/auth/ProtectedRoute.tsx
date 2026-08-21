import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "productor")[];
  /** Allow authenticated pending/rejected applicants without productor role. */
  allowApplicantStatus?: boolean;
}

export const ProtectedRoute = ({
  children,
  allowedRoles,
  allowApplicantStatus = false,
}: ProtectedRouteProps) => {
  const {
    user,
    roles,
    loading,
    rolesLoaded,
    isAdmin,
    isProductor,
    isAccountActive,
    isPendingApplicant,
    isRejectedApplicant,
    profile,
    adminMfaVerified,
  } = useAuth();
  const location = useLocation();

  // Anonymous visitors have no roles to load; only wait for rolesLoaded
  // when there is an authenticated user whose role lookup is in flight.
  if (loading || (user && !rolesLoaded)) {
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

  if (isAdmin && !adminMfaVerified && location.pathname.startsWith("/admin")) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowApplicantStatus) {
    if (isAdmin) {
      return <Navigate to={adminMfaVerified ? "/admin" : "/login"} replace />;
    }
    if (isProductor && isAccountActive) return <Navigate to="/productor" replace />;
    return <>{children}</>;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = allowedRoles.some((role) => roles.includes(role));

    if (!hasAccess) {
      if (isPendingApplicant) {
        return <Navigate to="/productor/solicitud-pendiente" replace />;
      }
      if (isRejectedApplicant) {
        return <Navigate to="/productor/acceso-no-disponible" replace />;
      }
      const loginPath = "/login";
      return <Navigate to={loginPath} replace />;
    }
  }

  if (allowedRoles?.includes("productor") && !isAdmin) {
    if (!isProductor) {
      if (isPendingApplicant) {
        return <Navigate to="/productor/solicitud-pendiente" replace />;
      }
      return <Navigate to="/productor/acceso-no-disponible" replace />;
    }

    if (profile && !isAccountActive) {
      if (profile.account_status === "pending") {
        return <Navigate to="/productor/solicitud-pendiente" replace />;
      }
      return <Navigate to="/productor/acceso-no-disponible" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
