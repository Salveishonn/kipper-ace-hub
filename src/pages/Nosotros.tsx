import { MainLayout } from "@/components/layout/MainLayout";
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

const team = [
  { name: "Cristina Kipper", initials: "CK" },
  { name: "Maria Marin", initials: "MM" },
  { name: "Carmela Marin", initials: "CM" },
  { name: "Felipe Belloso", initials: "FB" },
];

const NosotrosPage = () => {
  return (
    <MainLayout>
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Sobre Nosotros</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Una historia familiar de confianza, cercanía y compromiso con cada cliente.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="section-padding">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none text-center">
            <h2 className="text-3xl font-bold text-foreground mb-6">Nuestra Historia</h2>
            <p className="text-muted-foreground mb-6">
              Kipper Seguros nació hace más de 20 años de la mano de su fundadora, Cristina Kipper:
              acercar el mundo de los seguros a las personas de manera simple, honesta y transparente.
              Lo que comenzó como una pequeña oficina, hoy es una organización de productores
              con un equipo especializado.
            </p>
            <p className="text-muted-foreground mb-6">
              A lo largo de estos más de 20 años, hemos acompañado a miles de familias y
              empresas argentinas, asesorándolos para encontrar la protección que realmente
              necesitan. Creemos que un buen seguro es aquel que se adapta a vos, no al revés.
            </p>
            <p className="text-muted-foreground">
              Trabajamos con las principales compañías aseguradoras del mercado argentino,
              lo que nos permite comparar y ofrecerte siempre la mejor opción. Pero más allá
              de los números, lo que nos diferencia es el trato personal: conocemos a cada
              cliente por su nombre y estamos cuando más nos necesitan.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Nuestros Valores
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div key={value.title} className="bg-card p-6 rounded-2xl shadow-soft text-center">
                <div className="inline-flex p-4 bg-primary/10 rounded-2xl text-primary mb-4">
                  <value.icon size={28} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section-padding">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Nuestro Equipo
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Stats */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4">
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
              <div className="text-4xl font-bold mb-2">20+</div>
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
