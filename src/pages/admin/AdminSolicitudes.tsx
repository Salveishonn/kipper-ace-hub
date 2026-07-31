import { useState } from "react";
import { Seo } from "@/components/Seo";
import { useQuoteRequests, useUpdateQuoteRequest } from "@/hooks/useQuoteRequests";
import { useProducerApplications } from "@/hooks/useProducerApplications";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["nuevo", "asignado", "cotizando", "cotizado", "cerrado", "descartado"];
const RAMOS = ["auto", "moto", "hogar", "comercio", "accidentes_personales", "vida", "otro", "sumate_productor"];

const AdminSolicitudes = () => {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [ramoFilter, setRamoFilter] = useState<string | undefined>();
  const { data: requests, isLoading } = useQuoteRequests({ status: statusFilter, ramo: ramoFilter });
  const { data: applications } = useProducerApplications();
  const update = useUpdateQuoteRequest();

  const handleStatus = async (id: string, status: string) => {
    try {
      await update.mutateAsync({ id, status });
      toast.success("Estado actualizado");
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  return (
    <div className="space-y-6">
      <Seo title="Solicitudes | Admin Kipper" />
      <div>
        <h1 className="text-2xl font-bold">Solicitudes</h1>
        <p className="text-muted-foreground">Cotizaciones, contactos y solicitudes de productores.</p>
      </div>

      <Tabs defaultValue="quotes">
        <TabsList>
          <TabsTrigger value="quotes">Cotizaciones ({requests?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="producers">Productores ({applications?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="quotes" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter ?? "all"} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ramoFilter ?? "all"} onValueChange={(v) => setRamoFilter(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Ramo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los ramos</SelectItem>
                {RAMOS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
          ) : !requests?.length ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Sin solicitudes.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <Card key={r.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{r.full_name}</CardTitle>
                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Mail size={14} />{r.email}</span>
                          {r.phone && <span className="flex items-center gap-1"><Phone size={14} />{r.phone}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary">{r.ramo}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("es-AR")}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(r.vehicle_brand || r.vehicle_model || r.coverage_type) && (
                      <p className="text-sm">
                        <strong>Vehículo:</strong> {[r.vehicle_brand, r.vehicle_model, r.vehicle_year, r.vehicle_version].filter(Boolean).join(" ")}
                        {r.coverage_type && <> · <strong>Cobertura:</strong> {r.coverage_type}</>}
                      </p>
                    )}
                    {r.message && <p className="text-sm text-muted-foreground italic">"{r.message}"</p>}
                    <div className="flex flex-wrap gap-2 items-center">
                      <Select value={r.status} onValueChange={(v) => handleStatus(r.id, v)}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`mailto:${r.email}`}>Email</a>
                      </Button>
                      {r.phone && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`https://wa.me/${r.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="producers" className="space-y-3">
          {!applications?.length ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Sin postulaciones.</CardContent></Card>
          ) : applications.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-base">{a.full_name}</CardTitle>
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("es-AR")}</span>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><strong>Email:</strong> {a.email} {a.phone && <>· <strong>Tel:</strong> {a.phone}</>}</p>
                {a.matricula_ssn && <p><strong>Matrícula SSN:</strong> {a.matricula_ssn}</p>}
                {(a.city || a.province) && <p>{[a.city, a.province].filter(Boolean).join(", ")}</p>}
                {a.years_experience !== null && <p><strong>Experiencia:</strong> {a.years_experience} años</p>}
                {a.current_companies && <p><strong>Compañías:</strong> {a.current_companies}</p>}
                {a.message && <p className="italic text-muted-foreground">"{a.message}"</p>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSolicitudes;
