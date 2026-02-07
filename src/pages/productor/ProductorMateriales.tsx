import { FolderOpen, Download, Image, FileText, Video, Instagram } from "lucide-react";
import { toast } from "sonner";

const materials = [
  {
    id: 1,
    category: "Stories Instagram",
    items: [
      { name: "Story - Seguro Auto", type: "image", size: "1.2 MB" },
      { name: "Story - Seguro Hogar", type: "image", size: "1.1 MB" },
      { name: "Story - Cotizá Gratis", type: "image", size: "980 KB" },
      { name: "Story - Día del Conductor", type: "image", size: "1.3 MB" },
    ]
  },
  {
    id: 2,
    category: "Posts Redes Sociales",
    items: [
      { name: "Flyer Auto - Terceros", type: "image", size: "2.1 MB" },
      { name: "Flyer Hogar - Todo Riesgo", type: "image", size: "2.0 MB" },
      { name: "Flyer Moto - Básico", type: "image", size: "1.9 MB" },
      { name: "Carrusel - Beneficios", type: "image", size: "4.5 MB" },
    ]
  },
  {
    id: 3,
    category: "Reels / Videos Cortos",
    items: [
      { name: "Reel - Tips Seguro Auto", type: "video", size: "15 MB" },
      { name: "Reel - Qué es Todo Riesgo", type: "video", size: "12 MB" },
      { name: "Reel - Siniestro Paso a Paso", type: "video", size: "18 MB" },
    ]
  },
  {
    id: 4,
    category: "Material Educativo",
    items: [
      { name: "Guía - Tipos de Cobertura", type: "pdf", size: "1.5 MB" },
      { name: "Infografía - Siniestros", type: "image", size: "2.3 MB" },
      { name: "Checklist - Documentación", type: "pdf", size: "450 KB" },
    ]
  },
];

const getIcon = (type: string) => {
  switch (type) {
    case 'video': return Video;
    case 'pdf': return FileText;
    default: return Image;
  }
};

const ProductorMateriales = () => {
  const handleDownload = (name: string) => {
    toast.info(`Descargando ${name}...`, {
      description: "El archivo incluye marca de agua Kipper"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Material de Producción</h1>
          <p className="text-muted-foreground">Contenido para redes sociales con marca Kipper</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 flex items-center gap-4">
        <Instagram className="text-primary flex-shrink-0" size={24} />
        <div>
          <p className="font-medium text-foreground">Material listo para usar</p>
          <p className="text-sm text-muted-foreground">
            Todos los archivos incluyen branding Kipper. Usálos en tus redes para promocionar tus servicios.
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-8">
        {materials.map((category) => (
          <div key={category.id}>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FolderOpen size={20} className="text-primary" />
              {category.category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {category.items.map((item, index) => {
                const Icon = getIcon(item.type);
                return (
                  <div 
                    key={index} 
                    className="bg-card rounded-xl shadow-soft p-4 hover:shadow-card transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        item.type === 'video' ? 'bg-purple-100' :
                        item.type === 'pdf' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <Icon size={20} className={
                          item.type === 'video' ? 'text-purple-600' :
                          item.type === 'pdf' ? 'text-red-600' : 'text-blue-600'
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.size}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDownload(item.name)}
                      className="w-full mt-3 flex items-center justify-center gap-2 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <Download size={14} /> Descargar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Request More */}
      <div className="bg-card rounded-2xl shadow-soft p-8 text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">¿Necesitás material personalizado?</h3>
        <p className="text-muted-foreground mb-4">
          Podemos crear contenido específico para tu marca personal dentro de Kipper
        </p>
        <a href="/contacto" className="btn-hero-outline inline-flex">
          Solicitar Material
        </a>
      </div>
    </div>
  );
};

export default ProductorMateriales;
