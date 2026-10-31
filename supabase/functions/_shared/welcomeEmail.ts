import {
  emailList,
  emailLink,
  emailParagraph,
  emailSmall,
  emailSmallHtml,
  emailStrong,
  escapeHtml,
  renderKipperEmail,
} from "./emailLayout.ts";

const PORTAL_SECTIONS: Array<[string, string]> = [
  ["Academy", "Capacitación para seguir creciendo como productor."],
  ["Recursos gráficos", "Piezas listas para comunicar con tus clientes."],
  ["Novedades", "Lo último de la organización, en un solo lugar."],
  ["Consultas", "Un canal directo con el equipo de Kipper."],
];

export type WelcomeEmailParams = {
  fullName: string;
  email: string;
  siteUrl: string;
  emailVerified: boolean;
};

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "";
}

export function buildWelcomeEmail(params: WelcomeEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Te damos la bienvenida a Organización Kipper";
  const loginUrl = `${params.siteUrl}/login`;
  const recoverUrl = `${params.siteUrl}/recuperar-contrasena`;
  const name = firstName(params.fullName);
  const greeting = name ? `Hola ${name},` : "Hola,";
  const intro =
    "Aprobamos tu solicitud. Desde hoy sos parte de nuestra red de Productores Asesores de Seguros y tu acceso al Portal de Productores ya está activo.";
  const verifyNote =
    "Antes de ingresar por primera vez vas a tener que verificar tu email. Si no encontrás el mensaje de verificación, podés pedir uno nuevo desde la pantalla de ingreso.";
  const footerNote = "Recibís este email porque solicitaste sumarte como productor en kipperseguros.com.";

  const html = renderKipperEmail({
    subject,
    preheader: "Aprobamos tu solicitud. Tu acceso al Portal de Productores ya está activo.",
    eyebrow: "Solicitud aprobada",
    headline: subject,
    bodyHtml: `${emailParagraph(greeting)}
              ${emailParagraph(intro)}`,
    cta: { label: "Ingresar al Portal de Productores", url: loginUrl },
    afterCtaHtml: `${emailSmallHtml(
      `Ingresá con ${emailStrong(params.email)} y la contraseña que elegiste al registrarte. Si no la recordás, podés ${emailLink("crear una nueva", recoverUrl)}.`,
    )}
              ${params.emailVerified ? "" : emailSmall(verifyNote)}`,
    sectionHtml: emailList("En el portal vas a encontrar", PORTAL_SECTIONS),
    footerNote,
  });

  const text = [
    subject,
    "",
    greeting,
    "",
    intro,
    "",
    `Ingresar al Portal de Productores: ${loginUrl}`,
    "",
    `Ingresá con ${params.email} y la contraseña que elegiste al registrarte. Si no la recordás, podés crear una nueva: ${recoverUrl}`,
    ...(params.emailVerified ? [] : ["", verifyNote]),
    "",
    "En el portal vas a encontrar:",
    ...PORTAL_SECTIONS.map(([title, description]) => `- ${title}: ${description}`),
    "",
    "Organización Kipper",
    footerNote,
  ].join("\n");

  return { subject, html, text };
}
