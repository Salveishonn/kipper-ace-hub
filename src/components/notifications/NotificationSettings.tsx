import { Bell, BellOff, Download, Mail, Share, Smartphone, SquarePlus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";

type Prefs = {
  forum_new_post_email: boolean;
  forum_reply_email: boolean;
  admin_push_cases: boolean;
  admin_push_applications: boolean;
  admin_push_forum: boolean;
};
const DEFAULT_PREFS: Prefs = {
  forum_new_post_email: true,
  forum_reply_email: true,
  admin_push_cases: true,
  admin_push_applications: true,
  admin_push_forum: true,
};
const PREF_COLUMNS = Object.keys(DEFAULT_PREFS).join(", ");

type Variant = "productor" | "admin";

const COPY: Record<Variant, { intro: string; iosUrl: string; pushTitle: string; pushHint: string }> = {
  productor: {
    intro: "Elegí cómo querés enterarte de respuestas a tus consultas, novedades y actividad del foro.",
    iosUrl: "kipperseguros.com/productor",
    pushTitle: "Notificaciones del portal",
    pushHint: "Respuestas a tus consultas, novedades, Academy y avisos del equipo Kipper.",
  },
  admin: {
    intro: "Elegí qué avisos del equipo te llegan al celular o la compu, y qué mails del foro recibís.",
    iosUrl: "kipperseguros.com/admin",
    pushTitle: "Notificaciones de administración",
    pushHint: "Se activan por dispositivo: hacelo en cada celular o computadora donde uses Kipper Admin.",
  },
};

const ADMIN_PUSH: Array<{ key: keyof Prefs; label: string; hint: string }> = [
  { key: "admin_push_cases", label: "Consultas", hint: "Consultas nuevas y cada mensaje que escribe un productor." },
  { key: "admin_push_applications", label: "Solicitudes PAS", hint: "Cuando alguien pide sumarse como productor." },
  { key: "admin_push_forum", label: "Foro", hint: "Publicaciones y comentarios nuevos en el foro." },
];

function useEmailPrefs(userId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["notification_preferences", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Prefs> => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select(PREF_COLUMNS)
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return { ...DEFAULT_PREFS, ...((data as Partial<Prefs> | null) ?? {}) };
    },
  });
  const save = useMutation({
    mutationFn: async (next: Prefs) => {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ user_id: userId!, ...next, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification_preferences", userId] }),
  });
  return { prefs: query.data ?? DEFAULT_PREFS, loading: query.isLoading, save };
}

export function NotificationSettings({ variant = "productor" }: { variant?: Variant }) {
  const copy = COPY[variant];
  const { user } = useAuth();
  const push = usePushNotifications();
  const { prefs, loading, save } = useEmailPrefs(user?.id);

  const togglePush = async () => {
    try {
      if (push.enabled) {
        await push.turnOff();
        toast.success("Notificaciones desactivadas en este dispositivo");
      } else {
        await push.turnOn();
        toast.success("¡Listo! Vas a recibir notificaciones en este dispositivo");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar la configuración");
    }
  };

  const setPref = (key: keyof Prefs, value: boolean) =>
    save.mutate({ ...prefs, [key]: value }, { onError: () => toast.error("No se pudo guardar") });

  return (
    <div className="bg-card rounded-2xl shadow-soft p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell size={18} className="text-primary" aria-hidden /> Notificaciones
        </h2>
        <p className="text-sm text-muted-foreground">
          {copy.intro}
        </p>
      </div>

      <section className="space-y-3" aria-labelledby="notif-device">
        <h3 id="notif-device" className="text-sm font-semibold flex items-center gap-2">
          <Smartphone size={16} aria-hidden /> En este dispositivo
        </h3>

        {!push.installed && push.canInstall && (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">Instalá el portal como app para abrirlo desde tu pantalla de inicio.</p>
            <Button size="sm" onClick={() => void push.install()}>
              <Download size={14} className="mr-1.5" aria-hidden /> Instalar app
            </Button>
          </div>
        )}

        {push.support === "ios-needs-install" ? (
          <div className="rounded-xl border border-border p-4 text-sm space-y-2">
            <p className="font-medium">Para recibir notificaciones en iPhone:</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>
                Abrí {copy.iosUrl} en <strong>Safari</strong>.
              </li>
              <li className="flex flex-wrap items-center gap-1">
                Tocá <Share size={14} aria-label="Compartir" /> <strong>Compartir</strong> y después
                <SquarePlus size={14} aria-hidden /> <strong>Agregar a inicio</strong>.
              </li>
              <li>Abrí la app desde tu pantalla de inicio y volvé a esta sección para activarlas.</li>
            </ol>
          </div>
        ) : push.support === "unsupported" ? (
          <p className="text-sm text-muted-foreground">
            Este navegador no admite notificaciones. Probá desde Chrome, Edge o Safari actualizados.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">{copy.pushTitle}</p>
              <p className="text-xs text-muted-foreground">{copy.pushHint}</p>
            </div>
            <Button
              variant={push.enabled ? "outline" : "default"}
              size="sm"
              onClick={() => void togglePush()}
              disabled={push.busy}
            >
              {push.enabled ? (
                <>
                  <BellOff size={14} className="mr-1.5" aria-hidden /> Desactivar
                </>
              ) : (
                <>
                  <Bell size={14} className="mr-1.5" aria-hidden /> Activar
                </>
              )}
            </Button>
          </div>
        )}
      </section>

      {variant === "admin" && (
        <section className="space-y-3" aria-labelledby="notif-admin-push">
          <h3 id="notif-admin-push" className="text-sm font-semibold flex items-center gap-2">
            <Bell size={16} aria-hidden /> Qué avisos push recibir
          </h3>
          {ADMIN_PUSH.map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between gap-4 rounded-xl border border-border p-4 cursor-pointer"
            >
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-xs text-muted-foreground">{item.hint}</span>
              </span>
              <Switch
                checked={prefs[item.key]}
                disabled={loading || save.isPending}
                onCheckedChange={(v) => setPref(item.key, v)}
                aria-label={`Avisos push de ${item.label.toLowerCase()}`}
              />
            </label>
          ))}
        </section>
      )}

      <section className="space-y-3" aria-labelledby="notif-email">
        <h3 id="notif-email" className="text-sm font-semibold flex items-center gap-2">
          <Mail size={16} aria-hidden /> Por email (foro)
        </h3>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-4 cursor-pointer">
          <span>
            <span className="block text-sm font-medium">Nuevas publicaciones</span>
            <span className="block text-xs text-muted-foreground">Cuando alguien publica en el foro.</span>
          </span>
          <Switch
            checked={prefs.forum_new_post_email}
            disabled={loading || save.isPending}
            onCheckedChange={(v) => setPref("forum_new_post_email", v)}
            aria-label="Mails de nuevas publicaciones del foro"
          />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-4 cursor-pointer">
          <span>
            <span className="block text-sm font-medium">Comentarios</span>
            <span className="block text-xs text-muted-foreground">
              Cuando comentan tus publicaciones o conversaciones donde participaste.
            </span>
          </span>
          <Switch
            checked={prefs.forum_reply_email}
            disabled={loading || save.isPending}
            onCheckedChange={(v) => setPref("forum_reply_email", v)}
            aria-label="Mails de comentarios del foro"
          />
        </label>
      </section>
    </div>
  );
}
