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

// Not SITE_URL: the logo and footer must keep working in emails sent from any environment.
const PUBLIC_SITE_URL = "https://kipperseguros.com";
const LOGO_URL = `${PUBLIC_SITE_URL}/email/kipper-wordmark.png`;

export type KipperEmailLayout = {
  subject: string;
  preheader: string;
  eyebrow: string;
  headline: string;
  /** Trusted HTML: build it with the helpers below. */
  bodyHtml: string;
  cta?: { label: string; url: string; showFallbackLink?: boolean };
  /** Trusted HTML shown right after the button. */
  afterCtaHtml?: string;
  /** Trusted HTML shown in its own block under a divider. */
  sectionHtml?: string;
  footerNote: string;
};

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 14px;font-size:16px;line-height:26px;color:${BODY};">${escapeHtml(text)}</p>`;
}

export function emailSmallHtml(html: string): string {
  return `<p style="margin:14px 0 0;font-size:14px;line-height:22px;color:${BODY};">${html}</p>`;
}

export function emailSmall(text: string): string {
  return emailSmallHtml(escapeHtml(text));
}

export function emailStrong(text: string): string {
  return `<strong style="font-weight:600;color:${INK};">${escapeHtml(text)}</strong>`;
}

export function emailLink(label: string, url: string): string {
  return `<a href="${escapeHtml(url)}" style="color:${BORDO_BUTTON};text-decoration:underline;">${escapeHtml(label)}</a>`;
}

export function emailCode(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 24px;">
                <tr>
                  <td align="center" bgcolor="${CREAM}" style="background-color:${CREAM};border:1px solid ${HAIRLINE};border-radius:4px;padding:22px 12px;font-family:${FONT};font-size:32px;line-height:38px;font-weight:600;letter-spacing:8px;color:${BORDO};">${escapeHtml(code)}</td>
                </tr>
              </table>`;
}

export function emailDetails(rows: Array<[string, string]>): string {
  const body = rows
    .map(
      ([label, value], index) => `
                <tr>
                  <td valign="top" width="120" style="width:120px;padding:10px 12px 10px 0;${index ? `border-top:1px solid ${HAIRLINE};` : ""}font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(label)}</td>
                  <td valign="top" style="padding:10px 0;${index ? `border-top:1px solid ${HAIRLINE};` : ""}font-family:${FONT};font-size:14px;line-height:20px;color:${INK};word-break:break-word;">${escapeHtml(value)}</td>
                </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 26px;">${body}
              </table>`;
}

export function emailList(title: string, items: Array<[string, string]>): string {
  const rows = items
    .map(
      ([name, description], index) => `
                <tr>
                  <td style="padding:14px 0;${index ? `border-top:1px solid ${HAIRLINE};` : ""}font-family:${FONT};">
                    <p style="margin:0 0 2px;font-size:14px;line-height:20px;font-weight:600;color:${INK};">${escapeHtml(name)}</p>
                    <p style="margin:0;font-size:14px;line-height:21px;color:${BODY};">${escapeHtml(description)}</p>
                  </td>
                </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${HAIRLINE};">
                <tr>
                  <td style="padding:28px 0 8px;font-family:${FONT};font-size:12px;line-height:16px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${MUTED};">${escapeHtml(title)}</td>
                </tr>${rows}
              </table>`;
}

/** Every Kipper email, including the Supabase Auth templates, renders through this layout. */
export function renderKipperEmail(email: KipperEmailLayout): string {
  const cta = email.cta
    ? `<table role="presentation" class="cta" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
                <tr>
                  <td bgcolor="${BORDO_BUTTON}" style="background-color:${BORDO_BUTTON};border-radius:4px;">
                    <a href="${escapeHtml(email.cta.url)}" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(email.cta.label)}</a>
                  </td>
                </tr>
              </table>`
    : "";
  const fallback = email.cta?.showFallbackLink
    ? `<p style="margin:20px 0 0;font-size:12px;line-height:19px;color:${MUTED};word-break:break-all;">Si el botón no funciona, copiá este enlace en tu navegador:<br><a href="${escapeHtml(email.cta.url)}" style="color:${MUTED};text-decoration:underline;">${escapeHtml(email.cta.url)}</a></p>`
    : "";
  const section = email.sectionHtml
    ? `
          <tr>
            <td class="pad" style="padding:32px 44px 40px;">
              ${email.sectionHtml}
            </td>
          </tr>`
    : "";

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(email.subject)}</title>
<style>
  @media only screen and (max-width:600px) {
    .pad { padding-left:24px !important; padding-right:24px !important; }
    .headline { font-size:26px !important; line-height:33px !important; }
    .cta, .cta tbody, .cta tr, .cta td, .cta a { display:block !important; width:100% !important; box-sizing:border-box !important; text-align:center !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${CREAM};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${CREAM};">${escapeHtml(email.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREAM};">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid ${HAIRLINE};border-radius:4px;overflow:hidden;">
          <tr>
            <td class="pad" bgcolor="${BORDO}" style="background-color:${BORDO};padding:36px 44px;">
              <img src="${LOGO_URL}" width="168" height="46" alt="Organización Kipper" style="display:block;width:168px;height:46px;border:0;font-family:${FONT};font-size:20px;font-weight:600;color:#ffffff;">
            </td>
          </tr>
          <tr><td height="3" bgcolor="${GOLD}" style="height:3px;line-height:3px;font-size:3px;background-color:${GOLD};">&nbsp;</td></tr>
          <tr>
            <td class="pad" style="padding:44px 44px ${email.sectionHtml ? "12px" : "40px"};font-family:${FONT};">
              <p style="margin:0 0 14px;font-size:12px;line-height:16px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${BORDO_BUTTON};">${escapeHtml(email.eyebrow)}</p>
              <h1 class="headline" style="margin:0 0 24px;font-size:30px;line-height:38px;font-weight:600;letter-spacing:-.01em;color:${INK};">${escapeHtml(email.headline)}</h1>
              ${email.bodyHtml}
              ${cta}
              ${email.afterCtaHtml ?? ""}
              ${fallback}
            </td>
          </tr>${section}
          <tr>
            <td class="pad" bgcolor="#f6f1ea" style="background-color:#f6f1ea;padding:24px 44px;font-family:${FONT};">
              <p style="margin:0 0 4px;font-size:13px;line-height:20px;font-weight:600;color:${INK};">Organización Kipper</p>
              <p style="margin:0;font-size:12px;line-height:19px;color:${MUTED};">${escapeHtml(email.footerNote)}</p>
              <p style="margin:4px 0 0;font-size:12px;line-height:19px;"><a href="${PUBLIC_SITE_URL}" style="color:${MUTED};text-decoration:underline;">kipperseguros.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
