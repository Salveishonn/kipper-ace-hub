import { useState } from "react";
import { Users, Shield, TrendingUp, Briefcase, Check, Send, Eye, EyeOff } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateProducerApplication } from "@/hooks/useProducerApplications";
import {
  isPasswordValid,
  passwordsMatch,
  PASSWORD_REQUIREMENTS,
} from "@/lib/passwordPolicy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const benefits = [
  { icon: Shield, title: "Herramientas Profesionales", description: "Portal Productores con recursos, academy y consultas" },
  { icon: TrendingUp, title: "Crecimiento", description: "Capacitación continua en Kipper Academy" },
  { icon: Users, title: "Comunidad", description: "Red de productores y soporte permanente" },
  { icon: Briefcase, title: "Organización PAS", description: "Acompañamiento comercial y operativo centralizado" },
];

const provinces = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba",
  "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja",
  "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan",
  "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
  "Tierra del Fuego", "Tucumán"
];

const SumatePage = () => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    ssn_license: "",
    email: "",
    phone: "",
    province: "",
    city: "",
    experience_years: "",
    insurers: "",
    message: "",
    password: "",
    confirm_password: "",
  });
  const createApplication = useCreateProducerApplication();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email) {
      toast.error("Completá los campos obligatorios");
      return;
    }
    if (!isPasswordValid(formData.password)) {
      toast.error("La contraseña no cumple los requisitos");
      return;
    }
    if (!passwordsMatch(formData.password, formData.confirm_password)) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    try {
      const yearsMap: Record<string, number> = {
        "0-1": 0, "1-3": 2, "3-5": 4, "5-10": 7, "10+": 10,
      };
      const result = await createApplication.mutateAsync({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirm_password,
        phone: formData.phone || null,
        matricula_ssn: formData.ssn_license || null,
        city: formData.city || null,
        province: formData.province || null,
        years_experience: formData.experience_years ? yearsMap[formData.experience_years] ?? null : null,
        current_companies: formData.insurers || null,
        message: formData.message || null,
      });

      setSuccessMessage(result.message);
      toast.success("Solicitud recibida");
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Error al enviar la solicitud. Intentá nuevamente.";
      toast.error(message);
    }
  };

  return (
    <MainLayout>
      <Seo title="Sumate a Kipper Seguros | Productores" description="Sumate a una organización para productores que quieren crecer con respaldo, herramientas y comunidad." />
      <section className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground py-20">
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

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">¿Por qué sumarte a Kipper?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-card p-6 rounded-xl shadow-soft text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="text-primary" size={24} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            {successMessage ? (
              <div className="bg-card rounded-2xl shadow-soft p-12 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="text-primary" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Solicitud recibida</h2>
                <p className="text-muted-foreground mb-6">{successMessage}</p>
              </div>
            ) : (
              <div className="bg-card rounded-2xl shadow-soft p-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Completá el formulario</h2>
                <p className="text-muted-foreground mb-6">
                  Creá tu usuario y enviá tu solicitud. El acceso al portal se habilita cuando Kipper apruebe tu postulación.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nombre y apellido *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Tu nombre completo"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ssn_license">Matrícula SSN</Label>
                      <Input
                        id="ssn_license"
                        value={formData.ssn_license}
                        onChange={(e) => setFormData((prev) => ({ ...prev, ssn_license: e.target.value }))}
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
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="tu@email.com"
                        required
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="11 1234-5678"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                          required
                          autoComplete="new-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <ul className="space-y-1 text-xs">
                        {PASSWORD_REQUIREMENTS.map((req) => {
                          const ok = req.test(formData.password);
                          return (
                            <li key={req.id} className={ok ? "text-primary" : "text-muted-foreground"}>
                              {ok ? "✓" : "○"} {req.label}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Confirmar contraseña *</Label>
                      <div className="relative">
                        <Input
                          id="confirm_password"
                          type={showConfirm ? "text" : "password"}
                          value={formData.confirm_password}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, confirm_password: e.target.value }))
                          }
                          required
                          autoComplete="new-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {formData.confirm_password.length > 0 &&
                        !passwordsMatch(formData.password, formData.confirm_password) && (
                          <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
                        )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="province">Provincia</Label>
                      <Select
                        value={formData.province}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, province: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccioná provincia" />
                        </SelectTrigger>
                        <SelectContent>
                          {provinces.map((prov) => (
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
                        onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                        placeholder="Tu ciudad"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="experience">Años de experiencia</Label>
                      <Select
                        value={formData.experience_years}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, experience_years: value }))
                        }
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
                        onChange={(e) => setFormData((prev) => ({ ...prev, insurers: e.target.value }))}
                        placeholder="Ej: La Segunda, Sancor..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mensaje (opcional)</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder="Contanos por qué querés sumarte a Kipper..."
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={
                      createApplication.isPending ||
                      !isPasswordValid(formData.password) ||
                      !passwordsMatch(formData.password, formData.confirm_password)
                    }
                  >
                    <Send size={18} className="mr-2" />
                    {createApplication.isPending ? "Enviando..." : "Crear cuenta y enviar solicitud"}
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
