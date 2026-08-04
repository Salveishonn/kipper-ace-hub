import {
  useProducers,
  useUpdateProducerProfile,
  useRevokePasProducer,
  useRestorePasProducer,
  type Producer,
} from "@/hooks/useProducers";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { Search, Users, Edit, Ban, RotateCcw, X, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type FilterTab = "activos" | "suspendidos" | "todos";

const AdminProductores = () => {
  const { data: producers, isLoading, error } = useProducers();
  const updateProfile = useUpdateProducerProfile();
  const revoke = useRevokePasProducer();
  const restore = useRestorePasProducer();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("activos");
  const [editing, setEditing] = useState<Producer | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    dni: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (producers || []).filter((p) => {
      const status = p.profile?.account_status || "active";
      const isActive = status === "active" && p.hasProductorRole;
      const isSuspended = status === "suspended" || !p.hasProductorRole;
      if (filter === "activos" && !isActive) return false;
      if (filter === "suspendidos" && !isSuspended) return false;
      if (!q) return true;
      return (
        p.profile?.full_name?.toLowerCase().includes(q) ||
        p.profile?.email?.toLowerCase().includes(q) ||
        p.profile?.phone?.toLowerCase().includes(q)
      );
    });
  }, [producers, search, filter]);

  const activeCount = (producers || []).filter(
    (p) => p.profile?.account_status === "active" && p.hasProductorRole,
  ).length;
  const suspendedCount = (producers || []).filter(
    (p) => p.profile?.account_status === "suspended" || !p.hasProductorRole,
  ).length;

  const openEdit = (p: Producer) => {
    setEditing(p);
    setForm({
      full_name: p.profile?.full_name || "",
      phone: p.profile?.phone || "",
      dni: p.profile?.dni || "",
      address: p.profile?.address || "",
      city: p.profile?.city || "",
      province: p.profile?.province || "",
      postal_code: p.profile?.postal_code || "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!form.full_name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    try {
      await updateProfile.mutateAsync({
        user_id: editing.user_id,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        dni: form.dni.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        province: form.province.trim() || null,
        postal_code: form.postal_code.trim() || null,
      });
      toast.success("Datos actualizados");
      setEditing(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const handleRevoke = async (p: Producer) => {
    if (!confirm(`¿Suspender el acceso de ${p.profile?.full_name || p.profile?.email}?`)) return;
    try {
      await revoke.mutateAsync(p.user_id);
      toast.success("Acceso suspendido");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo suspender");
    }
  };

  const handleRestore = async (p: Producer) => {
    if (!confirm(`¿Reactivar el acceso de ${p.profile?.full_name || p.profile?.email}?`)) return;
    try {
      await restore.mutateAsync(p.user_id);
      toast.success("Acceso reactivado");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo reactivar");
    }
  };

  if (isLoading) return <LoadingState text="Cargando productores..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar los productores" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Productores PAS</h1>
        <p className="text-muted-foreground">
          Editá datos, suspendé o reactivá el acceso al portal
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["activos", `Activos (${activeCount})`],
            ["suspendidos", `Suspendidos (${suspendedCount})`],
            ["todos", `Todos (${producers?.length || 0})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              filter === key
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
        />
        <input
          type="text"
          placeholder="Buscar por nombre, email o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-kipper pl-10"
        />
      </div>

      <div className="bg-card p-4 rounded-xl shadow-soft inline-flex items-center gap-3">
        <Users className="text-primary" />
        <div>
          <p className="text-2xl font-bold">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Productores activos</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="No hay productores que coincidan con el filtro."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((producer) => {
            const suspended =
              producer.profile?.account_status === "suspended" || !producer.hasProductorRole;
            return (
              <div key={producer.id} className="bg-card rounded-2xl shadow-soft p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg shrink-0">
                      {producer.profile?.full_name?.charAt(0)?.toUpperCase() || "P"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground text-lg">
                          {producer.profile?.full_name || "Sin nombre"}
                        </h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            suspended
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {suspended ? "Suspendido" : "Activo"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {producer.profile?.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {[producer.profile?.phone, producer.profile?.city, producer.profile?.province]
                          .filter(Boolean)
                          .join(" · ") || "Sin datos de contacto adicionales"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(producer)}>
                      <Edit size={14} className="mr-2" /> Editar datos
                    </Button>
                    {suspended ? (
                      <Button
                        size="sm"
                        onClick={() => handleRestore(producer)}
                        disabled={restore.isPending}
                      >
                        {restore.isPending ? (
                          <Loader2 size={14} className="mr-2 animate-spin" />
                        ) : (
                          <RotateCcw size={14} className="mr-2" />
                        )}
                        Reactivar acceso
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRevoke(producer)}
                        disabled={revoke.isPending}
                      >
                        {revoke.isPending ? (
                          <Loader2 size={14} className="mr-2 animate-spin" />
                        ) : (
                          <Ban size={14} className="mr-2" />
                        )}
                        Suspender acceso
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
              <div>
                <h2 className="text-xl font-bold">Editar productor</h2>
                <p className="text-sm text-muted-foreground">{editing.profile?.email}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)}>
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {(
                [
                  ["full_name", "Nombre y apellido *"],
                  ["phone", "Teléfono"],
                  ["dni", "DNI"],
                  ["city", "Ciudad"],
                  ["province", "Provincia"],
                  ["postal_code", "Código postal"],
                  ["address", "Dirección"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="text-sm font-medium">{label}</label>
                  <input
                    className="input-kipper mt-1"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                El email de acceso se gestiona en Supabase Auth y no se edita desde acá.
              </p>
              <Button
                className="w-full"
                onClick={saveEdit}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? (
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
