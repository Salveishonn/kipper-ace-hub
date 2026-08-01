import { lazy, Suspense } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Seo } from "@/components/Seo";
import { HeroSection } from "@/components/home/HeroSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { TrustSection } from "@/components/home/TrustSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { CTASection } from "@/components/home/CTASection";
import { HomeProducerSection } from "@/components/home/HomeProducerSection";
import { HomeWhatsAppSection } from "@/components/home/HomeWhatsAppSection";
import { HomeAcademySection } from "@/components/home/HomeAcademySection";
import heroPoster from "@/assets/hero-bg.jpg";

const KipperScrollStory = lazy(() =>
  import("@/components/home/KipperScrollStory").then((m) => ({ default: m.KipperScrollStory })),
);

/** Stable-height placeholder so the lazy story causes no layout shift. */
const ScrollStoryFallback = () => (
  <section
    className="relative bg-kipper-bordo-dark text-primary-foreground"
    aria-label="Experiencia Kipper Seguros"
  >
    <div className="relative h-[100svh] min-h-[520px] overflow-hidden">
      <img src={heroPoster} alt="" className="absolute inset-0 h-full w-full object-cover" aria-hidden />
      <div
        className="absolute inset-0 bg-gradient-to-t from-kipper-bordo-dark/95 via-kipper-bordo-dark/55 to-kipper-bordo-dark/40"
        aria-hidden
      />
    </div>
  </section>
);

const Index = () => {
  return (
    <MainLayout overlayNav>
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
      <Suspense fallback={<ScrollStoryFallback />}>
        <KipperScrollStory />
      </Suspense>
      <ServicesSection />
      <TrustSection />
      <HomeWhatsAppSection />
      <HomeProducerSection />
      <HomeAcademySection />
      <TestimonialsSection />
      <CTASection />
    </MainLayout>
  );
};

export default Index;
