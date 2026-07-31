import { useState } from "react";
import { CreditCard, CheckCircle, Clock, AlertCircle, Download, Upload } from "lucide-react";
import { useMyInstallments, usePendingInstallments } from "@/hooks/useInstallments";
import { format, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUploadPaymentProof } from "@/hooks/usePaymentProofs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PortalPagos = () => {
  const { data: allInstallments = [], isLoading } = useMyInstallments();
  const { data: pendingInstallments = [] } = usePendingInstallments();
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofNotes, setProofNotes] = useState("");
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const { user } = useAuth();
  const uploadProof = useUploadPaymentProof();

  const today = new Date();

  const getStatusInfo = (installment: any) => {
    if (installment.status === 'pagado' || installment.paid_at) {
      return { label: 'Pagado', color: 'green', icon: CheckCircle };
    }
    const dueDate = new Date(installment.due_date);
    if (isBefore(dueDate, today)) {
      return { label: 'Vencido', color: 'red', icon: AlertCircle };
    }
    return { label: 'Pendiente', color: 'yellow', icon: Clock };
  };

  const filteredInstallments = allInstallments.filter(i => {
    if (filter === 'pending') return i.status === 'pendiente' || i.status === 'atrasada';
    if (filter === 'paid') return i.status === 'pagado';
    return true;
  });

  const handlePayment = (installment: any) => {
    setSelectedInstallment(installment);
    setShowPaymentModal(true);
  };

  const processPayment = () => {
    toast.success("Redirigiendo a MercadoPago...", {
      description: "Esta funcionalidad estará disponible próximamente"
    });
    setShowPaymentModal(false);
  };

  const handleDownloadReceipt = (installment: any) => {
    toast.info("Descargando comprobante...", {
      description: "Esta funcionalidad estará disponible próximamente"
    });
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
        <h1 className="text-2xl font-bold text-foreground">Mis Pagos</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-2xl shadow-soft">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Al Día</p>
              <p className="text-xl font-bold text-foreground">
                {allInstallments.filter(i => i.status === 'pagado').length} cuotas
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl shadow-soft">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Clock className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="text-xl font-bold text-foreground">
                {pendingInstallments.filter(i => !isBefore(new Date(i.due_date), today)).length} cuotas
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl shadow-soft">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vencidos</p>
              <p className="text-xl font-bold text-foreground">
                {pendingInstallments.filter(i => isBefore(new Date(i.due_date), today)).length} cuotas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todos
        </Button>
        <Button 
          variant={filter === 'pending' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('pending')}
        >
          Pendientes
        </Button>
        <Button 
          variant={filter === 'paid' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter('paid')}
        >
          Pagados
        </Button>
      </div>

      {/* Installments List */}
      {filteredInstallments.length === 0 ? (
        <div className="bg-card rounded-2xl shadow-soft p-12 text-center">
          <CreditCard size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay cuotas para mostrar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInstallments.map((installment: any) => {
            const statusInfo = getStatusInfo(installment);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div key={installment.id} className="bg-card rounded-xl shadow-soft p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      statusInfo.color === 'green' ? 'bg-green-100' :
                      statusInfo.color === 'red' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      <StatusIcon size={18} className={
                        statusInfo.color === 'green' ? 'text-green-600' :
                        statusInfo.color === 'red' ? 'text-red-600' : 'text-yellow-600'
                      } />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Cuota {installment.installment_number}
                        {installment.policy && (
                          <span className="text-muted-foreground font-normal">
                            {' '}• {installment.policy.policy_type}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Vence: {format(new Date(installment.due_date), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        ${installment.amount.toLocaleString('es-AR')}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        statusInfo.color === 'green' ? 'bg-green-100 text-green-700' :
                        statusInfo.color === 'red' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {installment.status === 'pagado' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReceipt(installment)}
                      >
                        <Download size={14} className="mr-1" /> Recibo
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handlePayment(installment)}
                      >
                        Pagar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagar Cuota</DialogTitle>
            <DialogDescription>
              Vas a pagar la cuota {selectedInstallment?.installment_number}
            </DialogDescription>
          </DialogHeader>

          {selectedInstallment && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Monto</span>
                  <span className="font-bold">${selectedInstallment.amount.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vencimiento</span>
                  <span>{format(new Date(selectedInstallment.due_date), 'dd/MM/yyyy')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Método de pago</p>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={processPayment}
                    className="p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors text-center"
                  >
                    <span className="text-2xl block mb-1">💳</span>
                    <span className="text-xs text-muted-foreground">MercadoPago</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setShowProofModal(true);
                    }}
                    className="p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors text-center"
                  >
                    <span className="text-2xl block mb-1">🧾</span>
                    <span className="text-xs text-muted-foreground">Avisar pago</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowPaymentModal(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={processPayment}>
                  Continuar con el pago
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Avisar pago modal */}
      <Dialog open={showProofModal} onOpenChange={setShowProofModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avisar pago</DialogTitle>
            <DialogDescription>
              Subí el comprobante de pago. Un asesor lo revisa y marca la cuota como pagada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proof-file">Comprobante (imagen o PDF)</Label>
              <Input
                id="proof-file"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proof-notes">Notas (opcional)</Label>
              <Textarea
                id="proof-notes"
                value={proofNotes}
                onChange={(e) => setProofNotes(e.target.value)}
                rows={3}
                placeholder="Ej: Transferencia desde Banco Galicia..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProofModal(false)}>Cancelar</Button>
            <Button
              disabled={!proofFile || !user || uploadProof.isPending}
              onClick={async () => {
                if (!proofFile || !user || !selectedInstallment) return;
                try {
                  await uploadProof.mutateAsync({
                    installmentId: selectedInstallment.id,
                    userId: user.id,
                    file: proofFile,
                    amount: selectedInstallment.amount,
                    notes: proofNotes || undefined,
                  });
                  toast.success("Comprobante enviado. Lo vamos a revisar.");
                  setShowProofModal(false);
                  setProofFile(null);
                  setProofNotes("");
                } catch (e) {
                  console.error(e);
                  toast.error("No pudimos subir el comprobante.");
                }
              }}
            >
              <Upload size={14} className="mr-2" />
              {uploadProof.isPending ? "Subiendo..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalPagos;
