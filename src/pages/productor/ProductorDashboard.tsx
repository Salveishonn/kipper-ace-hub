import { Link } from "react-router-dom";
import { BookOpen, Palette, Newspaper, MessageSquare, ArrowRight, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePasResources } from "@/hooks/usePasResources";
import { useDesignResources, designCategoryLabel } from "@/hooks/useDesignResources";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { useAuth } from "@/hooks/useAuth";

const quickLinks = [
  { href: "/productor/academy", label: "Academy", description: "Capacitación y cursos", icon: BookOpen },
  { href: "/productor/recursos", label: "Recursos gráficos", description: "Plantillas para redes", icon: Palette },
  { href: "/productor/novedades", label: "Novedades", description: "Actualizaciones semanales", icon: Newspaper },
  { href: "/productor/consultas", label: "Consultas", description: "Casos con el equipo Kipper", icon: MessageSquare },
  { href: "/productor/perfil", label: "Mi perfil", description: "Tus datos de contacto", icon: User },
];

const ProductorDashboard = () => {
  const { user, profile } = useAuth();
  const { data: novedades } = usePasResources();
  const { data: designResources } = useDesignResources();
  const { data: tickets } = useSupportTickets({ producerId: user?.id });

  const { data: academyModules } = useQuery({
    queryKey: ["academy_modules_latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academy_modules")
        .select("id, title, slug, description")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const openTickets = tickets?.filter((t) => ["abierto", "en_gestion"].includes(t.status)).length ?? 0;
  const latestNovedades = novedades?.slice(0, 3) ?? [];
  const latestDesign = designResources?.slice(0, 3) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Hola, {profile?.full_name?.split(" ")[0] ?? "Productor"}
        </h1>
        <p className="text-muted-foreground">Portal Productores · Kipper Seguros</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {quickLinks.map((q) => (
          <Link
            key={q.href}
            to={q.href}
            className="bg-card rounded-xl p-4 shadow-soft border border-border/60 hover:border-primary/30 transition-colors"
          >
            <q.icon className="text-primary mb-2" size={20} aria-hidden />
            <p className="font-medium text-sm">{q.label}</p>
            <p className="text-xs text-muted-foreground">{q.description}</p>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-6 shadow-soft border border-border/60">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <BookOpen size={18} aria-hidden /> Academy
            </h2>
            <Link to="/productor/academy" className="text-sm text-primary hover:underline">
              Ver todo
            </Link>
          </div>
          {!academyModules?.length ? (
            <p className="text-sm text-muted-foreground">Todavía no hay módulos publicados.</p>
          ) : (
            <ul className="space-y-2">
              {academyModules.map((m) => (
                <li key={m.id} className="text-sm">
                  <span className="font-medium">{m.title}</span>
                  {m.description && (
                    <span className="text-muted-foreground"> · {m.description}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-xl p-6 shadow-soft border border-border/60">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Palette size={18} aria-hidden /> Recursos gráficos
            </h2>
            <Link to="/productor/recursos" className="text-sm text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          {!latestDesign.length ? (
            <p className="text-sm text-muted-foreground">
              Pronto verás plantillas de Instagram, WhatsApp y flyers acá.
            </p>
          ) : (
            <ul className="space-y-2">
              {latestDesign.map((r) => (
                <li key={r.id} className="text-sm">
                  <span className="font-medium">{r.title}</span>
                  <span className="text-muted-foreground"> · {designCategoryLabel(r.category)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-xl p-6 shadow-soft border border-border/60">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Newspaper size={18} aria-hidden /> Novedades
            </h2>
            <Link to="/productor/novedades" className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          {!latestNovedades.length ? (
            <p className="text-sm text-muted-foreground">No hay novedades publicadas aún.</p>
          ) : (
            <ul className="space-y-2">
              {latestNovedades.map((r) => (
                <li key={r.id} className="text-sm">
                  <span className="font-medium">{r.title}</span>
                  {r.week_label && <span className="text-muted-foreground"> · {r.week_label}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-xl p-6 shadow-soft border border-border/60">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare size={18} aria-hidden /> Consultas
            </h2>
            <Link to="/productor/consultas" className="text-sm text-primary hover:underline">
              Ir al inbox
            </Link>
          </div>
          <p className="text-3xl font-bold mb-1">{openTickets}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {openTickets === 1 ? "consulta abierta" : "consultas abiertas"} con el equipo Kipper
          </p>
          <Link to="/productor/consultas" className="btn-hero-outline inline-flex items-center gap-2 text-sm px-5 py-2.5">
            Nueva consulta <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductorDashboard;
