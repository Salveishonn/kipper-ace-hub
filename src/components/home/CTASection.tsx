import { createTimeline, onScroll } from "animejs";
import { useAnimeScope } from "@/hooks/useAnimeScope";
import { CotizarButton, WhatsAppButton } from "@/components/ui/KipperCta";
import { motion } from "@/lib/motion/tokens";
import { Car } from "lucide-react";

export function CTASection() {
  const scopeRef = useAnimeScope((scope) => {
    if (scope.matches.reducedMotion) return;

    const section = scope.root.querySelector("[data-section='final-cta']");
    if (!section) return;

    const run = () => {
      const icon = section.querySelector("[data-cta-icon]");
      const heading = section.querySelector("[data-cta-heading]");
      const copy = section.querySelector("[data-cta-copy]");
      const actions = section.querySelector("[data-cta-actions]");

      createTimeline({ defaults: { ease: motion.easing.out } })
        .add(icon, { opacity: [0, 1], scale: [0.92, 1], duration: motion.duration.standard })
        .add(heading, { opacity: [0, 1], translateY: [motion.distance.reveal, 0], duration: motion.duration.reveal }, "-=200")
        .add(copy, { opacity: [0, 1], translateY: [motion.distance.subtle, 0], duration: motion.duration.standard }, "-=360")
        .add(actions, { opacity: [0, 1], translateY: [12, 0], duration: motion.duration.standard }, "-=280");
    };

    const observer = onScroll({
      target: section,
      enter: "bottom 85%",
      onEnter: () => run(),
    });
    scope.register(observer);
  });

  return (
    <section
      ref={scopeRef}
      data-section="final-cta"
      className="section-padding bg-primary text-primary-foreground"
    >
      <div className="max-w-4xl mx-auto text-center">
        <div
          data-cta-icon
          className="inline-flex p-4 bg-primary-foreground/10 rounded-xl mb-6"
          style={{ opacity: 0 }}
        >
          <Car size={32} aria-hidden />
        </div>
        <h2
          data-cta-heading
          className="text-3xl sm:text-4xl font-bold mb-4"
          style={{ opacity: 0 }}
        >
          ¿Listo para cotizar tu cobertura?
        </h2>
        <p data-cta-copy className="text-lg opacity-90 mb-8 max-w-2xl mx-auto" style={{ opacity: 0 }}>
          Elegí Cotizar para empezar online o escribinos por WhatsApp. Te respondemos con claridad.
        </p>
        <div
          data-cta-actions
          className="flex flex-col sm:flex-row gap-3 justify-center items-center"
          style={{ opacity: 0 }}
        >
          <CotizarButton
            label="Cotizá tu seguro"
            className="bg-primary-foreground text-primary border-[hsl(var(--kipper-gold)/0.55)] hover:bg-primary-foreground/95"
          />
          <WhatsAppButton className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10" />
        </div>
      </div>
    </section>
  );
}
