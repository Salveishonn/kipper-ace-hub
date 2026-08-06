import { useEffect, useRef } from "react";
import { Shield, CheckCircle, Clock } from "lucide-react";
import { createTimeline, stagger } from "animejs";
import { CotizarButton, WhatsAppButton, PortalPasLink } from "@/components/ui/KipperCta";
import { motion } from "@/lib/motion/tokens";

export function HeroSection() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      root.querySelectorAll("[data-hero-part]").forEach((el) => {
        (el as HTMLElement).style.opacity = "1";
        (el as HTMLElement).style.transform = "none";
      });
      return;
    }

    const parts = root.querySelectorAll("[data-hero-part]");
    const lines = root.querySelectorAll("[data-hero-line]");
    const media = root.querySelector("[data-hero-media]");

    const tl = createTimeline({ defaults: { ease: motion.easing.out } });

    tl.add(parts[0], {
      opacity: [0, 1],
      translateY: [motion.distance.subtle, 0],
      duration: motion.duration.standard,
    })
      .add(
        lines,
        {
          opacity: [0, 1],
          translateY: [motion.distance.reveal, 0],
          duration: motion.duration.reveal,
          delay: stagger(motion.stagger.standard),
        },
        "-=280",
      )
      .add(
        parts[1],
        {
          opacity: [0, 1],
          translateY: [motion.distance.subtle, 0],
          duration: motion.duration.standard,
        },
        "-=400",
      )
      .add(
        parts[2],
        {
          opacity: [0, 1],
          translateY: [motion.distance.subtle, 0],
          duration: motion.duration.standard,
        },
        "-=320",
      )
      .add(
        parts[3],
        {
          opacity: [0, 1],
          translateY: [12, 0],
          duration: motion.duration.standard,
        },
        "-=240",
      );

    if (media) {
      tl.add(
        media,
        {
          scale: [1.03, 1],
          opacity: [0.85, 1],
          duration: motion.duration.cinematic,
        },
        0,
      );
    }

    return () => tl.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative overflow-hidden border-b border-border/60 bg-kipper-cream"
    >
      <div
        data-hero-media
        className="absolute inset-0 opacity-40 pointer-events-none"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.12),transparent_55%)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 lg:pt-14 lg:pb-16">
        <div className="max-w-2xl">
          <div data-hero-part style={{ opacity: 0 }}>
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Shield size={16} aria-hidden />
              +20 años protegiendo a familias argentinas
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-foreground leading-[1.08] tracking-tight">
            <span data-hero-line className="block" style={{ opacity: 0 }}>
              Seguros <span className="text-gradient">simples</span>,
            </span>
            <span data-hero-line className="block" style={{ opacity: 0 }}>
              atención <span className="text-gradient">real</span>,
            </span>
            <span data-hero-line className="block" style={{ opacity: 0 }}>
              gestión <span className="text-gradient">digital</span>.
            </span>
          </h1>

          <p
            data-hero-part
            className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed"
            style={{ opacity: 0 }}
          >
            Organización PAS con productores especializados. Cotizá, consultá por WhatsApp
            o accedé al portal si sos productor Kipper.
          </p>

          <div
            data-hero-part
            className="mt-9 flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center"
            style={{ opacity: 0 }}
          >
            <CotizarButton label="Cotizá tu seguro" size="lg" />
            <WhatsAppButton label="WhatsApp" />
            <PortalPasLink className="sm:ml-1" showSecondary={false} />
          </div>

          <div
            data-hero-part
            className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground"
            style={{ opacity: 0 }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-primary shrink-0" aria-hidden />
              <span>15+ Productores especializados</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-primary shrink-0" aria-hidden />
              <span>Respuesta en 24hs</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-primary shrink-0" aria-hidden />
              <span>Atención lunes a viernes</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
