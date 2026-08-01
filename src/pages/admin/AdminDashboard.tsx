import { Link } from "react-router-dom";
import {
  Mail, MessageSquare, UserCheck, BookOpen, Palette, Newspaper,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProducerApplications } from "@/hooks/useProducerApplications";
import { PENDING_APPLICATION_STATUSES } from "@/lib/producerApplicationStatus";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { useProducers } from "@/hooks/useProducers";
import { consultaCategoryLabel } from "@/lib/consultaCategories";

/** Real published-content counts, fetched head-only (no rows). */
function usePublishedCounts() {
  return useQuery({
    queryKey: ["admin_published_counts"],
    queryFn: async () => {
      const [academy, design, novedades] = await Promise.all([
        supabase.from("academy_modules").select("id", { count: "exact", head: true }).eq("published", true),
        supabase.from("design_resources").select("id", { count: "exact", head: true }).eq("published", true),
        supabase.from("pas_resources").select("id", { count: "exact", head: true }).eq("published", true),
      ]);
      const firstError = academy.error ?? design.error ?? novedades.error;
      if (firstError) throw firstError;
      return {
        academy: academy.count ?? 0,
        design: design.count ?? 0,
        novedades: novedades.count ?? 0,
      };
    },
  });
}

const AdminDashboard = () => {
  const { data: applications } = useProducerApplications();
  const { data: tickets } = useSupportTickets({ admin: true });
  const { data: producers } = useProducers();
  const { data: counts } = usePublishedCounts();

  const pendingApps = applications?.filter((a) =>
    PENDING_APPLICATION_STATUSES.includes(a.status as (typeof PENDING_APPLICATION_STATUSES)[number])
  ).length ?? 0;
  const activeProducers =
    producers?.filter((p) => p.profile?.account_status !== "suspended").length ?? 0;
  const openTickets = tickets?.filter((t) => ["abierto", "en_gestion"].includes(t.status)).length ?? 0;

  const cards = [
    { label: "Solicitudes PAS pendientes", value: pendingApps, href: "/admin/solicitudes-pas", icon: Mail },
    { label: "Productores activos", value: activeProducers, href: "/admin/productores", icon: UserCheck },
    { label: "Academy publicados", value: counts?.academy ?? 0, href: "/admin/academy", icon: BookOpen },
    { label: "Recursos gráficos publicados", value: counts?.design ?? 0, href: "/admin/recursos-graficos", icon: Palette },
    { label: "Novedades publicadas", value: counts?.novedades ?? 0, href: "/admin/novedades", icon: Newspaper },
    { label: "Consultas abiertas", value: openTickets, href: "/admin/consultas", icon: MessageSquare },
  ];

  const recentApplications = (applications ?? []).slice(0, 4);
  const recentTickets = (tickets ?? []).slice(0, 4);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Resumen</h1>
        <p className="text-muted-foreground">Gestión de la red PAS y el contenido interno</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href + c.label}
            to={c.href}
            className="bg-card rounded-xl p-5 shadow-soft border border-border/60 hover:border-primary/30 transition-colors"
          >
            <c.icon className="text-primary mb-3" size={22} aria-hidden />
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-6 shadow-soft border border-border/60">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Mail size={18} aria-hidden /> Últimas solicitudes PAS
            </h2>
            <Link to="/admin/solicitudes-pas" className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          {!recentApplications.length ? (
            <p className="text-sm text-muted-foreground">No hay solicitudes registradas.</p>
          ) : (
            <ul className="space-y-2">
              {recentApplications.map((a) => (
                <li key={a.id} className="text-sm flex justify-between gap-3">
                  <span className="font-medium truncate">{a.full_name || a.email}</span>
                  <span className="text-muted-foreground capitalize shrink-0">
                    {a.status.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-xl p-6 shadow-soft border border-border/60">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare size={18} aria-hidden /> Últimas consultas
            </h2>
            <Link to="/admin/consultas" className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          {!recentTickets.length ? (
            <p className="text-sm text-muted-foreground">No hay consultas registradas.</p>
          ) : (
            <ul className="space-y-2">
              {recentTickets.map((t) => (
                <li key={t.id} className="text-sm flex justify-between gap-3">
                  <Link to={`/admin/consultas/${t.id}`} className="font-medium truncate hover:text-primary">
                    {t.subject}
                  </Link>
                  <span className="text-muted-foreground shrink-0">
                    {consultaCategoryLabel(t.category)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
