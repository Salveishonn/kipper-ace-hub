import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const DISMISS_KEY = "kipper-push-prompt-dismissed";

/** One-time nudge in the portal to turn on notifications on this device. */
export function PushPromptBanner() {
  const push = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");

  if (dismissed || push.enabled || push.support === "unsupported") return null;
  if (typeof Notification !== "undefined" && Notification.permission === "denied") return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm sm:flex-row sm:items-center">
      <Bell size={18} className="hidden shrink-0 text-primary sm:block" aria-hidden />
      <p className="flex-1">
        {push.support === "ios-needs-install"
          ? "Agregá el portal a tu pantalla de inicio para recibir avisos en el celular."
          : "Activá las notificaciones para enterarte al instante cuando respondamos tus consultas o haya novedades."}
      </p>
      <div className="flex items-center gap-2">
        {push.support === "ios-needs-install" ? (
          <Button asChild size="sm" variant="outline">
            <Link to="/productor/perfil#notificaciones">Ver cómo</Link>
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={push.busy}
            onClick={async () => {
              try {
                await push.turnOn();
                toast.success("¡Listo! Vas a recibir notificaciones en este dispositivo");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "No se pudieron activar");
              }
            }}
          >
            Activar
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={dismiss} aria-label="Ocultar aviso">
          <X size={16} />
        </Button>
      </div>
    </div>
  );
}
