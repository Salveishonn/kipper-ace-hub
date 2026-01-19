import { MainLayout } from "@/components/layout/MainLayout";
import { Link } from "react-router-dom";
import { Calendar, ArrowRight, Tag, Search } from "lucide-react";

// Mock blog posts
const posts = [
  {
    id: 1,
    title: "¿Cuándo comienza la cobertura de una póliza?",
    excerpt: "Conocé el día y el horario exacto de inicio y finalización de tu cobertura.",
    category: "Tips",
    date: "15 Ene 2025",
    slug: "cuando-comienza-cobertura-poliza",
    image: "🛡️",
  },
  {
    id: 2,
    title: "Cómo conducir con niebla: tips de seguridad",
    excerpt: "Algunos consejos para manejar con seguridad en bancos de niebla.",
    category: "KipperTips",
    date: "12 Ene 2025",
    slug: "conducir-con-niebla",
    image: "🌫️",
  },
  {
    id: 3,
    title: "Mitos sobre el seguro de auto",
    excerpt: "¿Los autos viejos no se pueden asegurar? Desmintiendo creencias populares.",
    category: "Mitos",
    date: "10 Ene 2025",
    slug: "mitos-seguro-auto",
    image: "🚗",
  },
  {
    id: 4,
    title: "Disfrutá tu casa: del seguro nos encargamos nosotros",
    excerpt: "Cómo proteger tu hogar de los imprevistos más comunes.",
    category: "Hogar",
    date: "8 Ene 2025",
    slug: "disfruta-tu-casa",
    image: "🏠",
  },
  {
    id: 5,
    title: "Qué hacer si no pagaste el seguro este mes",
    excerpt: "Opciones y consejos si te atrasaste con el pago de tu póliza.",
    category: "Tips",
    date: "5 Ene 2025",
    slug: "no-pague-seguro",
    image: "💳",
  },
  {
    id: 6,
    title: "Mantenimiento del auto: la calefacción",
    excerpt: "Ocupate de arreglar la calefacción, del seguro nos encargamos nosotros.",
    category: "Auto",
    date: "3 Ene 2025",
    slug: "calefaccion-auto",
    image: "🔧",
  },
];

const categories = ["Todos", "Tips", "KipperTips", "Mitos", "Hogar", "Auto"];

const ComunidadPage = () => {
  return (
    <MainLayout>
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Comunidad Kipper</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Tips, novedades y todo lo que necesitás saber sobre seguros.
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="max-w-7xl mx-auto">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar artículos..."
                className="input-kipper pl-12"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    cat === "Todos"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Posts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-card rounded-2xl shadow-soft overflow-hidden group hover:shadow-card transition-shadow"
              >
                <div className="h-48 bg-muted flex items-center justify-center text-6xl">
                  {post.image}
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                      <Tag size={12} />
                      {post.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar size={12} />
                      {post.date}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {post.excerpt}
                  </p>
                  <Link
                    to={`/comunidad/${post.slug}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Leer más <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <button className="btn-hero-outline">
              Cargar más artículos
            </button>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-muted/50 section-padding">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Suscribite a nuestras novedades
          </h2>
          <p className="text-muted-foreground mb-6">
            Recibí tips, promociones y contenido exclusivo en tu email.
          </p>
          <form className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="tu@email.com"
              className="input-kipper flex-1"
            />
            <button type="submit" className="btn-hero">
              Suscribirme
            </button>
          </form>
        </div>
      </section>
    </MainLayout>
  );
};

export default ComunidadPage;
