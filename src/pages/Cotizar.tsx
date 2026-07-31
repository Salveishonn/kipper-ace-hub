import { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Seo } from "@/components/Seo";
import { ArrowLeft, ArrowRight, Car, Bike, Truck, Check, Upload, User, MapPin, Shield, Loader2 } from "lucide-react";
import { useCreateLead } from "@/hooks/useLeads";
import { useCreateContact } from "@/hooks/useContacts";
import { useCreateQuoteRequest, type QuoteRamo } from "@/hooks/useQuoteRequests";
import { getNextProducerForAssignment } from "@/hooks/useProducers";
import { vehicleBrands, getBrandsByType, getModelsByBrand, generateYears, COVERAGE_TYPES, VEHICLE_USES } from "@/data/vehicleBrands";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

const VEHICLE_TYPES = [
  { id: "auto", label: "Auto", icon: Car },
  { id: "moto", label: "Moto", icon: Bike },
  { id: "camioneta", label: "Camioneta", icon: Truck },
] as const;

interface FormData {
  vehicleType: "auto" | "moto" | "camioneta" | "";
  brand: string;
  brandName: string;
  model: string;
  year: string;
  version: string;
  use: string;
  postalCode: string;
  locality: string;
  coverage: string;
  name: string;
  dni: string;
  email: string;
  phone: string;
  marketingOptIn: boolean;
}

const initialFormData: FormData = {
  vehicleType: "",
  brand: "",
  brandName: "",
  model: "",
  year: "",
  version: "",
  use: "particular",
  postalCode: "",
  locality: "",
  coverage: "",
  name: "",
  dni: "",
  email: "",
  phone: "",
  marketingOptIn: true,
};

const CotizarPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createLead = useCreateLead();
  const createContact = useCreateContact();
  const createQuoteRequest = useCreateQuoteRequest();

  useEffect(() => {
    trackEvent("quote_started", { source: "cotizador_wizard" });
  }, []);

  const totalSteps = 5;

  const availableBrands = useMemo(() => {
    if (!formData.vehicleType) return [];
    return getBrandsByType(formData.vehicleType as "auto" | "moto" | "camioneta");
  }, [formData.vehicleType]);

  const availableModels = useMemo(() => {
    if (!formData.brand) return [];
    return getModelsByBrand(formData.brand);
  }, [formData.brand]);

  const years = useMemo(() => generateYears(2000), []);

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Reset dependent fields
      if (field === "vehicleType") {
        updated.brand = "";
        updated.brandName = "";
        updated.model = "";
      }
      if (field === "brand") {
        updated.model = "";
        // Get brand name
        const brand = availableBrands.find(b => b.id === value);
        updated.brandName = brand?.name || "";
      }
      
      return updated;
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!formData.vehicleType;
      case 2: return !!formData.brand && !!formData.year;
      case 3: return !!formData.postalCode && !!formData.coverage;
      case 4: return !!formData.name && !!formData.email && !!formData.phone;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Get producer for assignment (round-robin)
      const producerId = await getNextProducerForAssignment();

      // Create lead
      await createLead.mutateAsync({
        vehicle_type: formData.vehicleType,
        vehicle_brand: formData.brandName,
        vehicle_model: formData.model,
        vehicle_year: formData.year ? parseInt(formData.year) : undefined,
        vehicle_version: formData.version || undefined,
        vehicle_use: formData.use,
        coverage_type: formData.coverage,
        full_name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dni: formData.dni || undefined,
        locality: formData.locality || undefined,
        postal_code: formData.postalCode,
        origin: "cotizador",
      });

      // Create/update contact
      await createContact.mutateAsync({
        email: formData.email,
        phone: formData.phone || undefined,
        full_name: formData.name,
        origin: "cotizador",
        opt_in: formData.marketingOptIn,
      });

      // Also write unified quote_request (best-effort)
      try {
        const ramo: QuoteRamo = formData.vehicleType === "moto" ? "moto" : "auto";
        await createQuoteRequest.mutateAsync({
          ramo,
          full_name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          dni: formData.dni || null,
          city: formData.locality || null,
          vehicle_brand: formData.brandName || null,
          vehicle_model: formData.model || null,
          vehicle_year: formData.year ? parseInt(formData.year) : null,
          vehicle_version: formData.version || null,
          vehicle_use: formData.use || null,
          coverage_type: formData.coverage || null,
          source: "cotizador_wizard",
        });
      } catch (e) {
        console.warn("quote_request fallback failed", e);
      }

      toast.success("¡Solicitud enviada!");
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting lead:", error);
      toast.error("Error al enviar la solicitud", {
        description: "Por favor intentá de nuevo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <MainLayout>
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="text-center max-w-lg animate-fade-in">
            <div className="inline-flex p-6 bg-primary/10 rounded-full mb-6">
              <Check size={48} className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">
              ¡Recibimos tu solicitud!
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Un productor de Kipper se pondrá en contacto con vos en menos de 24 horas 
              para presentarte las mejores opciones.
            </p>
            <a
              href="/"
              className="btn-hero inline-flex items-center gap-2"
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Seo title="Cotizá tu seguro | Kipper Seguros" description="Completá el cotizador y recibí una propuesta personalizada de un productor de Kipper." />
      <div className="min-h-[80vh] py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Cotizá tu seguro de vehículo
            </h1>
            <p className="text-muted-foreground">
              Completá los datos y recibí una propuesta personalizada
            </p>
          </div>

          {/* Progress */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-colors ${
                    s <= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? <Check size={18} /> : s}
                </div>
              ))}
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Form Steps */}
          <div className="bg-card rounded-2xl shadow-card p-8">
            {/* Step 1: Vehicle Type */}
            {step === 1 && (
              <div className="animate-fade-in">
                <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Car className="text-primary" />
                  ¿Qué tipo de vehículo querés asegurar?
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  {VEHICLE_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => updateField("vehicleType", type.id)}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        formData.vehicleType === type.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <type.icon
                        size={32}
                        className={formData.vehicleType === type.id ? "text-primary mx-auto mb-2" : "text-muted-foreground mx-auto mb-2"}
                      />
                      <span className={`block font-medium ${formData.vehicleType === type.id ? "text-primary" : "text-foreground"}`}>
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Vehicle Details */}
            {step === 2 && (
              <div className="animate-fade-in space-y-6">
                <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Car className="text-primary" />
                  Datos del vehículo
                </h2>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Marca *</label>
                  <select
                    value={formData.brand}
                    onChange={(e) => updateField("brand", e.target.value)}
                    className="input-kipper"
                  >
                    <option value="">Seleccioná una marca</option>
                    {availableBrands.map((brand) => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Modelo</label>
                  <select
                    value={formData.model}
                    onChange={(e) => updateField("model", e.target.value)}
                    className="input-kipper"
                    disabled={!formData.brand}
                  >
                    <option value="">Seleccioná un modelo</option>
                    {availableModels.map((model) => (
                      <option key={model.name} value={model.name}>{model.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Año *</label>
                    <select
                      value={formData.year}
                      onChange={(e) => updateField("year", e.target.value)}
                      className="input-kipper"
                    >
                      <option value="">Año</option>
                      {years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Versión (opcional)</label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => updateField("version", e.target.value)}
                      placeholder="Ej: XEI 1.8 AT"
                      className="input-kipper"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Uso del vehículo</label>
                  <div className="flex gap-4">
                    {VEHICLE_USES.map((use) => (
                      <button
                        key={use.id}
                        type="button"
                        onClick={() => updateField("use", use.id)}
                        className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${
                          formData.use === use.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        {use.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Location & Coverage */}
            {step === 3 && (
              <div className="animate-fade-in space-y-6">
                <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <MapPin className="text-primary" />
                  Ubicación y cobertura
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Código Postal *</label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => updateField("postalCode", e.target.value)}
                      placeholder="Ej: 1425"
                      className="input-kipper"
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Localidad</label>
                    <input
                      type="text"
                      value={formData.locality}
                      onChange={(e) => updateField("locality", e.target.value)}
                      placeholder="Ej: CABA, Tigre..."
                      className="input-kipper"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-primary" />
                    Cobertura deseada *
                  </label>
                  <div className="space-y-3">
                    {COVERAGE_TYPES.map((coverage) => (
                      <button
                        key={coverage.id}
                        type="button"
                        onClick={() => updateField("coverage", coverage.id)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          formData.coverage === coverage.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className={`block font-semibold ${formData.coverage === coverage.id ? "text-primary" : "text-foreground"}`}>
                          {coverage.label}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {coverage.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Personal Data */}
            {step === 4 && (
              <div className="animate-fade-in space-y-6">
                <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <User className="text-primary" />
                  Tus datos de contacto
                </h2>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Nombre completo *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Juan Pérez"
                    className="input-kipper"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">DNI (opcional)</label>
                  <input
                    type="text"
                    value={formData.dni}
                    onChange={(e) => updateField("dni", e.target.value)}
                    placeholder="12345678"
                    className="input-kipper"
                    maxLength={8}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="tu@email.com"
                    className="input-kipper"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Teléfono *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="11 5555 1234"
                    className="input-kipper"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer mt-4">
                  <input
                    type="checkbox"
                    checked={formData.marketingOptIn}
                    onChange={(e) => updateField("marketingOptIn", e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-muted-foreground">
                    Quiero recibir novedades y promociones de Kipper Seguros
                  </span>
                </label>
              </div>
            )}

            {/* Step 5: Documents & Confirm */}
            {step === 5 && (
              <div className="animate-fade-in space-y-6">
                <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Upload className="text-primary" />
                  Documentación (opcional)
                </h2>

                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium text-foreground mb-1">
                    Subí fotos de la cédula verde o póliza anterior
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Esto agiliza el proceso pero no es obligatorio
                  </p>
                </div>

                <div className="bg-muted/50 rounded-xl p-6">
                  <h3 className="font-semibold text-foreground mb-4">Resumen de tu solicitud</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vehículo:</span>
                      <span className="font-medium">{formData.brandName} {formData.model} {formData.year}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cobertura:</span>
                      <span className="font-medium">{COVERAGE_TYPES.find(c => c.id === formData.coverage)?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ubicación:</span>
                      <span className="font-medium">CP {formData.postalCode} {formData.locality && `- ${formData.locality}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contacto:</span>
                      <span className="font-medium">{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{formData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Teléfono:</span>
                      <span className="font-medium">{formData.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-border">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isSubmitting}
                >
                  <ArrowLeft size={18} />
                  Anterior
                </button>
              ) : (
                <div />
              )}

              {step < totalSteps ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="btn-hero inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn-hero inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar solicitud
                      <Check size={18} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CotizarPage;
