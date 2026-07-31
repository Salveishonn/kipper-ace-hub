import { animate, createDrawable, onScroll } from "animejs";
import { useAnimeScope } from "@/hooks/useAnimeScope";
import { registerSectionReveal } from "@/lib/motion/sectionReveal";
import { motion } from "@/lib/motion/tokens";
import { Users, Award, Building, Headphones } from "lucide-react";

const stats = [
  { icon: Users, value: "15+", label: "Productores especializados" },
  { icon: Award, value: "25+", label: "Años de experiencia" },
  { icon: Building, value: "20+", label: "Compañías asociadas" },
  { icon: Headphones, value: "24hs", label: "Tiempo de respuesta" },
];

const insurers = [
  "La Segunda",
  "Sancor",
  "Federación Patronal",
  "Rivadavia",
  "San Cristóbal",
  "Zurich",
  "Mapfre",
  "Allianz",
];

export function TrustSection() {
  const scopeRef = useAnimeScope((scope) => {
    registerSectionReveal(scope, {
      selector: "[data-section='trust']",
      childSelector: "[data-trust-stat]",
    });

    if (scope.matches.reducedMotion) return;

    const line = scope.root.querySelector<SVGLineElement>("[data-trust-line]");
    const divider = scope.root.querySelector("[data-trust-divider]");
    if (line && divider) {
      const drawable = createDrawable(line);
      const drawAnim = animate(drawable, {
        draw: "0 1",
        duration: motion.duration.cinematic,
        ease: motion.easing.inOut,
        autoplay: onScroll({
          target: divider,
          enter: "bottom 88%",
          leave: "top 15%",
        }),
      });
      scope.register(drawAnim);
    }
  });

  return (
    <section ref={scopeRef} data-section="trust" className="section-padding">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-14">
          {stats.map((stat) => (
            <div key={stat.label} data-trust-stat className="text-center">
              <div className="inline-flex p-4 bg-primary/10 rounded-xl text-primary mb-4">
                <stat.icon size={28} aria-hidden />
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <div data-trust-divider className="flex justify-center mb-10" aria-hidden>
          <svg width="120" height="8" viewBox="0 0 120 8" fill="none">
            <line
              data-trust-line
              x1="0"
              y1="4"
              x2="120"
              y2="4"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="text-center">
          <p
            data-reveal="heading"
            className="text-sm text-muted-foreground mb-6 uppercase tracking-wider font-medium"
          >
            Trabajamos con las mejores compañías
          </p>
          <div className="flex flex-wrap justify-center gap-3 md:gap-5">
            {insurers.map((insurer) => (
              <div
                key={insurer}
                className="px-5 py-2.5 bg-muted rounded-lg text-muted-foreground font-medium text-sm"
              >
                {insurer}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
