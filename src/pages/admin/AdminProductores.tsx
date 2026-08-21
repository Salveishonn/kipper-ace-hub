import { useMemo, useState } from "react";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Edit,
  Ban,
  Save,
  X,
  RotateCcw,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  useProducerApplications,
  useUpdateProducerApplication,
  useApprovePasProducer,
  useInvitePasProducer,
  useCreatePasProducer,
} from "@/hooks/useProducerApplications";
import { useRestorePasProducer, useRevokePasProducer, useUpdateProducerProfile } from "@/hooks/useProducers";
import {
  PRODUCER_APPLICATION_STATUS,
  countPasAdminFilters,
  defaultPasAdminFilter,
  isLegacyInviteFlow,
  isPasAccessDeleted,
  isSelfRegistrationPending,
  matchesPasAdminFilter,
  type PasAdminFilter,
} from "@/lib/producerApplicationStatus";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const statusLabel: Record<string, string> = {
  [PRODUCER_APPLICATION_STATUS.PENDING]: "Pendiente de aprobación",
  [PRODUCER_APPLICATION_STATUS.NUEVO]: "Pendiente de aprobación",
  [PRODUCER_APPLICATION_STATUS.EN_REVISION]: "En revisión",
  [PRODUCER_APPLICATION_STATUS.RECHAZADO]: "Rechazado",
  [PRODUCER_APPLICATION_STATUS.INVITADO]: "Legacy: invitación enviada",
  [PRODUCER_APPLICATION_STATUS.ACTIVO]: "Activo",
  aprobado: "Pendiente de aprobación",
};

type AppRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  matricula_ssn: string | null;
  city: string | null;
  province: string | null;
  years_experience: number | null;
  current_companies: string | null;
  message: string | null;
  status: string;
  user_id: string | null;
  admin_notes: string | null;
  approved_at: string | null;
  account_status?: string | null;
  dni?: string | null;
  address?: string | null;
  postal_code?: string | null;
};

const emptyCreate = {
  full_name: "",
  email: "",
  phone: "",
  matricula_ssn: "",
  city: "",
  province: "",
};

const AdminProductores = () => {
  const { data, isLoading, error } = useProducerApplications();
  const updateApp = useUpdateProducerApplication();
  const updateProfile = useUpdateProducerProfile();
  const approve = useApprovePasProducer();
  const invite = useInvitePasProducer();
  const createPas = useCreatePasProducer();
  const revoke = useRevokePasProducer();
  const restore = useRestorePasProducer();
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<PasAdminFilter | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editing, setEditing] = useState<AppRow | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    matricula_ssn: "",
    city: "",
    province: "",
    years_experience: "",
    current_companies: "",
    message: "",
    email: "",
    dni: "",
    address: "",
    postal_code: "",
  });

  const rows = (data || []) as AppRow[];
  const counts = useMemo(() => countPasAdminFilters(rows), [rows]);
  const activeFilter = filter ?? defaultPasAdminFilter(rows);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((app) => {
      if (!matchesPasAdminFilter(app, activeFilter)) return false;
      if (!q) return true;
      return (
        app.full_name.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        (app.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, activeFilter, search]);

  const handleReject = async (id: string) => {
    try {
      await updateApp.mutateAsync({
        id,
        status: PRODUCER_APPLICATION_STATUS.RECHAZADO,
        admin_notes: notesDraft[id] || undefined,
      });
      toast.success("Solicitud rechazada");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const handleSaveNotes = async (id: string) => {
    try {
      await updateApp.mutateAsync({
        id,
        admin_notes: notesDraft[id] ?? "",
      });
      toast.success("Notas guardadas");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar notas");
    }
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      if (notesDraft[id]) {
        await updateApp.mutateAsync({ id, admin_notes: notesDraft[id] });
      }
      const result = await approve.mutateAsync({ application_id: id });
      if (result.warning) {
        toast.warning("Acceso aprobado con advertencia", { description: result.warning });
      } else {
        toast.success(result.message || "Acceso aprobado. El productor ya puede ingresar.");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al aprobar");
    } finally {
      setApprovingId(null);
    }
  };

  const handleLegacyInvite = async (id: string, resend = false) => {
    try {
      await invite.mutateAsync({ application_id: id, resend });
      toast.success(resend ? "Invitación legacy reenviada" : "Invitación legacy enviada");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al invitar (legacy)");
    }
  };

  const handleDelete = async (app: AppRow) => {
    if (!app.user_id) return;
    if (
      !confirm(
        `¿Eliminar el acceso de ${app.full_name}? No podrá entrar al portal. Podés restaurarlo después.`,
      )
    ) {
      return;
    }
    try {
      await revoke.mutateAsync(app.user_id);
      toast.success("Acceso eliminado. El productor ya no puede entrar al portal.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar el acceso");
    }
  };

  const handleRestore = async (app: AppRow) => {
    if (!app.user_id) return;
    if (!confirm(`¿Restaurar el acceso de ${app.full_name}?`)) return;
    try {
      await restore.mutateAsync(app.user_id);
      toast.success("Acceso restaurado. El productor ya puede entrar al portal.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo restaurar");
    }
  };

  const handleCreate = async () => {
    if (!createForm.full_name.trim() || !createForm.email.trim()) {
      toast.error("Nombre y email son obligatorios");
      return;
    }
    try {
      const result = await createPas.mutateAsync({
        full_name: createForm.full_name.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || null,
        matricula_ssn: createForm.matricula_ssn.trim() || null,
        city: createForm.city.trim() || null,
        province: createForm.province.trim() || null,
      });
      if (result.warning) {
        toast.warning(result.message || "Productor creado con advertencia", {
          description: result.warning,
        });
      } else {
        toast.success(result.message || "Productor creado. Recibirá un email para elegir su contraseña.");
      }
      setCreateForm(emptyCreate);
      setShowCreate(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear el productor");
    }
  };

  const openEdit = (app: AppRow) => {
    setEditing(app);
    setEditForm({
      full_name: app.full_name || "",
      phone: app.phone || "",
      matricula_ssn: app.matricula_ssn || "",
      city: app.city || "",
      province: app.province || "",
      years_experience: app.years_experience?.toString() ?? "",
      current_companies: app.current_companies || "",
      message: app.message || "",
      email: app.email || "",
      dni: app.dni || "",
      address: app.address || "",
      postal_code: app.postal_code || "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editForm.full_name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    try {
      const years =
        editForm.years_experience.trim() === ""
          ? null
          : Number.parseInt(editForm.years_experience, 10);
      await updateApp.mutateAsync({
        id: editing.id,
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim() || null,
        matricula_ssn: editForm.matricula_ssn.trim() || null,
        city: editForm.city.trim() || null,
        province: editForm.province.trim() || null,
        years_experience: Number.isFinite(years as number) ? years : null,
        current_companies: editForm.current_companies.trim() || null,
        message: editForm.message.trim() || null,
        ...(editing.user_id ? {} : { email: editForm.email.trim() }),
      });
      if (editing.user_id) {
        await updateProfile.mutateAsync({
          user_id: editing.user_id,
          full_name: editForm.full_name.trim(),
          phone: editForm.phone.trim() || null,
          dni: editForm.dni.trim() || null,
          address: editForm.address.trim() || null,
          city: editForm.city.trim() || null,
          province: editForm.province.trim() || null,
          postal_code: editForm.postal_code.trim() || null,
        });
      }
      toast.success("Datos actualizados");
      setEditing(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  if (isLoading) return <LoadingState text="Cargando productores..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar los productores" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Productores</h1>
          <p className="text-muted-foreground">
            Solicitudes de Sumate y cuentas PAS: aprobá, creá, editá o eliminá el acceso.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreateForm(emptyCreate);
            setShowCreate(true);
          }}
        >
          <Plus size={18} className="mr-2" aria-hidden /> Crear productor
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["pendientes", `Pendientes (${counts.pendientes})`],
            ["activos", `Activos (${counts.activos})`],
            ["rechazados", `Rechazados (${counts.rechazados})`],
            ["eliminados", `Eliminados (${counts.eliminados})`],
            ["todos", `Todos (${counts.todos})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              activeFilter === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Buscar por nombre, email o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-kipper pl-10"
          aria-label="Buscar productores"
        />
      </div>

      {!filtered.length ? (
        <EmptyState title="Sin resultados" description="No hay productores en este filtro." />
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => {
            const selfRegPending = isSelfRegistrationPending(app);
            const legacy = isLegacyInviteFlow(app);
            const isApproving = approvingId === app.id && approve.isPending;
            const deleted = isPasAccessDeleted(app);
            const canToggleAccess =
              app.status === PRODUCER_APPLICATION_STATUS.ACTIVO && Boolean(app.user_id);

            return (
              <div key={app.id} className="bg-card rounded-2xl shadow-soft p-6 space-y-4">
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{app.full_name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail size={14} /> {app.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {app.province}
                      {app.city ? ` · ${app.city}` : ""}
                      {app.matricula_ssn ? ` · Mat. ${app.matricula_ssn}` : ""}
                      {app.phone ? ` · ${app.phone}` : ""}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-medium px-3 py-1 rounded-full h-fit ${
                      deleted
                        ? "bg-amber-100 text-amber-800"
                        : app.status === PRODUCER_APPLICATION_STATUS.ACTIVO
                          ? "bg-green-100 text-green-700"
                          : "bg-primary/10 text-primary"
                    }`}
                  >
                    {deleted ? "Eliminado" : statusLabel[app.status] ?? app.status}
                  </span>
                </div>

                {app.status === PRODUCER_APPLICATION_STATUS.ACTIVO && !deleted && (
                  <p className="text-sm text-primary flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    Puede acceder al portal con su email y contraseña.
                    {app.approved_at
                      ? ` Alta: ${new Date(app.approved_at).toLocaleString("es-AR")}`
                      : ""}
                  </p>
                )}

                {deleted && (
                  <p className="text-sm text-amber-800 flex items-center gap-2">
                    <Ban size={16} />
                    Acceso eliminado. No puede entrar al portal hasta que lo restaures.
                  </p>
                )}

                {legacy && (
                  <div className="text-sm rounded-lg border border-amber-300 bg-amber-50 text-amber-950 p-3 flex gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Registro legacy (invitación)</p>
                      <p>
                        Esta solicitud no usa el flujo de auto-registro. Podés reenviar la
                        invitación legacy o pedirle al productor que se registre en Sumate.
                      </p>
                    </div>
                  </div>
                )}

                {app.message && (
                  <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">
                    {app.message}
                  </p>
                )}
                <textarea
                  className="input-kipper min-h-[60px] text-sm"
                  placeholder="Notas internas (opcional)"
                  value={notesDraft[app.id] ?? app.admin_notes ?? ""}
                  onChange={(e) => setNotesDraft((s) => ({ ...s, [app.id]: e.target.value }))}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(app)}>
                    <Edit size={16} className="mr-2" /> Editar datos
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSaveNotes(app.id)}
                    disabled={updateApp.isPending}
                  >
                    <Save size={16} className="mr-2" /> Guardar notas
                  </Button>

                  {selfRegPending && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(app.id)}
                        disabled={isApproving || approve.isPending}
                      >
                        {isApproving ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        <span className="ml-2">
                          {isApproving ? "Aprobando…" : "Aprobar acceso"}
                        </span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(app.id)}>
                        <XCircle size={16} className="mr-2" /> Rechazar
                      </Button>
                    </>
                  )}

                  {canToggleAccess &&
                    (deleted ? (
                      <Button
                        size="sm"
                        onClick={() => handleRestore(app)}
                        disabled={restore.isPending}
                      >
                        {restore.isPending ? (
                          <Loader2 className="animate-spin mr-2" size={16} />
                        ) : (
                          <RotateCcw size={16} className="mr-2" />
                        )}
                        Restaurar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(app)}
                        disabled={revoke.isPending}
                      >
                        {revoke.isPending ? (
                          <Loader2 className="animate-spin mr-2" size={16} />
                        ) : (
                          <Trash2 size={16} className="mr-2" />
                        )}
                        Eliminar
                      </Button>
                    ))}

                  {legacy && app.status !== PRODUCER_APPLICATION_STATUS.INVITADO && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleLegacyInvite(app.id)}
                        disabled={invite.isPending}
                      >
                        {invite.isPending ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <RefreshCw size={16} />
                        )}
                        <span className="ml-2">Invitación legacy</span>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(app.id)}>
                        <XCircle size={16} className="mr-2" /> Rechazar
                      </Button>
                    </>
                  )}

                  {app.status === PRODUCER_APPLICATION_STATUS.INVITADO && !app.user_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLegacyInvite(app.id, true)}
                      disabled={invite.isPending}
                    >
                      <RefreshCw size={16} className="mr-2" /> Reenviar invitación legacy
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-elevated max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Crear productor</h2>
                <p className="text-sm text-muted-foreground">
                  Recibirá un email para elegir su contraseña e ingresar al portal.
                </p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} aria-label="Cerrar">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-sm font-medium">Nombre y apellido *</label>
                <input
                  className="input-kipper mt-1"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email *</label>
                <input
                  type="email"
                  className="input-kipper mt-1"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              {(
                [
                  ["phone", "Teléfono"],
                  ["matricula_ssn", "Matrícula SSN"],
                  ["city", "Ciudad"],
                  ["province", "Provincia"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="text-sm font-medium">{label}</label>
                  <input
                    className="input-kipper mt-1"
                    value={createForm[key]}
                    onChange={(e) => setCreateForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <Button className="w-full" onClick={handleCreate} disabled={createPas.isPending}>
                {createPas.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Crear y enviar email
              </Button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 bg-foreground/20 z-50 flex items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-elevated max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold">Editar productor</h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Cerrar">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="text-sm font-medium">Nombre y apellido *</label>
                <input
                  className="input-kipper mt-1"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  className="input-kipper mt-1"
                  value={editForm.email}
                  disabled={Boolean(editing.user_id)}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
                {editing.user_id && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Email de Auth vinculado: no se edita desde acá.
                  </p>
                )}
              </div>
              {(
                [
                  ["phone", "Teléfono"],
                  ["matricula_ssn", "Matrícula SSN"],
                  ["dni", "DNI"],
                  ["city", "Ciudad"],
                  ["province", "Provincia"],
                  ["postal_code", "Código postal"],
                  ["address", "Dirección"],
                  ["years_experience", "Años de experiencia"],
                  ["current_companies", "Compañías"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="text-sm font-medium">{label}</label>
                  <input
                    className="input-kipper mt-1"
                    value={editForm[key]}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium">Mensaje</label>
                <textarea
                  className="input-kipper mt-1 min-h-[80px]"
                  value={editForm.message}
                  onChange={(e) => setEditForm((f) => ({ ...f, message: e.target.value }))}
                />
              </div>
              <Button
                className="w-full"
                onClick={saveEdit}
                disabled={updateApp.isPending || updateProfile.isPending}
              >
                {updateApp.isPending || updateProfile.isPending ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : null}
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductores;
