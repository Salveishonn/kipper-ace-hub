import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export const LoadingState = ({ message = "Cargando..." }: LoadingStateProps) => (
  <div className="flex flex-col items-center justify-center py-16">
    <Loader2 size={40} className="animate-spin text-primary mb-4" />
    <p className="text-muted-foreground">{message}</p>
  </div>
);

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-muted-foreground mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    {description && <p className="text-muted-foreground mb-4 max-w-md">{description}</p>}
    {action}
  </div>
);

interface ErrorStateProps {
  title?: string;
  message?: string;
  retry?: () => void;
}

export const ErrorState = ({ 
  title = "Error", 
  message = "Ocurrió un error al cargar los datos.", 
  retry 
}: ErrorStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
      <span className="text-destructive text-2xl">!</span>
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground mb-4">{message}</p>
    {retry && (
      <button onClick={retry} className="btn-hero-outline text-sm">
        Reintentar
      </button>
    )}
  </div>
);
