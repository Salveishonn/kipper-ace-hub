import { RamoLandingTemplate } from "@/components/landing/RamoLandingTemplate";

export default function SeguroVida() {
  return (
    <RamoLandingTemplate
      ramo="vida"
      title="Seguro de Vida"
      metaTitle="Seguro de Vida"
      metaDescription="Resguardá a tu familia con un seguro de vida. Cotizá con Kipper Seguros y armá tu plan a medida."
      intro="Pensado para que tu familia esté protegida ante imprevistos. Capital asegurado, coberturas adicionales y asesoramiento real."
      benefits={[
        "Capital por fallecimiento",
        "Cobertura por invalidez total y permanente",
        "Adicionales por enfermedades graves",
        "Beneficiarios designados por vos",
      ]}
      faqs={[
        { q: "¿Necesito estudios médicos?", a: "Depende del capital y la edad. Tu productor te indica el detalle." },
        { q: "¿Puedo cambiar beneficiarios?", a: "Sí, en cualquier momento y de manera simple." },
      ]}
      whatsappMsg="Hola Kipper, quiero cotizar un seguro de vida."
    />
  );
}
