import { NotificationSettings } from "@/components/notifications/NotificationSettings";

const AdminNotificaciones = () => (
  <div className="max-w-2xl space-y-6">
    <div>
      <h1 className="text-2xl font-bold">Mis notificaciones</h1>
      <p className="text-muted-foreground">
        Instalá Kipper Admin en tu celular y recibí avisos al instante, sin tener el panel abierto.
      </p>
    </div>
    <div id="notificaciones">
      <NotificationSettings variant="admin" />
    </div>
  </div>
);

export default AdminNotificaciones;
