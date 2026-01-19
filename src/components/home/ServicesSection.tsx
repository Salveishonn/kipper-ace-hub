import { Link } from "react-router-dom";
import { Car, Home, Heart, UserCheck, Building2, Truck, ArrowRight } from "lucide-react";

const services = [
  {
    icon: Car,
    title: "Auto & Moto",
    description: "Protección completa para tu vehículo. Terceros, robo, incendio o todo riesgo.",
    href: "/servicios#auto",
  },
  {
    icon: Home,
    title: "Hogar",
    description: "Tu casa y tus cosas, protegidas. Incendio, robo, responsabilidad civil.",
    href: "/servicios#hogar",
  },
  {
    icon: Heart,
    title: "Vida",
    description: "Tranquilidad para vos y tu familia. Coberturas flexibles según tus necesidades.",
    href: "/servicios#vida",
  },
  {
    icon: UserCheck,
    title: "Accidentes Personales",
    description: "Cobertura ante imprevistos. Ideal para deportistas y trabajadores.",
    href: "/servicios#accidentes",
  },
  {
    icon: Building2,
    title: "Comercio / PyME",
    description: "Protegé tu negocio. Integral de comercio, responsabilidad civil, caución.",
    href: "/servicios#comercio",
  },
  {
    icon: Truck,
    title: "Flotas",
    description: "Soluciones para empresas con múltiples vehículos. Gestión centralizada.",
    href: "/servicios#flotas",
  },
];

export function ServicesSection() {
  return (
    <section className="section-padding bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Todos los seguros que necesitás
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Trabajamos con las mejores aseguradoras de Argentina para ofrecerte 
            la cobertura ideal al mejor precio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <Link
              key={service.title}
              to={service.href}
              className="card-elevated group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <service.icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {service.description}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Ver más <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
