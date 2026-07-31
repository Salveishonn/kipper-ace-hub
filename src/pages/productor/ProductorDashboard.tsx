import { Link } from "react-router-dom";
import { FolderOpen, MessageSquare, BookOpen, ArrowRight } from "lucide-react";
import { usePasResources } from "@/hooks/usePasResources";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { useAuth } from "@/hooks/useAuth";

const ProductorDashboard = () => {
  const { user, profile } = useAuth();
  const { data: resources } = usePasResources();
  const { data: tickets } = useSupportTickets({ producerId: user?.id });

  const openTickets = tickets?.filter((t) => ["abierto", "en_gestion"].includes(t.status)).length ?? 0;
  const recentResources = resources?.slice(0, 3) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Hola, {profile?.full_name?.split(" ")[0] ?? "Productor"}
        </h1>
        <p className="text-muted-foreground">Portal PAS Kipper Seguros</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-soft">
          <p className="text-3xl font-bold">{recentResources.length}</p>
          <p className="text-sm text-muted-foreground">Recursos recientes</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-soft">
          <p className="text-3xl font-bold">{openTickets}</p>
          <p className="text-sm text-muted-foreground">Consultas abiertas</p>
        </div>
        <Link to="/academy/contenido" className="bg-card rounded-2xl p-5 shadow-soft hover:shadow-md transition-shadow">
          <BookOpen className="text-primary mb-2" />
          <p className="font-medium">Kipper Academy</p>
          <p className="text-sm text-muted-foreground">Capacitación</p>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-6 shadow-soft">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <FolderOpen size={18} /> Recursos
            </h2>
            <Link to="/productor/novedades" className="text-sm text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          {recentResources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay recursos publicados aún.</p>
          ) : (
            <ul className="space-y-2">
              {recentResources.map((r) => (
                <li key={r.id} className="text-sm">
                  <span className="font-medium">{r.title}</span>
                  {r.week_label && <span className="text-muted-foreground"> · {r.week_label}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-soft">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare size={18} /> Consultas
            </h2>
            <Link to="/productor/consultas" className="text-sm text-primary hover:underline">
              Ir al inbox
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Reportá siniestros o consultas operativas y seguí el estado con nuestro equipo.
          </p>
          <Link to="/productor/consultas" className="btn-hero-outline inline-flex items-center gap-2 text-sm">
            Nueva consulta <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductorDashboard;
