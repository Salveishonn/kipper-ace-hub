import { RamoLandingTemplate } from "@/components/landing/RamoLandingTemplate";

export default function SeguroMoto() {
  return (
    <RamoLandingTemplate
      ramo="moto"
      title="Seguro de Moto"
      metaTitle="Seguro de Moto en Argentina"
      metaDescription="Seguro de moto con cobertura adaptada a tu uso. Cotizá con Kipper Seguros y elegí la mejor opción."
      intro="Coberturas pensadas para motos: desde responsabilidad civil obligatoria hasta cobertura total contra robo, incendio y daños."
      benefits={[
        "Responsabilidad civil obligatoria",
        "Cobertura contra robo total",
        "Daños por incendio",
        "Asistencia mecánica en ruta",
        "Atención de siniestros con un productor real",
      ]}
      faqs={[
        { q: "¿Cubre uso laboral (delivery)?", a: "Sí, hay coberturas específicas para uso comercial o delivery. Lo aclarás en la cotización." },
        { q: "¿Cuál es la cobertura mínima?", a: "Responsabilidad civil obligatoria, exigida por ley para circular." },
        { q: "¿Puedo cambiar de cobertura después?", a: "Sí, podés actualizar la cobertura coordinando con tu productor." },
      ]}
      whatsappMsg="Hola Kipper, quiero cotizar un seguro de moto."
    />
  );
}
