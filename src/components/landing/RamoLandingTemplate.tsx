import { MainLayout } from "@/components/layout/MainLayout";
import { Seo } from "@/components/Seo";
import { QuoteLeadForm } from "@/components/forms/QuoteLeadForm";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import type { QuoteRamo } from "@/hooks/useQuoteRequests";

interface RamoLandingProps {
  ramo: QuoteRamo;
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  benefits: string[];
  faqs: { q: string; a: string }[];
  whatsappMsg?: string;
}

const WA_NUMBER = "5491112345678";

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
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
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
                  <MessageCircle size={18} className="mr-2" /> WhatsApp
                </a>
              </Button>
            </div>
          </div>
          <div className="hidden md:block">
            <div id="cotizar" />
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
                  <Check className="text-primary" size={18} />
                </div>
                <p className="text-foreground">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form + FAQ */}
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
          <div id="cotizar">
            <QuoteLeadForm ramo={ramo} source={`landing_${ramo}`} />
          </div>
        </div>
      </section>
    </MainLayout>
  );
}

export default RamoLandingTemplate;
