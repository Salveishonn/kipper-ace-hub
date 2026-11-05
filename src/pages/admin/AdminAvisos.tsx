import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";

const DESTINATIONS = [
  { value: "/productor", label: "Inicio del portal" },
  { value: "/productor/novedades", label: "Novedades" },
  { value: "/productor/academy", label: "Academy" },
  { value: "/productor/foro", label: "Foro" },
  { value: "/productor/consultas", label: "Consultas" },
  { value: "/productor/recursos", label: "Recursos gráficos" },
];

type Broadcast = { id: string; title: string; body: string; url: string | null; created_at: string };

const AdminAvisos = () => {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/productor");

  const history = useQuery({
    queryKey: ["admin_broadcasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_broadcasts")
        .select("id, title, body, url, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Broadcast[];
    },
  });

  const subscribers = useQuery({
    queryKey: ["push_subscriber_count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("count_push_subscribers");
      if (error) return null;
      return data as number;
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("send_admin_broadcast", {
        p_title: title.trim(),
        p_body: body.trim(),
        p_url: url,
      });
      if (error) {
        throw new Error(
          error.message.includes("FORBIDDEN")
            ? "Necesitás verificar tu código de seguridad de admin para enviar avisos."
            : "No se pudo enviar el aviso",
        );
      }
    },
    onSuccess: () => {
      toast.success("Aviso enviado a los productores");
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["admin_broadcasts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo enviar"),
  });

  const valid = title.trim().length > 0 && title.length <= 80 && body.trim().length > 0 && body.length <= 300;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BellRing size={24} className="text-primary" aria-hidden /> Avisos a productores
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Mandá una notificación al celular o la compu de todos los productores que activaron las
          notificaciones del portal.
          {typeof subscribers.data === "number" && ` Hoy hay ${subscribers.data} dispositivo(s) suscripto(s).`}
        </p>
      </div>

      <form
        className="bg-card rounded-2xl shadow-soft p-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && confirm("¿Enviar este aviso a todos los productores?")) send.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="aviso-title">Título</Label>
          <Input id="aviso-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Cierre de producción" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="aviso-body">Mensaje</Label>
          <Textarea
            id="aviso-body"
            value={body}
            maxLength={300}
            rows={3}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ej: Recordá cargar las pólizas del mes antes del viernes."
          />
          <p className="text-xs text-muted-foreground text-right">{body.length}/300</p>
        </div>
        <div className="space-y-1.5">
          <Label>Al tocar la notificación, abrir</Label>
          <Select value={url} onValueChange={setUrl}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DESTINATIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={!valid || send.isPending}>
          <Send size={16} className="mr-2" aria-hidden />
          {send.isPending ? "Enviando..." : "Enviar aviso"}
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Enviados</h2>
        {history.isLoading ? (
          <LoadingState text="Cargando avisos..." />
        ) : !history.data?.length ? (
          <p className="text-sm text-muted-foreground">Todavía no se envió ningún aviso.</p>
        ) : (
          <ul className="space-y-2">
            {history.data.map((b) => (
              <li key={b.id} className="bg-card rounded-xl border border-border/60 p-4">
                <div className="flex justify-between gap-4">
                  <p className="font-medium">{b.title}</p>
                  <time className="text-xs text-muted-foreground shrink-0">
                    {new Date(b.created_at).toLocaleString("es-AR")}
                  </time>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{b.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AdminAvisos;
