import { Link } from "react-router-dom";
import { ArrowRight, Shield, Clock, CheckCircle } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Shield size={16} />
              +25 años protegiendo a familias argentinas
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight animate-slide-up">
            Tu seguro, <span className="text-gradient">simple</span>.
            <br />
            Tu info, <span className="text-gradient">ordenada</span>.
            <br />
            Tus pagos, <span className="text-gradient">al día</span>.
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-xl animate-slide-up delay-100">
            Gestioná todas tus pólizas desde un solo lugar. Pagá tus cuotas, 
            descargá comprobantes y reportá siniestros sin vueltas.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-slide-up delay-200">
            <Link to="/portal" className="btn-hero inline-flex items-center justify-center gap-2 group">
              Ingresar al Portal
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/cotizar" className="btn-hero-outline inline-flex items-center justify-center gap-2">
              Cotizar mi vehículo
            </Link>
          </div>

          {/* Trust indicators */}
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
