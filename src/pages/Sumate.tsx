import { useState } from "react";
import { Users, Shield, TrendingUp, Briefcase, Check, Send } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const benefits = [
  { icon: Shield, title: "Herramientas Profesionales", description: "Acceso a sistema de gestión, cotizador y CRM" },
  { icon: TrendingUp, title: "Crecimiento", description: "Capacitación continua en Kipper Academy" },
  { icon: Users, title: "Comunidad", description: "Red de productores y soporte permanente" },
  { icon: Briefcase, title: "Cartera Propia", description: "Administrá tu cartera con autonomía" },
];

const provinces = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba", 
  "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja",
  "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", 
  "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", 
  "Tierra del Fuego", "Tucumán"
];

const SumatePage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    ssn_license: '',
    email: '',
    phone: '',
    province: '',
    city: '',
    experience_years: '',
    insurers: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email) {
      toast.error("Completá los campos obligatorios");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create lead with origin 'productor_recruit'
      const { error: leadError } = await supabase
        .from('leads')
        .insert({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          locality: formData.city || null,
          postal_code: formData.province || null,
          notes: `Matrícula: ${formData.ssn_license || 'No especificada'}\nExperiencia: ${formData.experience_years || 'No especificada'} años\nCompañías: ${formData.insurers || 'No especificadas'}\nMensaje: ${formData.message || 'Sin mensaje'}`,
          origin: 'productor_recruit',
          status: 'nuevo'
        });

      if (leadError) throw leadError;

      // Also add to contacts
      await supabase
        .from('contacts')
        .upsert({
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || null,
          origin: 'sumate',
          tags: ['producer_candidate'],
          opt_in: true
        }, {
          onConflict: 'email'
        });

      setIsSubmitted(true);
      toast.success("¡Solicitud enviada correctamente!");
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error("Error al enviar la solicitud. Intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Users size={16} /> Únete al equipo
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              ¿Sos Productor de Seguros?
            </h1>
            <p className="text-xl opacity-90 mb-8">
              Sumate a Kipper y accedé a herramientas profesionales, 
              capacitación continua y una comunidad de productores en crecimiento.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">¿Por qué sumarte a Kipper?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-card p-6 rounded-xl shadow-soft text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="text-emerald-600" size={24} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            {isSubmitted ? (
              <div className="bg-card rounded-2xl shadow-soft p-12 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="text-green-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">¡Gracias por tu interés!</h2>
                <p className="text-muted-foreground mb-6">
                  Recibimos tu solicitud. Nuestro equipo se va a contactar a la brevedad para 
                  contarte más sobre cómo sumarte a Kipper.
                </p>
                <a 
                  href="https://wa.me/5491112345678?text=Hola! Acabo de completar el formulario para sumarme como productor."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-hero inline-flex items-center gap-2"
                >
                  Contactar por WhatsApp
                </a>
              </div>
            ) : (
              <div className="bg-card rounded-2xl shadow-soft p-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Completá el formulario</h2>
                <p className="text-muted-foreground mb-6">
                  Contanos sobre vos y tu experiencia. Nos pondremos en contacto.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nombre y apellido *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Tu nombre completo"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ssn_license">Matrícula SSN</Label>
                      <Input
                        id="ssn_license"
                        value={formData.ssn_license}
                        onChange={(e) => setFormData(prev => ({ ...prev, ssn_license: e.target.value }))}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="province">Provincia</Label>
                      <Select 
                        value={formData.province} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, province: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccioná provincia" />
                        </SelectTrigger>
                        <SelectContent>
                          {provinces.map(prov => (
                            <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Ciudad</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Tu ciudad"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="experience">Años de experiencia</Label>
                      <Select 
                        value={formData.experience_years} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, experience_years: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccioná" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0-1">Menos de 1 año</SelectItem>
                          <SelectItem value="1-3">1-3 años</SelectItem>
                          <SelectItem value="3-5">3-5 años</SelectItem>
                          <SelectItem value="5-10">5-10 años</SelectItem>
                          <SelectItem value="10+">Más de 10 años</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="insurers">Compañías con las que trabajás</Label>
                      <Input
                        id="insurers"
                        value={formData.insurers}
                        onChange={(e) => setFormData(prev => ({ ...prev, insurers: e.target.value }))}
                        placeholder="Ej: La Segunda, Sancor..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mensaje (opcional)</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Contanos por qué querés sumarte a Kipper..."
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    <Send size={18} className="mr-2" />
                    {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default SumatePage;
