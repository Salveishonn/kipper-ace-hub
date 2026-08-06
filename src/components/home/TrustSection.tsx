import { animate, createDrawable, onScroll, stagger } from "animejs";
import { useAnimeScope } from "@/hooks/useAnimeScope";
import { registerSectionReveal } from "@/lib/motion/sectionReveal";
import { motion } from "@/lib/motion/tokens";
import { Users, Award, Building, Headphones, Star } from "lucide-react";
import fedpatLogo from "@/assets/fedpat-logo.png";

const stats = [
  { icon: Users, value: "15+", label: "Productores especializados" },
  { icon: Award, value: "20+", label: "Años de experiencia" },
  { icon: Building, value: "20+", label: "Compañías asociadas" },
  { icon: Headphones, value: "24hs", label: "Tiempo de respuesta" },
];

const FEATURED_INSURER = "Federación Patronal";

const otherInsurers = [
  "La Segunda",
  "Sancor",
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

    const insurersBlock = scope.root.querySelector("[data-insurers]");
    const featured = scope.root.querySelector("[data-insurer-featured]");
    const pills = scope.root.querySelectorAll("[data-insurer-pill]");
    if (!insurersBlock || !featured) return;

    const reveal = onScroll({
      target: insurersBlock,
      enter: "bottom 88%",
      onEnter: () => {
        animate(featured, {
          opacity: [0, 1],
          translateY: [14, 0],
          duration: motion.duration.reveal,
          ease: motion.easing.out,
        });
        if (pills.length) {
          animate(pills, {
            opacity: [0, 1],
            translateY: [10, 0],
            duration: motion.duration.standard,
            delay: stagger(motion.stagger.tight, { start: 140 }),
            ease: motion.easing.out,
          });
        }
      },
    });
    scope.register(reveal);
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

        <div className="text-center" data-insurers>
          <p
            data-reveal="heading"
            className="text-sm text-muted-foreground mb-6 uppercase tracking-wider font-medium"
          >
            Trabajamos con las mejores compañías
          </p>

          <div
            data-insurer-featured
            className="fedpat-featured-card mx-auto mb-5 max-w-md rounded-2xl px-6 py-6"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 text-white px-3 py-1 text-xs font-semibold mb-4">
              <Star size={12} className="fill-white text-white" aria-hidden />
              Compañía principal
            </div>
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <img
                src={fedpatLogo}
                alt=""
                aria-hidden
                className="h-14 w-14 sm:h-16 sm:w-16 object-contain rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.25)]"
              />
              <div className="text-left">
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {FEATURED_INSURER}
                </p>
                <p className="mt-1 text-sm text-white/75">
                  Nuestra principal compañía con la que trabajamos
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {otherInsurers.map((insurer) => (
              <div
                key={insurer}
                data-insurer-pill
                className="px-5 py-2.5 bg-muted rounded-lg text-muted-foreground font-medium text-sm border border-transparent"
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
