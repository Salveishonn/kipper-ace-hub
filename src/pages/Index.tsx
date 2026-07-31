import { MainLayout } from "@/components/layout/MainLayout";
import { Seo } from "@/components/Seo";
import { HeroSection } from "@/components/home/HeroSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { TrustSection } from "@/components/home/TrustSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { CTASection } from "@/components/home/CTASection";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Briefcase, ShieldCheck } from "lucide-react";

const Index = () => {
  return (
    <MainLayout>
      <Seo
        title="Kipper Seguros | Seguros simples, atención real y gestión digital"
        description="Organización familiar de productores especializados. Cotizá tu seguro, gestioná pólizas y resolvé siniestros con Kipper."
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

      {/* Asegurados */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-primary font-medium mb-3">
              <ShieldCheck size={18} /> Para asegurados
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Todo tu seguro en un solo lugar</h2>
            <p className="text-muted-foreground mb-6">
              Pólizas, cuotas, comprobantes y siniestros disponibles 24/7 desde tu portal personal.
              Subí tu comprobante de pago y resolvé trámites sin llamados.
            </p>
            <Link to="/portal" className="btn-hero inline-flex items-center gap-2">
              Ingresar a mi portal <ArrowRight size={16} />
            </Link>
          </div>
          <ul className="space-y-3 bg-card rounded-2xl p-6 shadow-soft">
            <li>✓ Descarga de pólizas y comprobantes</li>
            <li>✓ Aviso de pago con foto del comprobante</li>
            <li>✓ Reporte y seguimiento de siniestros</li>
            <li>✓ Solicitud de nuevas pólizas en 1 clic</li>
          </ul>
        </div>
      </section>

      {/* Productores */}
      <section className="py-16">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <ul className="order-2 md:order-1 space-y-3 bg-card rounded-2xl p-6 shadow-soft">
            <li>✓ CRM de leads y cartera</li>
            <li>✓ Materiales de marketing brandeados</li>
            <li>✓ Acompañamiento comercial y operativo</li>
            <li>✓ Comunidad de productores y mentorías</li>
          </ul>
          <div className="order-1 md:order-2">
            <span className="inline-flex items-center gap-2 text-primary font-medium mb-3">
              <Briefcase size={18} /> Para productores
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Sumate a una organización que te acompaña</h2>
            <p className="text-muted-foreground mb-6">
              Herramientas, capacitación y una red de productores que crece con vos.
            </p>
            <Link to="/sumate" className="btn-hero inline-flex items-center gap-2">
              Quiero sumarme <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Academy */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <span className="inline-flex items-center gap-2 text-primary font-medium mb-3 justify-center">
            <BookOpen size={18} /> Kipper Academy
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Capacitación, herramientas y contenido para productores
          </h2>
          <p className="text-muted-foreground mb-6">
            Cursos, recursos descargables y guías prácticas para vender mejor y gestionar tu cartera.
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
