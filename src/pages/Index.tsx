import { MainLayout } from "@/components/layout/MainLayout";
import { Seo } from "@/components/Seo";
import { HeroSection } from "@/components/home/HeroSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { TrustSection } from "@/components/home/TrustSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { CTASection } from "@/components/home/CTASection";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Briefcase, MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/siteConfig";

const Index = () => {
  return (
    <MainLayout>
      <Seo
        title="Kipper Seguros | Seguros simples, atención real y gestión digital"
        description="Organización PAS de productores especializados. Cotizá, escribinos por WhatsApp o sumate como productor."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "InsuranceAgency",
          name: "Kipper Seguros",
          url: "https://kipperseguros.com",
          areaServed: "AR",
        }}
      />
      <HeroSection />
      <ServicesSection />
      <TrustSection />

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-primary font-medium mb-3">
              <MessageCircle size={18} /> Para asegurados
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Gestioná tu seguro por WhatsApp</h2>
            <p className="text-muted-foreground mb-6">
              Pólizas, pagos, siniestros y trámites con nuestro asistente Botmaker, disponible cuando lo necesites.
            </p>
            <a
              href={`${siteConfig.whatsappUrl}?text=Hola%2C%20necesito%20ayuda%20con%20mi%20seguro`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hero inline-flex items-center gap-2"
            >
              Abrir WhatsApp <ArrowRight size={16} />
            </a>
          </div>
          <ul className="space-y-3 bg-card rounded-2xl p-6 shadow-soft">
            <li>✓ Consultas de pólizas y coberturas</li>
            <li>✓ Información de pagos y vencimientos</li>
            <li>✓ Inicio de denuncias de siniestro</li>
            <li>✓ Derivación a tu productor de confianza</li>
          </ul>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <ul className="order-2 md:order-1 space-y-3 bg-card rounded-2xl p-6 shadow-soft">
            <li>✓ Recursos semanales y material de producción</li>
            <li>✓ Kipper Academy y capacitación</li>
            <li>✓ Consultas y casos con el equipo central</li>
            <li>✓ Comunidad de productores PAS</li>
          </ul>
          <div className="order-1 md:order-2">
            <span className="inline-flex items-center gap-2 text-primary font-medium mb-3">
              <Briefcase size={18} /> Para productores PAS
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Intranet exclusiva para nuestra red</h2>
            <p className="text-muted-foreground mb-6">
              Acceso por invitación tras aprobar tu solicitud. Herramientas pensadas para productores bajo Kipper.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/sumate" className="btn-hero inline-flex items-center gap-2">
                Quiero sumarme <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn-hero-outline inline-flex items-center gap-2">
                Portal PAS
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <span className="inline-flex items-center gap-2 text-primary font-medium mb-3 justify-center">
            <BookOpen size={18} /> Kipper Academy
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Capacitación para productores PAS
          </h2>
          <p className="text-muted-foreground mb-6">
            Cursos y guías prácticas disponibles dentro del portal para productores activos.
          </p>
          <Link to="/academy" className="btn-hero inline-flex items-center gap-2">
            Conocer Academy <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <TestimonialsSection />
      <CTASection />
    </MainLayout>
  );
};

export default Index;
