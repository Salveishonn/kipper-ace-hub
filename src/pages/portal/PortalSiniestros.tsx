import { useState } from "react";
import { AlertTriangle, Plus, Clock, CheckCircle, FileText, Upload, X } from "lucide-react";
import { useMyClaims, useCreateClaim } from "@/hooks/useClaims";
import { useMyPolicies } from "@/hooks/usePolicies";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'recibido':
      return { label: 'Recibido', color: 'bg-blue-100 text-blue-700', icon: FileText };
    case 'en_gestion':
      return { label: 'En Gestión', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
    case 'pendiente':
      return { label: 'Pendiente', color: 'bg-orange-100 text-orange-700', icon: Clock };
    case 'cerrado':
      return { label: 'Cerrado', color: 'bg-green-100 text-green-700', icon: CheckCircle };
    default:
      return { label: status, color: 'bg-muted text-muted-foreground', icon: FileText };
  }
};

const PortalSiniestros = () => {
  const { data: claims = [], isLoading, refetch } = useMyClaims();
  const { data: policies = [] } = useMyPolicies();
  const createClaim = useCreateClaim();
  
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);
  const [formData, setFormData] = useState({
    policy_id: '',
    incident_date: '',
    incident_time: '',
    incident_location: '',
    description: ''
  });
  const [files, setFiles] = useState<File[]>([]);

  const activePolicies = policies.filter(p => p.status === 'activa');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.policy_id || !formData.incident_date || !formData.description) {
      toast.error("Completá los campos obligatorios");
      return;
    }

    try {
      await createClaim.mutateAsync({
        policy_id: formData.policy_id,
        incident_date: formData.incident_date,
        incident_time: formData.incident_time || undefined,
        incident_location: formData.incident_location || undefined,
        description: formData.description
      });
      
      toast.success("Siniestro reportado exitosamente", {
        description: "Nos pondremos en contacto a la brevedad"
      });
      
      setShowNewClaimModal(false);
      setFormData({
        policy_id: '',
        incident_date: '',
        incident_time: '',
        incident_location: '',
        description: ''
      });
      setFiles([]);
      refetch();
    } catch (error) {
      toast.error("Error al reportar el siniestro");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles].slice(0, 5)); // Max 5 files
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Siniestros</h1>
        <Button onClick={() => setShowNewClaimModal(true)} className="flex items-center gap-2">
          <Plus size={18} /> Reportar siniestro
        </Button>
      </div>

      {claims.length === 0 ? (
        <div className="bg-card rounded-2xl shadow-soft p-12 text-center">
          <AlertTriangle size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">No tenés siniestros reportados</p>
          <p className="text-muted-foreground mb-6">
            Si tuviste un incidente, podés reportarlo acá
          </p>
          <Button onClick={() => setShowNewClaimModal(true)} className="flex items-center gap-2">
            <Plus size={18} /> Reportar siniestro
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => {
            const statusConfig = getStatusConfig(claim.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div key={claim.id} className="bg-card rounded-2xl shadow-soft p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <AlertTriangle className="text-primary" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {claim.policy?.policy_type 
                          ? claim.policy.policy_type.charAt(0).toUpperCase() + claim.policy.policy_type.slice(1)
                          : 'Siniestro'}
                        {claim.claim_number && ` #${claim.claim_number}`}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Fecha del incidente: {format(new Date(claim.incident_date), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                      <p className="text-sm text-foreground mt-2 line-clamp-2">
                        {claim.description}
                      </p>
                      {claim.incident_location && (
                        <p className="text-sm text-muted-foreground mt-1">
                          📍 {claim.incident_location}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                      <StatusIcon size={14} />
                      {statusConfig.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Reportado: {format(new Date(claim.created_at), 'dd/MM/yyyy')}
                    </span>
                  </div>
                </div>

                {claim.resolution_notes && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      <strong>Notas:</strong> {claim.resolution_notes}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Claim Modal */}
      <Dialog open={showNewClaimModal} onOpenChange={setShowNewClaimModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reportar Siniestro</DialogTitle>
            <DialogDescription>
              Completá los datos del incidente. Nos pondremos en contacto a la brevedad.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="policy">Póliza afectada *</Label>
              <Select 
                value={formData.policy_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, policy_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná una póliza" />
                </SelectTrigger>
                <SelectContent>
                  {activePolicies.map(policy => (
                    <SelectItem key={policy.id} value={policy.id}>
                      {policy.policy_type.charAt(0).toUpperCase() + policy.policy_type.slice(1)}
                      {policy.vehicle_brand && ` - ${policy.vehicle_brand} ${policy.vehicle_model}`}
                      {policy.insurance_company && ` (${policy.insurance_company.name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="incident_date">Fecha del incidente *</Label>
                <Input
                  id="incident_date"
                  type="date"
                  value={formData.incident_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, incident_date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="incident_time">Hora aproximada</Label>
                <Input
                  id="incident_time"
                  type="time"
                  value={formData.incident_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, incident_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="incident_location">Lugar del incidente</Label>
              <Input
                id="incident_location"
                placeholder="Ej: Av. Corrientes y Callao, CABA"
                value={formData.incident_location}
                onChange={(e) => setFormData(prev => ({ ...prev, incident_location: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción del incidente *</Label>
              <Textarea
                id="description"
                placeholder="Describí qué pasó con el mayor detalle posible..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Fotos / Documentos (opcional)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="mx-auto text-muted-foreground mb-2" size={24} />
                  <p className="text-sm text-muted-foreground">
                    Hacé clic para subir archivos (máx. 5)
                  </p>
                </label>
              </div>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button type="button" onClick={() => removeFile(index)}>
                        <X size={14} className="text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowNewClaimModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={createClaim.isPending}>
                {createClaim.isPending ? 'Enviando...' : 'Reportar Siniestro'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalSiniestros;
