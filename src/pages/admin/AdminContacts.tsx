import { useState } from "react";
import { Search, Download, Tag, Mail, Phone, Calendar } from "lucide-react";
import { useContacts, exportContactsToCSV } from "@/hooks/useContacts";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/loading-state";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const AdminContacts = () => {
  const { data: contacts, isLoading, error } = useContacts();
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState("");

  const filtered = contacts?.filter(c => {
    const q = search.toLowerCase();
    const matchSearch =
      c.email.toLowerCase().includes(q) ||
      c.full_name?.toLowerCase().includes(q) ||
      c.phone?.includes(q);
    const matchOrigin = !originFilter || c.origin === originFilter;
    return matchSearch && matchOrigin;
  }) || [];

  const origins = [...new Set(contacts?.map(c => c.origin).filter(Boolean) || [])];

  const handleExportCSV = () => {
    if (!filtered.length) {
      toast.error("No hay contactos para exportar");
      return;
    }
    const csv = exportContactsToCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contactos-kipper-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV descargado");
  };

  if (isLoading) return <LoadingState text="Cargando contactos..." />;
  if (error) return <ErrorState title="Error" message="No se pudieron cargar los contactos" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contactos</h1>
          <p className="text-muted-foreground">Lista de contactos para email marketing</p>
        </div>
        <button onClick={handleExportCSV} className="btn-hero text-sm px-4 py-2 inline-flex items-center gap-2">
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar por email, nombre o teléfono..." value={search} onChange={e => setSearch(e.target.value)} className="input-kipper pl-10" />
        </div>
        <select value={originFilter} onChange={e => setOriginFilter(e.target.value)} className="input-kipper max-w-xs">
          <option value="">Todos los orígenes</option>
          {origins.map(o => <option key={o} value={o!}>{o}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-foreground">{contacts?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Total contactos</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-green-600">{contacts?.filter(c => c.opt_in).length || 0}</p>
          <p className="text-xs text-muted-foreground">Con opt-in</p>
        </div>
        <div className="bg-card p-4 rounded-xl shadow-soft text-center">
          <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
          <p className="text-xs text-muted-foreground">Filtrados</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Sin contactos" description="No hay contactos que coincidan" />
      ) : (
        <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contacto</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Teléfono</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Origen</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Opt-In</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tags</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-foreground">{c.full_name || "—"}</p>
                      <p className="text-sm text-muted-foreground">{c.email}</p>
                    </td>
                    <td className="p-4 text-sm">{c.phone || "—"}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-muted rounded text-xs">{c.origin || "—"}</span></td>
                    <td className="p-4">{c.opt_in ? <span className="text-green-600 font-medium text-sm">Sí</span> : <span className="text-muted-foreground text-sm">No</span>}</td>
                    <td className="p-4">
                      <div className="flex gap-1 flex-wrap">
                        {(c.tags || []).map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {format(new Date(c.created_at), "dd/MM/yy", { locale: es })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContacts;
