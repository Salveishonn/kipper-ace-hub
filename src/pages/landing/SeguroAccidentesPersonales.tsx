import { RamoLandingTemplate } from "@/components/landing/RamoLandingTemplate";

export default function SeguroAccidentesPersonales() {
  return (
    <RamoLandingTemplate
      ramo="accidentes_personales"
      title="Seguro de Accidentes Personales"
      metaTitle="Seguro de Accidentes Personales"
      metaDescription="Cobertura económica para vos y tu familia ante un accidente. Cotizá con Kipper Seguros."
      intro="Una cobertura para resguardar a vos y a tu familia frente a accidentes con cobertura por muerte, invalidez y asistencia médica."
      benefits={[
        "Indemnización por muerte accidental",
        "Invalidez total o parcial",
        "Reembolso de gastos médicos",
        "Cobertura 24/7 en todo el país",
      ]}
      faqs={[
        { q: "¿Sirve para deportes?", a: "Sí, hay planes que contemplan deportes recreativos. Aclarámelo al cotizar." },
        { q: "¿Hay edad límite?", a: "Cada compañía define el rango etario. Lo confirmamos en la emisión." },
      ]}
      whatsappMsg="Hola Kipper, quiero cotizar accidentes personales."
    />
  );
}
