import { BookOpen, Play, Lock, Check, Users, Award, TrendingUp } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const courses = [
  {
    id: 1,
    title: "Técnicas de Venta para Seguros",
    description: "Aprende a cerrar más ventas con técnicas probadas en el mercado argentino",
    duration: "4 horas",
    lessons: 12,
    level: "Intermedio",
    free: false,
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=225&fit=crop"
  },
  {
    id: 2,
    title: "Comunicación con el Cliente",
    description: "Desarrolla habilidades de comunicación para fidelizar clientes",
    duration: "2.5 horas",
    lessons: 8,
    level: "Básico",
    free: false,
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=225&fit=crop"
  },
  {
    id: 3,
    title: "Marketing Digital para Productores",
    description: "Usa redes sociales y WhatsApp para generar leads",
    duration: "3 horas",
    lessons: 10,
    level: "Intermedio",
    free: false,
    image: "https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=400&h=225&fit=crop"
  },
  {
    id: 4,
    title: "Introducción al Seguro de Auto",
    description: "Todo lo que necesitás saber sobre coberturas de auto",
    duration: "1.5 horas",
    lessons: 6,
    level: "Básico",
    free: true,
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=225&fit=crop"
  },
];

const benefits = [
  { icon: BookOpen, title: "Contenido Exclusivo", description: "Cursos diseñados por expertos del mercado" },
  { icon: Award, title: "Certificaciones", description: "Obtené certificados al completar cada curso" },
  { icon: TrendingUp, title: "Crecimiento Profesional", description: "Mejorá tus habilidades y aumentá tus ventas" },
  { icon: Users, title: "Comunidad", description: "Conectá con otros productores de todo el país" },
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
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Kipper Academy
            </h1>
            <p className="text-xl opacity-90 mb-8">
              Capacitación exclusiva para productores de seguros. 
              Mejorá tus técnicas de venta, aprendé sobre productos y hacé crecer tu cartera.
            </p>
            {!user ? (
              <div className="flex gap-4">
                <Link to="/login" className="bg-white text-primary px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors">
                  Ingresar
                </Link>
                <Link to="/sumate" className="border-2 border-white px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors">
                  Sumate a Kipper
                </Link>
              </div>
            ) : hasAccess ? (
              <p className="flex items-center gap-2 text-lg">
                <Check size={20} /> Tenés acceso completo a todos los cursos
              </p>
            ) : (
              <div className="bg-white/10 p-4 rounded-xl">
                <p className="mb-3">Sos cliente de Kipper. El acceso a Academy es exclusivo para productores.</p>
                <Link to="/sumate" className="inline-flex items-center gap-2 bg-white text-primary px-4 py-2 rounded-lg font-semibold hover:bg-white/90">
                  ¿Querés ser productor?
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-card p-6 rounded-xl shadow-soft text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="text-primary" size={24} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground mb-8">Cursos Disponibles</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-card rounded-xl shadow-soft overflow-hidden group">
                <div className="relative aspect-video">
                  <img 
                    src={course.image} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  {!hasAccess && !course.free && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Lock className="text-white" size={32} />
                    </div>
                  )}
                  {course.free && (
                    <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      GRATIS
                    </span>
                  )}
                  {hasAccess && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                        <Play className="text-primary ml-1" size={20} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span>{course.duration}</span>
                    <span>•</span>
                    <span>{course.lessons} lecciones</span>
                    <span>•</span>
                    <span>{course.level}</span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{course.title}</h3>
                  <p className="text-sm text-muted-foreground">{course.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!hasAccess && (
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">¿Querés acceder a todos los cursos?</h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Sumate a Kipper como productor y accedé a capacitación exclusiva, 
              herramientas de gestión y una comunidad de profesionales.
            </p>
            <Link to="/sumate" className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/90 transition-colors">
              Quiero sumarme
            </Link>
          </div>
        </section>
      )}
    </MainLayout>
  );
};

export default AcademyPage;
