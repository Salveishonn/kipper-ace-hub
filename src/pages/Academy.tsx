import { BookOpen, Play, Lock, Check, Users, Award, TrendingUp, ArrowRight } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

const pricingPlans = [
  { name: "Gratuito", price: "Gratis", description: "Para productores de Kipper", features: ["Acceso a todos los cursos", "Certificaciones", "Comunidad exclusiva", "Material descargable"], cta: "Ya tengo acceso", ctaLink: "/login", highlighted: false },
  { name: "Profesional", price: "Próximamente", description: "Para productores externos (PAS)", features: ["Cursos de venta", "Técnicas comerciales", "Material de marketing", "Soporte personalizado"], cta: "Contactanos", ctaLink: "/contacto", highlighted: true },
];

const AcademyPage = () => {
  const { isProductor, isAdmin, user } = useAuth();
  const hasAccess = isProductor || isAdmin;

  return (
    <MainLayout>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <BookOpen size={16} /> Formación Profesional
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Kipper Academy</h1>
            <p className="text-xl opacity-90 mb-8">
              Capacitación exclusiva para productores de seguros.
              Mejorá tus técnicas de venta, aprendé sobre productos y hacé crecer tu cartera.
            </p>
            {!user ? (
              <div className="flex gap-4 flex-wrap">
                <Link to="/login" className="bg-white text-primary px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors">Ingresar</Link>
                <Link to="/sumate" className="border-2 border-white px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors">Sumate a Kipper</Link>
              </div>
            ) : hasAccess ? (
              <Link to="/academy/contenido" className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors">
                <Check size={20} /> Ir a los cursos <ArrowRight size={16} />
              </Link>
            ) : (
              <div className="bg-white/10 p-4 rounded-xl">
                <p className="mb-3">Sos cliente de Kipper. El acceso a Academy es exclusivo para productores.</p>
                <Link to="/sumate" className="inline-flex items-center gap-2 bg-white text-primary px-4 py-2 rounded-lg font-semibold hover:bg-white/90">¿Querés ser productor?</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: BookOpen, title: "Contenido Exclusivo", description: "Cursos diseñados por expertos del mercado" },
              { icon: Award, title: "Certificaciones", description: "Obtené certificados al completar cada curso" },
              { icon: TrendingUp, title: "Crecimiento Profesional", description: "Mejorá tus habilidades y aumentá tus ventas" },
              { icon: Users, title: "Comunidad", description: "Conectá con otros productores de todo el país" },
            ].map((b, i) => (
              <div key={i} className="bg-card p-6 rounded-xl shadow-soft text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <b.icon className="text-primary" size={24} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Paywall / Pricing */}
      {!hasAccess && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-foreground text-center mb-4">Planes de Acceso</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Elegí el plan que mejor se adapte a tu situación
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {pricingPlans.map((plan, i) => (
                <div key={i} className={`rounded-2xl p-8 ${plan.highlighted ? "bg-primary text-primary-foreground shadow-elevated" : "bg-card shadow-soft border border-border"}`}>
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className={`text-sm mb-4 ${plan.highlighted ? "opacity-80" : "text-muted-foreground"}`}>{plan.description}</p>
                  <p className="text-3xl font-bold mb-6">{plan.price}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <Check size={16} className={plan.highlighted ? "opacity-80" : "text-primary"} /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={plan.ctaLink} className={`block text-center py-3 rounded-xl font-semibold transition-colors ${plan.highlighted ? "bg-white text-primary hover:bg-white/90" : "btn-hero-outline"}`}>
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </MainLayout>
  );
};

export default AcademyPage;
