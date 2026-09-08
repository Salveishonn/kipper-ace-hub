import { MainLayout } from "@/components/layout/MainLayout";
import { PageHero } from "@/components/layout/PageHero";
import { Users, Heart, Shield, Award } from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "Cercanía",
    description: "Conocemos a cada cliente por su nombre. No sos un número más.",
  },
  {
    icon: Shield,
    title: "Respaldo",
    description: "Te acompañamos cuando más lo necesitás, en cada siniestro y gestión.",
  },
  {
    icon: Users,
    title: "Familia",
    description: "Somos un equipo familiar que trabaja unido hace más de 20 años.",
  },
  {
    icon: Award,
    title: "Excelencia",
    description: "Buscamos siempre la mejor cobertura al precio más conveniente.",
  },
];

const HISTORY_PARAGRAPHS = [
  "Kipper Seguros nació hace más de 20 años, cuando su fundadora, Cristina Kipper, decidió transformar su experiencia y vocación por el mundo de los seguros en un proyecto propio. Así comenzó esta historia, con una pequeña oficina y una idea muy clara: hacer que los seguros fueran más simples y comprensibles para las personas.",
  "Con el paso de los años, ese proyecto fue creciendo. Lo que comenzó como una oficina fue convirtiéndose en una organización de productores, incorporando nuevos profesionales y formando un equipo especializado para poder acompañar cada vez a más familias y empresas.",
  "Durante estas dos décadas, Kipper Seguros fue construyendo su camino junto a sus clientes, acompañándolos en diferentes momentos y necesidades, y creciendo también a partir de cada experiencia. La cercanía, el asesoramiento y el trato personal fueron siempre parte de nuestra manera de trabajar.",
  "Hoy somos una organización con más de 20 años de trayectoria, que trabaja junto a las principales compañías aseguradoras del mercado argentino y cuenta con un equipo preparado para analizar cada situación y encontrar alternativas de cobertura.",
  "Pero nuestra historia no se trata solamente de cuánto crecimos, sino de cómo lo hicimos: manteniendo la idea con la que Cristina Kipper comenzó este proyecto, acercar el mundo de los seguros de una manera simple, honesta y transparente.",
];

const team = [
  { name: "Cristina Kipper", initials: "CK" },
  { name: "Maria Marin", initials: "MM" },
  { name: "Carmela Marin", initials: "CM" },
  { name: "Felipe Belloso", initials: "FB" },
  { name: "Salvador Marín", initials: "SM" },
  { name: "Juan Marín", initials: "JM" },
];

const NosotrosPage = () => {
  return (
    <MainLayout>
      <PageHero
        title="Sobre Nosotros"
        subtitle="Una historia familiar de confianza, cercanía y compromiso con cada cliente."
      />

      <section className="section-padding">
        <div className="page-wrap">
          <div className="prose-kipper mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Nuestra historia</h2>
            <div className="space-y-6">
              {HISTORY_PARAGRAPHS.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="page-wrap">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">Nuestros Valores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div key={value.title} className="bg-card p-6 rounded-xl shadow-soft border border-border/70 text-center">
                <div className="inline-flex p-4 bg-primary/10 rounded-xl text-primary mb-4">
                  <value.icon size={28} aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="page-wrap">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">Nuestro Equipo</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {team.map((member) => (
              <div key={member.name} className="text-center">
                <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center text-primary text-2xl font-bold">
                  {member.initials}
                </div>
                <h3 className="font-semibold text-foreground">{member.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground py-16">
        <div className="page-wrap">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">20+</div>
              <div className="text-sm opacity-80">Años de experiencia</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">15+</div>
              <div className="text-sm opacity-80">Productores</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">4</div>
              <div className="text-sm opacity-80">Compañías asociadas</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">5000+</div>
              <div className="text-sm opacity-80">Clientes satisfechos</div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default NosotrosPage;
