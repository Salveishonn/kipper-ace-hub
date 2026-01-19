import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

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

  if (loading) {
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

  // Check for specific role requirement
  if (requiredRole) {
    const hasRole = roles.includes(requiredRole);
    if (!hasRole) {
      // Redirect based on what role they have
      if (isAdmin || isProductor) {
        return <Navigate to="/admin" replace />;
      }
      return <Navigate to="/portal" replace />;
    }
  }

  // Check for any of the required roles
  if (requireAnyRole) {
    const hasAnyRole = requireAnyRole.some(role => roles.includes(role));
    if (!hasAnyRole) {
      if (isAdmin || isProductor) {
        return <Navigate to="/admin" replace />;
      }
      return <Navigate to="/portal" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
