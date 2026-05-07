import { Link } from "react-router-dom";
import { Car, Home, Heart, UserCheck, Building2, Truck, ArrowRight } from "lucide-react";

const services = [
  { icon: Car, title: "Auto", description: "Terceros, terceros completo o todo riesgo. Asesoramiento real.", href: "/seguro-auto" },
  { icon: Truck, title: "Moto", description: "Cobertura adaptada al uso particular o de trabajo.", href: "/seguro-moto" },
  { icon: Home, title: "Hogar", description: "Incendio, robo, daños por agua y responsabilidad civil.", href: "/seguro-hogar" },
  { icon: Building2, title: "Comercio / PyME", description: "Integral para tu local, mercadería y equipos.", href: "/seguro-comercio" },
  { icon: UserCheck, title: "Accidentes Personales", description: "Indemnización y asistencia médica ante accidentes.", href: "/seguro-accidentes-personales" },
  { icon: Heart, title: "Vida", description: "Resguardá a tu familia con un plan a medida.", href: "/seguro-vida" },
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
