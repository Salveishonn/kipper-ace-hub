// Email clients ignore external CSS and web fonts, so everything here is inline, table-based HTML.
const BORDO = "#601410";
const BORDO_BUTTON = "#7f0a0a";
const GOLD = "#dda23c";
const CREAM = "#fbf8f4";
const INK = "#1a1412";
const BODY = "#4a403a";
const MUTED = "#8c8073";
const HAIRLINE = "#eee6dc";
const FONT = "Inter,'Segoe UI',Helvetica,Arial,sans-serif";

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

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "";
}

export function buildWelcomeEmail(params: WelcomeEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Te damos la bienvenida a Organización Kipper";
  const preheader = "Aprobamos tu solicitud. Tu acceso al Portal de Productores ya está activo.";
  const loginUrl = `${params.siteUrl}/login`;
  const recoverUrl = `${params.siteUrl}/recuperar-contrasena`;
  const logoUrl = `${params.siteUrl}/email/kipper-wordmark.png`;
  const name = firstName(params.fullName);
  const greeting = name ? `Hola ${name},` : "Hola,";
  const verifyNote =
    "Antes de ingresar por primera vez vas a tener que verificar tu email. Si no encontrás el mensaje de verificación, podés pedir uno nuevo desde la pantalla de ingreso.";

  const sectionRows = PORTAL_SECTIONS.map(
    ([title, description], index) => `
              <tr>
                <td style="padding:14px 0;${index ? `border-top:1px solid ${HAIRLINE};` : ""}font-family:${FONT};">
                  <p style="margin:0 0 2px;font-size:14px;line-height:20px;font-weight:600;color:${INK};">${escapeHtml(title)}</p>
                  <p style="margin:0;font-size:14px;line-height:21px;color:${BODY};">${escapeHtml(description)}</p>
                </td>
              </tr>`,
  ).join("");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(subject)}</title>
<style>
  @media only screen and (max-width:600px) {
    .pad { padding-left:24px !important; padding-right:24px !important; }
    .headline { font-size:26px !important; line-height:33px !important; }
    .cta, .cta tbody, .cta tr, .cta td, .cta a { display:block !important; width:100% !important; box-sizing:border-box !important; text-align:center !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${CREAM};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${CREAM};">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREAM};">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid ${HAIRLINE};border-radius:4px;overflow:hidden;">
          <tr>
            <td class="pad" bgcolor="${BORDO}" style="background-color:${BORDO};padding:36px 44px;">
              <img src="${escapeHtml(logoUrl)}" width="168" height="46" alt="Organización Kipper" style="display:block;width:168px;height:46px;border:0;font-family:${FONT};font-size:20px;font-weight:600;color:#ffffff;">
            </td>
          </tr>
          <tr><td height="3" bgcolor="${GOLD}" style="height:3px;line-height:3px;font-size:3px;background-color:${GOLD};">&nbsp;</td></tr>
          <tr>
            <td class="pad" style="padding:44px 44px 12px;font-family:${FONT};">
              <p style="margin:0 0 14px;font-size:12px;line-height:16px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${BORDO_BUTTON};">Solicitud aprobada</p>
              <h1 class="headline" style="margin:0 0 24px;font-size:30px;line-height:38px;font-weight:600;letter-spacing:-.01em;color:${INK};">Te damos la bienvenida a Organización Kipper</h1>
              <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:${BODY};">${escapeHtml(greeting)}</p>
              <p style="margin:0 0 30px;font-size:16px;line-height:26px;color:${BODY};">Aprobamos tu solicitud. Desde hoy sos parte de nuestra red de Productores Asesores de Seguros y tu acceso al Portal de Productores ya está activo.</p>
              <table role="presentation" class="cta" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="${BORDO_BUTTON}" style="background-color:${BORDO_BUTTON};border-radius:4px;">
                    <a href="${escapeHtml(loginUrl)}" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;">Ingresar al Portal de Productores</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:14px;line-height:22px;color:${BODY};">Ingresá con <strong style="font-weight:600;color:${INK};">${escapeHtml(params.email)}</strong> y la contraseña que elegiste al registrarte. Si no la recordás, podés <a href="${escapeHtml(recoverUrl)}" style="color:${BORDO_BUTTON};text-decoration:underline;">crear una nueva</a>.</p>
              ${params.emailVerified ? "" : `<p style="margin:14px 0 0;font-size:14px;line-height:22px;color:${BODY};">${escapeHtml(verifyNote)}</p>`}
            </td>
          </tr>
          <tr>
            <td class="pad" style="padding:32px 44px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${HAIRLINE};">
                <tr>
                  <td style="padding:28px 0 8px;font-family:${FONT};font-size:12px;line-height:16px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${MUTED};">En el portal vas a encontrar</td>
                </tr>${sectionRows}
              </table>
            </td>
          </tr>
          <tr>
            <td class="pad" bgcolor="#f6f1ea" style="background-color:#f6f1ea;padding:24px 44px;font-family:${FONT};">
              <p style="margin:0 0 4px;font-size:13px;line-height:20px;font-weight:600;color:${INK};">Organización Kipper</p>
              <p style="margin:0;font-size:12px;line-height:19px;color:${MUTED};">Recibís este email porque solicitaste sumarte como productor en <a href="${escapeHtml(params.siteUrl)}" style="color:${MUTED};text-decoration:underline;">kipperseguros.com</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    "Te damos la bienvenida a Organización Kipper",
    "",
    greeting,
    "",
    "Aprobamos tu solicitud. Desde hoy sos parte de nuestra red de Productores Asesores de Seguros y tu acceso al Portal de Productores ya está activo.",
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
    "Recibís este email porque solicitaste sumarte como productor en kipperseguros.com.",
  ].join("\n");

  return { subject, html, text };
}
