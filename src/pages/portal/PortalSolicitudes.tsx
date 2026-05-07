import { useState } from "react";
import { FileText, Car, Home, Heart, Shield, Building, HelpCircle, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const insuranceTypes = [
  { id: 'auto', name: 'Auto', icon: Car, description: 'Autos, pick-ups, utilitarios' },
  { id: 'moto', name: 'Moto', icon: Car, description: 'Motos, ciclomotores, cuatriciclos' },
  { id: 'hogar', name: 'Hogar', icon: Home, description: 'Casa, departamento, contenido' },
  { id: 'vida', name: 'Vida', icon: Heart, description: 'Seguro de vida individual o familiar' },
  { id: 'accidentes_personales', name: 'Accidentes Personales', icon: Shield, description: 'Cobertura ante accidentes' },
  { id: 'comercio', name: 'Comercio / PyME', icon: Building, description: 'Comercios, oficinas, industrias' },
  { id: 'otros', name: 'Otros', icon: HelpCircle, description: 'Consultar por otros ramos' },
];

const PortalSolicitudes = () => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType) {
      toast.error("Seleccioná un tipo de seguro");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('quote_requests')
        .insert({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          message: formData.notes || null,
          source: 'portal_solicitud',
          status: 'nuevo',
          user_id: user?.id || null,
          ramo: selectedType!,
          coverage_type: selectedType,
        });

      if (error) throw error;

      setStep(3); // Success step
      toast.success("Solicitud enviada correctamente");
    } catch (error) {
      console.error('Error creating lead:', error);
      toast.error("Error al enviar la solicitud. Intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedType(null);
    setFormData({
      full_name: profile?.full_name || '',
      email: profile?.email || user?.email || '',
      phone: profile?.phone || '',
      notes: ''
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Solicitar Nueva Póliza</h1>
        <p className="text-muted-foreground">Elegí el tipo de seguro que necesitás</p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          {step > 1 ? <Check size={16} /> : '1'}
        </div>
        <div className={`flex-1 h-1 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          {step > 2 ? <Check size={16} /> : '2'}
        </div>
        <div className={`flex-1 h-1 ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          {step > 3 ? <Check size={16} /> : '3'}
        </div>
      </div>

      {/* Step 1: Select Type */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">¿Qué tipo de seguro necesitás?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insuranceTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedType === type.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedType === type.id ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Icon className={selectedType === type.id ? 'text-primary' : 'text-muted-foreground'} size={24} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{type.name}</p>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => setStep(2)} 
              disabled={!selectedType}
              className="flex items-center gap-2"
            >
              Continuar <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Contact Info */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-lg font-semibold">Datos de contacto</h2>
          
          <div className="bg-card p-4 rounded-xl mb-4">
            <p className="text-sm text-muted-foreground">
              Tipo de seguro seleccionado: <strong className="text-foreground">
                {insuranceTypes.find(t => t.id === selectedType)?.name}
              </strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Tu nombre"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="11 1234-5678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Comentarios adicionales</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Contanos qué necesitás asegurar, detalles del bien, etc."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Volver
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
            </Button>
          </div>
        </form>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="bg-card rounded-2xl shadow-soft p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">¡Solicitud enviada!</h2>
          <p className="text-muted-foreground mb-6">
            Recibimos tu solicitud de seguro. Un asesor se va a contactar a la brevedad
            para brindarte la mejor cotización.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={resetForm}>
              Hacer otra solicitud
            </Button>
            <a 
              href={`https://wa.me/5491112345678?text=Hola! Acabo de enviar una solicitud de seguro de ${insuranceTypes.find(t => t.id === selectedType)?.name} desde el portal.`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hero inline-flex items-center justify-center gap-2"
            >
              Contactar por WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalSolicitudes;
