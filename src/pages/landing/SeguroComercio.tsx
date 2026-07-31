import { RamoLandingTemplate } from "@/components/landing/RamoLandingTemplate";

export default function SeguroComercio() {
  return (
    <RamoLandingTemplate
      ramo="comercio"
      title="Seguro de Comercio"
      metaTitle="Seguro de Comercio para PyMEs"
      metaDescription="Seguro integral para tu comercio o PyME. Cotizá con Kipper Seguros y resguardá tu negocio."
      intro="Protegé tu local, mercadería, equipos y la responsabilidad frente a terceros. Cobertura integral pensada para PyMEs."
      benefits={[
        "Incendio del edificio y contenido",
        "Robo de mercadería y equipos",
        "Cristales y rotura de carteles",
        "Responsabilidad civil comercial",
        "Lucro cesante (según plan)",
      ]}
      faqs={[
        { q: "¿Qué rubros cubren?", a: "Trabajamos con la mayoría de los rubros comerciales y de servicios. Coordinamos según actividad." },
        { q: "¿Necesito inventario?", a: "Es ideal pero no obligatorio para cotizar. Lo afinamos en la emisión." },
      ]}
      whatsappMsg="Hola Kipper, quiero cotizar un seguro de comercio."
    />
  );
}
