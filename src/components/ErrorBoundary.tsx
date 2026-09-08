import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[kipper] render error", error, info.componentStack);
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">No pudimos cargar la página</h1>
          <p className="text-sm text-muted-foreground">
            Recargá. Si sigue en blanco, revisá la consola del navegador (F12).
          </p>
          {import.meta.env.DEV && (
            <pre className="text-left text-xs bg-muted p-3 rounded-md overflow-auto">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            className="text-sm underline text-primary"
            onClick={() => window.location.reload()}
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }
}
