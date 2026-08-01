import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Seo } from "@/components/Seo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Check, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { siteConfig } from "@/lib/siteConfig";

export type RamoId =
  | "auto"
  | "moto"
  | "hogar"
  | "comercio"
  | "accidentes_personales"
  | "vida";

interface RamoLandingProps {
  ramo: RamoId;
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  benefits: string[];
  faqs: { q: string; a: string }[];
  whatsappMsg?: string;
}

export function RamoLandingTemplate({
  ramo,
  title,
  metaTitle,
  metaDescription,
  intro,
  benefits,
  faqs,
  whatsappMsg,
}: RamoLandingProps) {
  const waUrl = `${siteConfig.whatsappUrl}?text=${encodeURIComponent(
    whatsappMsg ?? `Hola Kipper, quiero información sobre ${title}.`
  )}`;

  return (
    <MainLayout>
      <Seo title={`${metaTitle} | Kipper Seguros`} description={metaDescription} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground py-20">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
            <p className="text-lg opacity-90 mb-6">{intro}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <a href="#cotizar">Cotizar ahora</a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white/10"
                onClick={() => trackEvent("whatsapp_click", { ramo })}
              >
                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={18} className="mr-2" aria-hidden /> WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Beneficios incluidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-3 bg-card p-4 rounded-xl shadow-soft">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="text-primary" size={18} aria-hidden />
                </div>
                <p className="text-foreground">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote CTA + FAQ */}
      <section className="py-16">
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-3xl font-bold mb-6">Preguntas frecuentes</h2>
            <Accordion type="single" collapsible className="bg-card rounded-2xl shadow-soft px-4">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <div id="cotizar" className="bg-card rounded-2xl shadow-card p-8 lg:sticky lg:top-24">
            <h2 className="text-2xl font-bold text-foreground mb-2">Cotizá {title}</h2>
            <p className="text-muted-foreground mb-6">
              Contanos qué necesitás y un asesor Kipper te prepara la cotización con las mejores
              compañías, sin compromiso.
            </p>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("whatsapp_click", { ramo, placement: "landing_cotizar" })}
              className="btn-hero w-full inline-flex items-center justify-center gap-2 mb-3"
            >
              <MessageCircle size={18} aria-hidden /> Cotizar por WhatsApp
            </a>
            <Link
              to="/cotizar"
              className="btn-hero-outline w-full inline-flex items-center justify-center gap-2"
            >
              Más formas de cotizar <ArrowRight size={16} aria-hidden />
            </Link>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Atención de lunes a viernes de 9 a 18 h · Sábados de 9 a 13 h
            </p>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}

export default RamoLandingTemplate;
