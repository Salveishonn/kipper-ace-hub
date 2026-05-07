import { RamoLandingTemplate } from "@/components/landing/RamoLandingTemplate";

export default function SeguroHogar() {
  return (
    <RamoLandingTemplate
      ramo="hogar"
      title="Seguro de Hogar"
      metaTitle="Seguro de Hogar en Argentina"
      metaDescription="Protegé tu casa, departamento y bienes con un seguro de hogar a medida. Cotizá con Kipper Seguros."
      intro="Cobertura para tu vivienda y contenido. Incendio, robo, daños por agua, responsabilidad civil y mucho más."
      benefits={[
        "Incendio y daños eléctricos",
        "Robo de contenido",
        "Daños por agua",
        "Cristales y artefactos",
        "Responsabilidad civil hacia terceros",
        "Asistencia al hogar (plomero, gasista, electricista)",
      ]}
      faqs={[
        { q: "¿Aplica a alquiler?", a: "Sí, contemplamos coberturas para inquilinos y propietarios." },
        { q: "¿Qué documentación necesito?", a: "DNI y datos de la vivienda. Si tenés inventario, mejor." },
        { q: "¿Cubre eventos climáticos?", a: "Sí, depende del plan. Tu productor te explica el alcance." },
      ]}
      whatsappMsg="Hola Kipper, quiero cotizar un seguro de hogar."
    />
  );
}
