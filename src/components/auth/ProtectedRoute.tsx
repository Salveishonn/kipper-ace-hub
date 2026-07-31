import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'productor' | 'cliente')[];
}

export const ProtectedRoute = ({ 
  children, 
  allowedRoles 
}: ProtectedRouteProps) => {
  const { user, roles, loading, rolesLoaded, isAdmin, isProductor } = useAuth();
  const location = useLocation();

  // CRITICAL: While loading or roles not yet fetched, show loading state
  // DO NOT redirect during this phase
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

  // User not authenticated -> redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Determine the correct dashboard based on role (priority: admin > productor > cliente)
  const getCorrectDashboard = (): string => {
    if (isAdmin) return "/admin";
    if (isProductor) return "/productor";
    return "/portal";
  };

  // If allowedRoles is specified, check access
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAccess = allowedRoles.some(role => roles.includes(role));
    
    if (!hasAccess) {
      const correctDashboard = getCorrectDashboard();
      // Prevent redirect loop: only redirect if we're not already at the correct path
      if (location.pathname !== correctDashboard) {
        return <Navigate to={correctDashboard} replace />;
      }
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
