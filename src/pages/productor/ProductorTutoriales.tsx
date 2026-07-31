import { Video, Play, Clock, BookOpen } from "lucide-react";

const tutorials = [
  {
    id: 1,
    title: "Cómo cargar una nueva póliza",
    description: "Paso a paso para emitir pólizas en el sistema",
    duration: "5:30",
    category: "Producción",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=225&fit=crop",
    videoUrl: "#"
  },
  {
    id: 2,
    title: "Gestión de siniestros",
    description: "Cómo reportar y dar seguimiento a siniestros",
    duration: "8:15",
    category: "Siniestros",
    thumbnail: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=225&fit=crop",
    videoUrl: "#"
  },
  {
    id: 3,
    title: "Control de cobranzas y pagos",
    description: "Seguimiento de cuotas pendientes y pagadas",
    duration: "6:45",
    category: "Caja",
    thumbnail: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=225&fit=crop",
    videoUrl: "#"
  },
  {
    id: 4,
    title: "Uso del cotizador web",
    description: "Cómo funcionan los leads del cotizador",
    duration: "4:20",
    category: "Producción",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop",
    videoUrl: "#"
  },
  {
    id: 5,
    title: "Carga de documentación",
    description: "Subir pólizas, certificados y documentos",
    duration: "3:50",
    category: "Operativo",
    thumbnail: "https://images.unsplash.com/photo-1568234928966-359c35dd8327?w=400&h=225&fit=crop",
    videoUrl: "#"
  },
  {
    id: 6,
    title: "Reportes y estadísticas",
    description: "Cómo interpretar tus métricas de producción",
    duration: "7:00",
    category: "Producción",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=225&fit=crop",
    videoUrl: "#"
  },
];

const ProductorTutoriales = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Videos Instructivos</h1>
          <p className="text-muted-foreground">Aprendé a usar el sistema paso a paso</p>
        </div>
        <a 
          href="/academy" 
          className="btn-hero-outline flex items-center gap-2"
        >
          <BookOpen size={18} /> Ir a Kipper Academy
        </a>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tutorials.map((video) => (
          <div key={video.id} className="bg-card rounded-xl shadow-soft overflow-hidden group cursor-pointer">
            <div className="relative aspect-video">
              <img 
                src={video.thumbnail} 
                alt={video.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                  <Play className="text-primary ml-1" size={24} />
                </div>
              </div>
              <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {video.duration}
              </span>
            </div>
            <div className="p-4">
              <span className="text-xs font-medium text-primary">{video.category}</span>
              <h3 className="font-semibold text-foreground mt-1">{video.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{video.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Coming Soon */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8 text-center">
        <Video size={48} className="mx-auto text-primary mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">¿Necesitás más tutoriales?</h3>
        <p className="text-muted-foreground mb-4">
          Estamos constantemente agregando nuevos videos. Si tenés alguna consulta, contactanos.
        </p>
        <a href="/contacto" className="btn-hero inline-flex">
          Contactar Soporte
        </a>
      </div>
    </div>
  );
};

export default ProductorTutoriales;
