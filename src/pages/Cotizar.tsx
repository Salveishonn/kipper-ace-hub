import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHero } from "@/components/layout/PageHero";
import { Seo } from "@/components/Seo";
import { MessageCircle, Phone, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/lib/siteConfig";
import { buildWhatsAppUrl, whatsappCtaClickHandler } from "@/lib/whatsappCta";
import { FedpatWidgetFrame } from "@/components/cotizar/FedpatWidgetFrame";

const CotizarPage = () => {
  const waMessage = "Hola Kipper, quiero cotizar mi seguro";
  const waUrl = buildWhatsAppUrl(waMessage);

  return (
    <MainLayout>
      <Seo
        title="Cotizar | Kipper Seguros"
        description="Cotizá tu seguro con Kipper usando el cotizador online de Federación Patronal o escribinos por WhatsApp."
      />
      <PageHero
        title="Cotizá tu seguro"
        subtitle="Te asesoramos en minutos y comparamos opciones de las compañías con las que trabajamos."
      />
      <section className="section-padding">
        <div className="page-wrap max-w-4xl">
          <div
            id="fedpat-cotizador"
            className="rounded-xl border border-border bg-card p-4 sm:p-8 mb-10"
            aria-label="Cotizador online de Federación Patronal"
          >
            <div className="flex items-center justify-center gap-3 mb-3 text-foreground">
              <ShieldCheck size={26} className="text-primary" aria-hidden />
              <h2 className="text-xl font-semibold">Cotizador online de Federación Patronal</h2>
            </div>
            <p className="text-muted-foreground text-center mb-6">
              Completá los datos para obtener tu cotización online.
            </p>
            <FedpatWidgetFrame />
          </div>

          <div className="text-center">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => whatsappCtaClickHandler(e, { message: waMessage })}
              className="quote-primary inline-flex items-center justify-center gap-2 text-lg"
            >
              <MessageCircle size={20} aria-hidden /> Cotizar por WhatsApp
            </a>
            <p className="text-sm text-muted-foreground mt-3">
              Respondemos en el horario de atención, de lunes a viernes de 9 a 18 h.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-12 max-w-2xl mx-auto">
            <a
              href={`tel:${siteConfig.whatsappNumber}`}
              className="bg-card rounded-xl border border-border/70 p-5 flex items-center gap-4 hover:border-primary/30 transition-colors"
            >
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Phone size={20} aria-hidden />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Llamanos</p>
                <p className="text-sm text-muted-foreground">{siteConfig.phoneDisplay}</p>
              </div>
            </a>
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="bg-card rounded-xl border border-border/70 p-5 flex items-center gap-4 hover:border-primary/30 transition-colors"
            >
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Mail size={20} aria-hidden />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Escribinos por email</p>
                <p className="text-sm text-muted-foreground">{siteConfig.contactEmail}</p>
              </div>
            </a>
          </div>

          <p className="text-center mt-10 text-sm text-muted-foreground">
            ¿Preferís que te contactemos nosotros?{" "}
            <Link to="/contacto" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
              Ver datos de contacto <ArrowRight size={14} aria-hidden />
            </Link>
          </p>
        </div>
      </section>
    </MainLayout>
  );
};

export default CotizarPage;
