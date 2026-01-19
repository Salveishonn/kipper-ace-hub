import { MainLayout } from "@/components/layout/MainLayout";
import { Link } from "react-router-dom";
import { Car, Home, Heart, UserCheck, Building2, Truck, ArrowRight, Check } from "lucide-react";

const services = [
  {
    id: "auto",
    icon: Car,
    title: "Auto & Moto",
    description: "Protección completa para tu vehículo. Elegí la cobertura que mejor se adapte a tus necesidades.",
    features: [
      "Responsabilidad Civil obligatoria",
      "Robo e incendio total y parcial",
      "Daños a terceros",
      "Cristales y cerraduras",
      "Auxilio mecánico y grúa",
      "Todo riesgo con franquicia",
    ],
  },
  {
    id: "hogar",
    icon: Home,
    title: "Hogar",
    description: "Tu casa y tus pertenencias, protegidas ante cualquier imprevisto.",
    features: [
      "Incendio y explosión",
      "Robo de contenido",
      "Daños por agua",
      "Responsabilidad civil familiar",
      "Asistencia en el hogar 24hs",
      "Daños eléctricos",
    ],
  },
  {
    id: "vida",
    icon: Heart,
    title: "Vida",
    description: "Tranquilidad para vos y tu familia. Coberturas flexibles según tus necesidades.",
    features: [
      "Cobertura por fallecimiento",
      "Invalidez total y permanente",
      "Enfermedades graves",
      "Doble indemnización accidental",
      "Ahorro y capitalización",
      "Renta familiar",
    ],
  },
  {
    id: "accidentes",
    icon: UserCheck,
    title: "Accidentes Personales",
    description: "Protección ante imprevistos. Ideal para deportistas, viajeros y trabajadores.",
    features: [
      "Muerte accidental",
      "Invalidez permanente",
      "Gastos médicos y farmacéuticos",
      "Cobertura deportiva",
      "Cobertura viajes",
      "Repatriación sanitaria",
    ],
  },
  {
    id: "comercio",
    icon: Building2,
    title: "Comercio / PyME",
    description: "Protegé tu negocio con coberturas integrales diseñadas para emprendedores.",
    features: [
      "Integral de comercio",
      "Responsabilidad civil comercial",
      "Caución alquileres",
      "Accidentes de trabajo (ART)",
      "Robo y hurto",
      "Lucro cesante",
    ],
  },
  {
    id: "flotas",
    icon: Truck,
    title: "Flotas",
    description: "Soluciones para empresas con múltiples vehículos. Gestión centralizada y tarifas especiales.",
    features: [
      "Administración centralizada",
      "Bonificaciones por flota",
      "Reportes de siniestralidad",
      "Gestión de conductores",
      "Seguro de cargas",
      "Responsabilidad civil transportista",
    ],
  },
];

const ServiciosPage = () => {
  return (
    <MainLayout>
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Nuestros Servicios</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Trabajamos con las mejores compañías aseguradoras de Argentina para 
            ofrecerte la cobertura ideal al mejor precio.
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="section-padding">
        <div className="max-w-7xl mx-auto space-y-24">
          {services.map((service, index) => (
            <div
              key={service.id}
              id={service.id}
              className={`flex flex-col ${
                index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              } items-center gap-12`}
            >
              <div className="flex-1">
                <div className="inline-flex p-4 bg-primary/10 rounded-2xl text-primary mb-6">
                  <service.icon size={40} />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">{service.title}</h2>
                <p className="text-lg text-muted-foreground mb-6">{service.description}</p>
                <ul className="space-y-3 mb-8">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-foreground">
                      <Check size={18} className="text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/cotizar"
                  className="btn-hero inline-flex items-center gap-2 group"
                >
                  Cotizar ahora
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <div className="flex-1">
                <div className="bg-muted rounded-3xl p-12 flex items-center justify-center">
                  <service.icon size={160} className="text-primary/20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-muted/50 section-padding">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            ¿No encontrás lo que buscás?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Contamos con soluciones a medida para necesidades específicas. 
            Contactanos y te asesoramos sin compromiso.
          </p>
          <Link to="/contacto" className="btn-hero inline-flex items-center gap-2">
            Contactar a un asesor
          </Link>
        </div>
      </section>
    </MainLayout>
  );
};

export default ServiciosPage;
