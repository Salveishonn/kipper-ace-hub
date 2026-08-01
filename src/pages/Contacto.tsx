import { MainLayout } from "@/components/layout/MainLayout";
import { Seo } from "@/components/Seo";
import { Phone, Mail, MapPin, Clock, MessageCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { siteConfig } from "@/lib/siteConfig";

const ContactoPage = () => {
  const directActions = [
    {
      icon: MessageCircle,
      title: "WhatsApp",
      description: "La forma más rápida: te respondemos en minutos en horario de atención.",
      cta: "Escribinos por WhatsApp",
      href: `${siteConfig.whatsappUrl}?text=${encodeURIComponent("Hola Kipper, quiero hacer una consulta.")}`,
      external: true,
      primary: true,
    },
    {
      icon: Phone,
      title: "Teléfono",
      description: siteConfig.phoneDisplay,
      cta: "Llamar ahora",
      href: `tel:${siteConfig.whatsappNumber}`,
      external: false,
      primary: false,
    },
    {
      icon: Mail,
      title: "Email",
      description: siteConfig.contactEmail,
      cta: "Enviar un email",
      href: `mailto:${siteConfig.contactEmail}`,
      external: false,
      primary: false,
    },
  ];

  return (
    <MainLayout>
      <Seo
        title="Contacto | Kipper Seguros"
        description="Contactanos por WhatsApp, teléfono o email. Te respondemos en menos de 24 horas."
      />
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Contacto</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Estamos para ayudarte. Elegí el canal que prefieras y te respondemos en menos de 24 horas.
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="max-w-5xl mx-auto">
          {/* Direct actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {directActions.map((a) => (
              <div
                key={a.title}
                className={`bg-card rounded-2xl p-6 border shadow-soft flex flex-col ${
                  a.primary ? "border-primary/40" : "border-border/70"
                }`}
              >
                <div className="p-3 bg-primary/10 rounded-xl text-primary w-fit mb-4">
                  <a.icon size={24} aria-hidden />
                </div>
                <h2 className="font-semibold text-foreground text-lg mb-1">{a.title}</h2>
                <p className="text-sm text-muted-foreground mb-5 flex-1">{a.description}</p>
                <a
                  href={a.href}
                  {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={
                    a.primary
                      ? "btn-hero inline-flex items-center justify-center gap-2 text-sm"
                      : "btn-hero-outline inline-flex items-center justify-center gap-2 text-sm"
                  }
                >
                  {a.cta} <ArrowRight size={14} aria-hidden />
                </a>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <MapPin size={24} aria-hidden />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Dirección</h3>
                <p className="text-muted-foreground">Buenos Aires, Argentina</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Clock size={24} aria-hidden />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Horario de atención</h3>
                <p className="text-muted-foreground">Lunes a viernes: 9:00 – 18:00</p>
                <p className="text-muted-foreground">Sábados: 9:00 – 13:00</p>
              </div>
            </div>
          </div>

          <p className="text-center mt-14 text-sm text-muted-foreground">
            ¿Querés cotizar un seguro?{" "}
            <Link to="/cotizar" className="text-primary font-medium hover:underline">
              Ir a cotizar
            </Link>
          </p>
        </div>
      </section>
    </MainLayout>
  );
};

export default ContactoPage;
