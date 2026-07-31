import { Link } from "react-router-dom";
import { ArrowRight, Shield, Clock, CheckCircle } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { siteConfig } from "@/lib/siteConfig";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden group">
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-500 group-hover:opacity-0"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-transparent" />
      </div>

      <video
        className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        poster={heroBg}
        muted
        loop
        playsInline
        preload="none"
        onMouseEnter={(e) => {
          const v = e.currentTarget;
          v.play().catch(() => undefined);
        }}
      >
        <source src="/videos/kipper-oficina.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Shield size={16} />
              +25 años protegiendo a familias argentinas
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight animate-slide-up">
            Seguros <span className="text-gradient">simples</span>,
            <br />
            atención <span className="text-gradient">real</span>,
            <br />
            gestión <span className="text-gradient">digital</span>.
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-xl animate-slide-up delay-100">
            Organización PAS con productores especializados. Cotizá, consultá por WhatsApp
            y accedé al portal exclusivo si sos productor Kipper.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 animate-slide-up delay-200">
            <Link to="/cotizar" className="btn-hero inline-flex items-center justify-center gap-2 group/btn">
              Cotizar
              <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
            </Link>
            <a
              href={siteConfig.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hero-outline inline-flex items-center justify-center gap-2"
            >
              WhatsApp
            </a>
            <Link to="/login" className="btn-hero-outline inline-flex items-center justify-center gap-2">
              Portal PAS
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap gap-6 text-sm text-muted-foreground animate-slide-up delay-300">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-primary" />
              <span>15+ Productores especializados</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-primary" />
              <span>Respuesta en 24hs</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-primary" />
              <span>Atención lunes a viernes</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
