import { MessageCircle } from "lucide-react";
import { useAnimeScope } from "@/hooks/useAnimeScope";
import { registerSectionReveal } from "@/lib/motion/sectionReveal";
import { WhatsAppButton } from "@/components/ui/KipperCta";

const items = [
  "Consultas de pólizas y coberturas",
  "Información de pagos y vencimientos",
  "Inicio de denuncias de siniestro",
  "Derivación a tu productor de confianza",
];

export function HomeWhatsAppSection() {
  const scopeRef = useAnimeScope((scope) => {
    registerSectionReveal(scope, { selector: "[data-section='home-wa']" });
  });

  return (
    <section ref={scopeRef} data-section="home-wa" className="section-padding bg-muted/40">
      <div className="container mx-auto px-4 grid md:grid-cols-2 gap-10 items-center max-w-7xl">
        <div>
          <span
            data-reveal="heading"
            className="inline-flex items-center gap-2 text-primary font-medium mb-3"
          >
            <MessageCircle size={18} aria-hidden /> Para asegurados
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Gestioná tu seguro por WhatsApp</h2>
          <p data-reveal="copy" className="text-muted-foreground mb-6 leading-relaxed">
            Pólizas, pagos, siniestros y trámites con nuestro asistente Botmaker, disponible cuando lo necesites.
          </p>
          <WhatsAppButton
            label="Abrir WhatsApp"
            message="Hola, necesito ayuda con mi seguro"
          />
        </div>
        <ul className="space-y-3 bg-card rounded-xl p-6 shadow-soft border border-border/70">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-foreground/90">
              <span className="text-primary font-semibold" aria-hidden>
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
