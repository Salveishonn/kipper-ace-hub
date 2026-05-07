import { RamoLandingTemplate } from "@/components/landing/RamoLandingTemplate";

export default function SeguroAuto() {
  return (
    <RamoLandingTemplate
      ramo="auto"
      title="Seguro de Auto"
      metaTitle="Seguro de Auto en Argentina"
      metaDescription="Cotizá tu seguro de auto con Kipper Seguros. Atención personalizada, gestión digital y las mejores compañías del mercado."
      intro="Cobertura para tu auto con asesoramiento real. Te ayudamos a elegir entre terceros, terceros completo o todo riesgo según lo que necesitás."
      benefits={[
        "Cobertura nacional 24/7 con asistencia mecánica",
        "Granizo, robo, incendio y daños totales",
        "Cristales, cerraduras y ruedas según cobertura",
        "Auto sustituto en planes premium",
        "Trámite de siniestro 100% digital desde tu portal",
        "Asesoramiento personal de un productor matriculado",
      ]}
      faqs={[
        { q: "¿Cuánto tarda la emisión?", a: "Una vez aprobada la cotización, la póliza suele emitirse en 24 a 48 horas hábiles." },
        { q: "¿Puedo elegir la compañía?", a: "Sí. Trabajamos con varias compañías y te asesoramos para elegir la mejor relación cobertura–precio." },
        { q: "¿Cómo denuncio un siniestro?", a: "Desde el portal del cliente cargás los datos y la documentación. Un asesor te acompaña hasta el cierre." },
        { q: "¿Hay descuentos por antigüedad?", a: "Sí, las compañías premian la siniestralidad baja y la antigüedad como cliente." },
      ]}
      whatsappMsg="Hola Kipper, quiero cotizar un seguro de auto."
    />
  );
}
