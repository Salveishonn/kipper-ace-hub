import { useState } from "react";
import { FileText, Download, CheckCircle, Clock, XCircle, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { useMyPolicies } from "@/hooks/usePolicies";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PolicyDocuments = ({ policy }: { policy: any }) => {
  // Mock documents - in production these would come from policy.documents
  const documents = [
    { name: "Póliza", type: "poliza", available: true },
    { name: "Certificado de Cobertura", type: "certificado", available: true },
    { name: "Certificado Mercosur", type: "mercosur", available: policy.policy_type === "auto" },
    { name: "Libre Deuda", type: "libre_deuda", available: true },
    { name: "Cupón Vigente", type: "cupon", available: true },
  ];

  const handleDownload = (docType: string, docName: string) => {
    // In production, this would download from Supabase Storage
    toast.info(`Descargando ${docName}...`, {
      description: "Esta funcionalidad estará disponible próximamente"
    });
  };

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <h4 className="text-sm font-medium text-foreground mb-3">Documentos</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {documents.filter(d => d.available).map((doc) => (
          <button
            key={doc.type}
            onClick={() => handleDownload(doc.type, doc.name)}
            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
          >
            <Download size={14} className="text-primary flex-shrink-0" />
            <span className="text-xs text-foreground truncate">{doc.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const PortalPolizas = () => {
  const { data: policies = [], isLoading } = useMyPolicies();
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'activa':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle size={12} /> Activa
          </span>
        );
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock size={12} /> Pendiente
          </span>
        );
      case 'vencida':
      case 'anulada':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle size={12} /> {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  const getPolicyIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'auto': return "🚗";
      case 'moto': return "🏍️";
      case 'hogar': return "🏠";
      case 'vida': return "❤️";
      case 'accidentes_personales': return "🏥";
      case 'comercio': return "🏪";
      default: return "📋";
    }
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
        <h1 className="text-2xl font-bold text-foreground">Mis Pólizas</h1>
        <span className="text-sm text-muted-foreground">
          {policies.length} póliza(s)
        </span>
      </div>

      {policies.length === 0 ? (
        <div className="bg-card rounded-2xl shadow-soft p-12 text-center">
          <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No tenés pólizas registradas</p>
          <a href="/portal/solicitudes" className="btn-hero inline-flex items-center gap-2">
            Solicitar seguro
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {policies.map((policy) => (
            <div key={policy.id} className="bg-card rounded-2xl shadow-soft overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-2xl">
                      {getPolicyIcon(policy.policy_type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {policy.policy_type.charAt(0).toUpperCase() + policy.policy_type.slice(1)}
                        {policy.insurance_company && ` - ${policy.insurance_company.name}`}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {policy.vehicle_brand && policy.vehicle_model 
                          ? `${policy.vehicle_brand} ${policy.vehicle_model} ${policy.vehicle_year || ''}`
                          : policy.policy_number 
                            ? `Póliza N° ${policy.policy_number}`
                            : `ID: ${policy.id.slice(0, 8)}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {getStatusBadge(policy.status)}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={12} />
                          Vigencia: {format(new Date(policy.start_date), 'dd/MM/yy')} - {format(new Date(policy.end_date), 'dd/MM/yy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedPolicy(expandedPolicy === policy.id ? null : policy.id)}
                      className="flex items-center gap-1"
                    >
                      {expandedPolicy === policy.id ? (
                        <>Ocultar <ChevronUp size={14} /></>
                      ) : (
                        <>Ver más <ChevronDown size={14} /></>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedPolicy === policy.id && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Tipo de Cobertura</p>
                        <p className="text-sm font-medium text-foreground">
                          {policy.coverage_type || 'Terceros Completo'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Prima Mensual</p>
                        <p className="text-sm font-medium text-foreground">
                          ${policy.premium_amount?.toLocaleString('es-AR') || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Frecuencia de Pago</p>
                        <p className="text-sm font-medium text-foreground capitalize">
                          {policy.payment_frequency || 'Mensual'}
                        </p>
                      </div>
                      {policy.vehicle_plate && (
                        <div>
                          <p className="text-xs text-muted-foreground">Patente</p>
                          <p className="text-sm font-medium text-foreground uppercase">
                            {policy.vehicle_plate}
                          </p>
                        </div>
                      )}
                    </div>

                    <PolicyDocuments policy={policy} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalPolizas;
