import { Briefcase } from "lucide-react";
import { animate, onScroll } from "animejs";
import { useAnimeScope } from "@/hooks/useAnimeScope";
import { motion } from "@/lib/motion/tokens";
import { PortalPasLink, SumatePasLink } from "@/components/ui/KipperCta";

const items = [
  "Recursos semanales y material de producción",
  "Kipper Academy y capacitación",
  "Consultas y casos con el equipo central",
  "Comunidad de productores PAS",
];

export function HomeProducerSection() {
  const scopeRef = useAnimeScope((scope) => {
    if (scope.matches.reducedMotion) return;

    const section = scope.root.querySelector("[data-section='home-producer']");
    if (!section) return;

    const list = section.querySelector("[data-producer-list]");
    const copy = section.querySelector("[data-producer-copy]");

    const run = () => {
      if (list) {
        animate(list, {
          opacity: [0, 1],
          translateX: [-motion.distance.reveal, 0],
          duration: motion.duration.reveal,
          ease: motion.easing.out,
        });
      }
      if (copy) {
        animate(copy, {
          opacity: [0, 1],
          translateX: [motion.distance.reveal, 0],
          duration: motion.duration.reveal,
          delay: 80,
          ease: motion.easing.out,
        });
      }
    };

    animate([list, copy].filter(Boolean), { opacity: 0 });

    const observer = onScroll({
      target: section,
      enter: "bottom 85%",
      onEnter: () => run(),
    });
    scope.register(observer);
  });

  return (
    <section ref={scopeRef} data-section="home-producer" className="section-padding">
      <div className="container mx-auto px-4 grid md:grid-cols-2 gap-10 items-center max-w-7xl">
        <ul
          data-producer-list
          className="order-2 md:order-1 space-y-3 bg-card rounded-xl p-6 shadow-soft border border-border/70"
        >
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-primary font-semibold" aria-hidden>
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div data-producer-copy className="order-1 md:order-2">
          <span className="inline-flex items-center gap-2 text-primary font-medium mb-3">
            <Briefcase size={18} aria-hidden /> Para productores PAS
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Intranet exclusiva para nuestra red</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Acceso por invitación tras aprobar tu solicitud. Herramientas pensadas para productores bajo Kipper.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <SumatePasLink />
            <PortalPasLink />
          </div>
        </div>
      </div>
    </section>
  );
}
