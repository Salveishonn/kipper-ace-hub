import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Seo } from "@/components/Seo";
import { Clock, MessageCircle, ArrowRight } from "lucide-react";
import { siteConfig } from "@/lib/siteConfig";

const CotizarPage = () => {
  return (
    <MainLayout>
      <Seo
        title="Cotizar | Kipper Seguros"
        description="Próximamente cotizador online con Federación Patronal."
      />
      <section className="section-padding">
        <div className="max-w-2xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Clock size={16} /> Próximamente
          </span>
          <h1 className="text-4xl font-bold mb-4">Cotizador online</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Estamos integrando el cotizador oficial de Federación Patronal en esta sección.
            Mientras tanto, contactanos por WhatsApp o el formulario de contacto.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`${siteConfig.whatsappUrl}?text=Hola%2C%20quiero%20cotizar%20mi%20seguro`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hero inline-flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} /> Cotizar por WhatsApp
            </a>
            <Link to="/contacto" className="btn-hero-outline inline-flex items-center justify-center gap-2">
              Contacto <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default CotizarPage;
