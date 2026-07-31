import { MainLayout } from "@/components/layout/MainLayout";
import { Seo } from "@/components/Seo";
import { HeroSection } from "@/components/home/HeroSection";
import { KipperScrollStory } from "@/components/home/KipperScrollStory";
import { ServicesSection } from "@/components/home/ServicesSection";
import { TrustSection } from "@/components/home/TrustSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { CTASection } from "@/components/home/CTASection";
import { HomeProducerSection } from "@/components/home/HomeProducerSection";
import { HomeWhatsAppSection } from "@/components/home/HomeWhatsAppSection";
import { HomeAcademySection } from "@/components/home/HomeAcademySection";

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
      <KipperScrollStory />
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
