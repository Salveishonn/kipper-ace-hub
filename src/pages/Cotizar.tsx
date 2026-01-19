import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ArrowLeft, ArrowRight, Car, Bike, Truck, Check, Upload, User, MapPin, Shield } from "lucide-react";

const VEHICLE_TYPES = [
  { id: "auto", label: "Auto", icon: Car },
  { id: "moto", label: "Moto", icon: Bike },
  { id: "camioneta", label: "Camioneta", icon: Truck },
];

const COVERAGE_TYPES = [
  { id: "terceros", label: "Responsabilidad Civil", description: "Cobertura básica obligatoria" },
  { id: "terceros_completo", label: "Terceros Completo", description: "RC + Robo + Incendio" },
  { id: "todo_riesgo", label: "Todo Riesgo", description: "Cobertura integral" },
];

const BRANDS = ["Chevrolet", "Fiat", "Ford", "Honda", "Peugeot", "Renault", "Toyota", "Volkswagen"];
const YEARS = Array.from({ length: 25 }, (_, i) => (2025 - i).toString());

interface FormData {
  vehicleType: string;
  brand: string;
  model: string;
  year: string;
  version: string;
  use: string;
  postalCode: string;
  coverage: string;
  name: string;
  dni: string;
  email: string;
  phone: string;
  hasDocuments: boolean;
}

const initialFormData: FormData = {
  vehicleType: "",
  brand: "",
  model: "",
  year: "",
  version: "",
  use: "particular",
  postalCode: "",
  coverage: "",
  name: "",
  dni: "",
  email: "",
  phone: "",
  hasDocuments: false,
};

const CotizarPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitted, setSubmitted] = useState(false);

  const totalSteps = 5;

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  const handleSubmit = () => {
    // Here you would send to API
    console.log("Lead submitted:", formData);
    setSubmitted(true);
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
                  <label className="block text-sm font-medium text-foreground mb-2">Marca</label>
                  <select
                    value={formData.brand}
                    onChange={(e) => updateField("brand", e.target.value)}
                    className="input-kipper"
                  >
                    <option value="">Seleccioná una marca</option>
                    {BRANDS.map((brand) => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Modelo</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => updateField("model", e.target.value)}
                    placeholder="Ej: Corolla, Cronos, Gol..."
                    className="input-kipper"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Año</label>
                    <select
                      value={formData.year}
                      onChange={(e) => updateField("year", e.target.value)}
                      className="input-kipper"
                    >
                      <option value="">Año</option>
                      {YEARS.map((year) => (
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
                      placeholder="Ej: XEI 1.8"
                      className="input-kipper"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Uso</label>
                  <div className="flex gap-4">
                    {[
                      { id: "particular", label: "Particular" },
                      { id: "comercial", label: "Comercial" },
                      { id: "uber", label: "Uber/Remis" },
                    ].map((use) => (
                      <button
                        key={use.id}
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

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Código Postal</label>
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
                  <label className="block text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-primary" />
                    Cobertura deseada
                  </label>
                  <div className="space-y-3">
                    {COVERAGE_TYPES.map((coverage) => (
                      <button
                        key={coverage.id}
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
                  <label className="block text-sm font-medium text-foreground mb-2">Nombre completo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Juan Pérez"
                    className="input-kipper"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">DNI</label>
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
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="tu@email.com"
                    className="input-kipper"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="1155551234"
                    className="input-kipper"
                  />
                </div>
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
                      <span className="font-medium">{formData.brand} {formData.model} {formData.year}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cobertura:</span>
                      <span className="font-medium">{COVERAGE_TYPES.find(c => c.id === formData.coverage)?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ubicación:</span>
                      <span className="font-medium">CP {formData.postalCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contacto:</span>
                      <span className="font-medium">{formData.email}</span>
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
                  className="btn-hero inline-flex items-center gap-2"
                >
                  Enviar solicitud
                  <Check size={18} />
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
