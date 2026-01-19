import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "María González",
    role: "Cliente desde 2018",
    content: "Excelente atención. Cuando tuve un siniestro me acompañaron en todo el proceso. Muy recomendable.",
    rating: 5,
  },
  {
    name: "Carlos Rodríguez",
    role: "Cliente desde 2020",
    content: "El portal es super práctico. Puedo ver mis pólizas, pagar las cuotas y todo desde el celular.",
    rating: 5,
  },
  {
    name: "Laura Martínez",
    role: "Cliente desde 2015",
    content: "Hace años que trabajo con Kipper. Siempre responden rápido y consiguen las mejores coberturas.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="section-padding bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Lo que dicen nuestros clientes
          </h2>
          <p className="text-lg text-muted-foreground">
            La confianza de nuestros asegurados nos impulsa cada día
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="bg-card p-6 rounded-2xl shadow-soft relative"
            >
              <Quote className="absolute top-6 right-6 text-primary/10" size={40} />
              
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={16} className="fill-primary text-primary" />
                ))}
              </div>
              
              <p className="text-foreground mb-6 relative z-10">
                "{testimonial.content}"
              </p>
              
              <div>
                <p className="font-semibold text-foreground">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
