import { lazy, Suspense } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Seo } from "@/components/Seo";
import { ServicesSection } from "@/components/home/ServicesSection";
import { TrustSection } from "@/components/home/TrustSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { CTASection } from "@/components/home/CTASection";
import { HomeProducerSection } from "@/components/home/HomeProducerSection";
import { HomeWhatsAppSection } from "@/components/home/HomeWhatsAppSection";
import { HomeAcademySection } from "@/components/home/HomeAcademySection";

const KipperScrollStory = lazy(() =>
  import("@/components/home/KipperScrollStory").then((m) => ({ default: m.KipperScrollStory })),
);

const ScrollStoryFallback = () => (
  <section className="relative bg-kipper-bordo-dark text-primary-foreground" aria-label="Experiencia Kipper Seguros">
    <div className="relative h-[calc(100svh-4.25rem)] min-h-[480px] overflow-hidden sm:h-[calc(100svh-4.75rem)]">
      <img
        src="/videos/kipper-oficina-poster.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-t from-kipper-bordo-dark/80 via-kipper-bordo-dark/25 to-kipper-bordo-dark/35" aria-hidden />
    </div>
  </section>
);

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
          telephone: "+5491151615276",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Colectora Este Ramal Escobar 959",
            addressLocality: "Ingeniero Maschwitz",
            postalCode: "1623",
            addressRegion: "Buenos Aires",
            addressCountry: "AR",
          },
        }}
      />
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
