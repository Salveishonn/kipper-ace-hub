import { Link } from "react-router-dom";
import { ArrowRight, Car } from "lucide-react";

export function CTASection() {
  return (
    <section className="section-padding bg-primary text-primary-foreground">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex p-4 bg-primary-foreground/10 rounded-2xl mb-6">
          <Car size={32} />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          ¿Buscás seguro para tu vehículo?
        </h2>
        <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
          Completá el cotizador y recibí una propuesta personalizada 
          en menos de 24 horas. Sin compromiso.
        </p>
        <Link
          to="/cotizar"
          className="inline-flex items-center gap-2 bg-primary-foreground text-primary 
                     px-8 py-4 rounded-xl font-semibold transition-all duration-300 
                     hover:shadow-elevated hover:-translate-y-0.5 group"
        >
          Cotizar ahora
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
