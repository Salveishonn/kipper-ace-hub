import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'productor' | 'cliente';
  requireAnyRole?: ('admin' | 'productor' | 'cliente')[];
}

export const ProtectedRoute = ({ 
  children, 
  requiredRole,
  requireAnyRole 
}: ProtectedRouteProps) => {
  const { user, roles, loading, isAdmin, isProductor, isCliente } = useAuth();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);

  // Wait for roles to be loaded after user is set
  useEffect(() => {
    if (!loading && user) {
      // Give a small delay for roles to be fetched
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    } else if (!loading && !user) {
      setIsReady(true);
    }
  }, [loading, user, roles]);

  if (loading || (!isReady && user)) {
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

  // Determine the correct dashboard based on role
  const getCorrectDashboard = () => {
    if (isAdmin) return "/admin";
    if (isProductor) return "/productor";
    return "/portal";
  };

  // Check for specific role requirement
  if (requiredRole) {
    const hasRole = roles.includes(requiredRole);
    if (!hasRole) {
      // Admin can access productor routes
      if (requiredRole === 'productor' && isAdmin) {
        return <>{children}</>;
      }
      return <Navigate to={getCorrectDashboard()} replace />;
    }
  }

  // Check for any of the required roles
  if (requireAnyRole) {
    const hasAnyRole = requireAnyRole.some(role => roles.includes(role));
    if (!hasAnyRole) {
      return <Navigate to={getCorrectDashboard()} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
