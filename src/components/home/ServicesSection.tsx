import { Link } from "react-router-dom";
import { ArrowRight, Car, Home, Heart, UserCheck, Building2, Truck, type LucideIcon } from "lucide-react";
import { useAnimeScope } from "@/hooks/useAnimeScope";
import { registerSectionReveal } from "@/lib/motion/sectionReveal";
import { animate } from "animejs";
import { motion } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils";

const services: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}[] = [
  { icon: Car, title: "Auto", description: "Terceros, terceros completo o todo riesgo. Asesoramiento real.", href: "/seguro-auto" },
  { icon: Truck, title: "Moto", description: "Cobertura adaptada al uso particular o de trabajo.", href: "/seguro-moto" },
  { icon: Home, title: "Hogar", description: "Incendio, robo, daños por agua y responsabilidad civil.", href: "/seguro-hogar" },
  { icon: Building2, title: "Comercio / PyME", description: "Integral para tu local, mercadería y equipos.", href: "/seguro-comercio" },
  { icon: UserCheck, title: "Accidentes Personales", description: "Indemnización y asistencia médica ante accidentes.", href: "/seguro-accidentes-personales" },
  { icon: Heart, title: "Vida", description: "Resguardá a tu familia con un plan a medida.", href: "/seguro-vida" },
];

export function ServicesSection() {
  const scopeRef = useAnimeScope((scope) => {
    registerSectionReveal(scope, {
      selector: "[data-section='services']",
      childSelector: "[data-service-card]",
    });

    if (scope.matches.reducedMotion) return;

    const cards = scope.root.querySelectorAll<HTMLElement>("[data-service-card]");
    const cleanups: (() => void)[] = [];

    cards.forEach((card) => {
      const icon = card.querySelector("[data-service-icon]");
      const arrow = card.querySelector("[data-service-arrow]");

      const onEnter = () => {
        animate(card, {
          translateY: -4,
          boxShadow: "0 16px 40px -12px hsl(0 85% 27% / 0.18)",
          duration: motion.duration.hover,
          ease: motion.easing.out,
        });
        if (icon) {
          animate(icon, { scale: 1.06, duration: motion.duration.hover, ease: motion.easing.out });
        }
        if (arrow) {
          animate(arrow, { translateX: 4, duration: motion.duration.hover, ease: motion.easing.out });
        }
      };

      const onLeave = () => {
        animate(card, {
          translateY: 0,
          boxShadow: "0 8px 30px -8px hsl(0 0% 0% / 0.1)",
          duration: motion.duration.hover,
          ease: motion.easing.out,
        });
        if (icon) animate(icon, { scale: 1, duration: motion.duration.hover, ease: motion.easing.out });
        if (arrow) animate(arrow, { translateX: 0, duration: motion.duration.hover, ease: motion.easing.out });
      };

      card.addEventListener("pointerenter", onEnter);
      card.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        card.removeEventListener("pointerenter", onEnter);
        card.removeEventListener("pointerleave", onLeave);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  });

  return (
    <section ref={scopeRef} data-section="services" className="section-padding bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h2 data-reveal="heading" className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Todos los seguros que necesitás
          </h2>
          <p data-reveal="copy" className="text-lg text-muted-foreground">
            Trabajamos con las mejores aseguradoras de Argentina para ofrecerte
            la cobertura ideal al mejor precio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Link
              key={service.title}
              to={service.href}
              data-service-card
              className={cn(
                "group block bg-card rounded-xl p-6 shadow-card border border-border/80",
                "transition-colors duration-200 hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  data-service-icon
                  className="p-3 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200"
                >
                  <service.icon size={24} aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{service.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Ver más
                    <ArrowRight size={14} data-service-arrow aria-hidden />
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
