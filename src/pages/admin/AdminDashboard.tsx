import { Link } from "react-router-dom";
import {
  LayoutDashboard, Mail, MessageSquare, FolderOpen, UserCheck,
} from "lucide-react";
import { useProducerApplications } from "@/hooks/useProducerApplications";
import { PENDING_APPLICATION_STATUSES } from "@/lib/producerApplicationStatus";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { useProducers } from "@/hooks/useProducers";

const AdminDashboard = () => {
  const { data: applications } = useProducerApplications();
  const { data: tickets } = useSupportTickets({ admin: true });
  const { data: producers } = useProducers();

  const pendingApps = applications?.filter((a) =>
    PENDING_APPLICATION_STATUSES.includes(a.status as (typeof PENDING_APPLICATION_STATUSES)[number])
  ).length ?? 0;
  const openTickets = tickets?.filter((t) => ["abierto", "en_gestion"].includes(t.status)).length ?? 0;

  const cards = [
    { label: "Solicitudes pendientes", value: pendingApps, href: "/admin/solicitudes-pas", icon: Mail },
    { label: "Consultas abiertas", value: openTickets, href: "/admin/consultas", icon: MessageSquare },
    { label: "Productores PAS", value: producers?.length ?? 0, href: "/admin/productores", icon: UserCheck },
    { label: "Recursos", value: "—", href: "/admin/recursos", icon: FolderOpen },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Gestión PAS e intranet Kipper</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            to={c.href}
            className="bg-card rounded-2xl p-5 shadow-soft hover:shadow-md transition-shadow"
          >
            <c.icon className="text-primary mb-3" size={24} />
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-soft">
        <h2 className="font-semibold flex items-center gap-2 mb-2">
          <LayoutDashboard size={18} /> Accesos rápidos
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Aprobá solicitudes PAS con invitación por email, publicá recursos semanales y respondé consultas.
        </p>
        <Link to="/admin/solicitudes-pas" className="text-primary text-sm font-medium hover:underline">
          Ir a solicitudes PAS →
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
