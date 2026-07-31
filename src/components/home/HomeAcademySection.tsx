import { Link } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";
import { useAnimeScope } from "@/hooks/useAnimeScope";
import { registerSectionReveal } from "@/lib/motion/sectionReveal";

export function HomeAcademySection() {
  const scopeRef = useAnimeScope((scope) => {
    registerSectionReveal(scope, { selector: "[data-section='home-academy']" });
  });

  return (
    <section ref={scopeRef} data-section="home-academy" className="section-padding bg-muted/40">
      <div className="container mx-auto px-4 text-center max-w-3xl">
        <span
          data-reveal="heading"
          className="inline-flex items-center gap-2 text-primary font-medium mb-3 justify-center"
        >
          <BookOpen size={18} aria-hidden /> Kipper Academy
        </span>
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Capacitación para productores PAS</h2>
        <p data-reveal="copy" className="text-muted-foreground mb-6">
          Cursos y guías prácticas disponibles dentro del portal para productores activos.
        </p>
        <Link to="/academy" className="btn-hero-outline inline-flex items-center gap-2">
          Conocer Academy <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
