import { Users, Award, Building, Headphones } from "lucide-react";

const stats = [
  { icon: Users, value: "15+", label: "Productores especializados" },
  { icon: Award, value: "25+", label: "Años de experiencia" },
  { icon: Building, value: "20+", label: "Compañías asociadas" },
  { icon: Headphones, value: "24hs", label: "Tiempo de respuesta" },
];

const insurers = [
  "La Segunda", "Sancor", "Federación Patronal", "Rivadavia", 
  "San Cristóbal", "Zurich", "Mapfre", "Allianz"
];

export function TrustSection() {
  return (
    <section className="section-padding">
      <div className="max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="inline-flex p-4 bg-primary/10 rounded-2xl text-primary mb-4">
                <stat.icon size={28} />
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Insurers */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-6 uppercase tracking-wider font-medium">
            Trabajamos con las mejores compañías
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            {insurers.map((insurer) => (
              <div
                key={insurer}
                className="px-6 py-3 bg-muted rounded-xl text-muted-foreground font-medium 
                           hover:bg-primary/10 hover:text-primary transition-colors cursor-default"
              >
                {insurer}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
