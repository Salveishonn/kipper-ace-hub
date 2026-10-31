import {
  emailCode,
  emailParagraph,
  emailSmall,
  renderKipperEmail,
} from "../functions/_shared/emailLayout.ts";

// Supabase Auth sends these itself, filling the {{ .Name }} placeholders when it sends them.
const CONFIRMATION_URL = "{{ .ConfirmationURL }}";
const IGNORE_NOTE = "Si no pediste este email, podés ignorarlo. Tu cuenta sigue segura.";

export type AuthEmail = {
  /** Suffix of the mailer_* fields in the Supabase Auth config. */
  key: "confirmation" | "invite" | "magic_link" | "email_change" | "recovery" | "reauthentication";
  subject: string;
  html: string;
};

function linkEmail(params: {
  key: AuthEmail["key"];
  subject: string;
  preheader: string;
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
  note?: string;
  footerNote?: string;
}): AuthEmail {
  return {
    key: params.key,
    subject: params.subject,
    html: renderKipperEmail({
      subject: params.subject,
      preheader: params.preheader,
      eyebrow: params.eyebrow,
      headline: params.headline,
      bodyHtml: emailParagraph(params.body),
      cta: { label: params.ctaLabel, url: CONFIRMATION_URL, showFallbackLink: true },
      afterCtaHtml: params.note ? emailSmall(params.note) : undefined,
      footerNote: params.footerNote ?? IGNORE_NOTE,
    }),
  };
}

export const AUTH_EMAILS: AuthEmail[] = [
  linkEmail({
    key: "confirmation",
    subject: "Confirmá tu email — Organización Kipper",
    preheader: "Un último paso para completar tu registro en Organización Kipper.",
    eyebrow: "Verificación de email",
    headline: "Confirmá tu email",
    body: "Recibimos tu registro en Organización Kipper. Confirmá tu dirección de email para completarlo.",
    ctaLabel: "Confirmar mi email",
  }),
  linkEmail({
    key: "invite",
    subject: "Te invitamos al Portal de Productores — Organización Kipper",
    preheader: "Activá tu acceso al Portal de Productores de Organización Kipper.",
    eyebrow: "Invitación",
    headline: "Te invitamos al Portal de Productores",
    body: "Organización Kipper te invitó a sumarte al Portal de Productores. Aceptá la invitación para activar tu acceso.",
    ctaLabel: "Aceptar invitación",
    footerNote: "Si no esperabas esta invitación, podés ignorar este email.",
  }),
  linkEmail({
    key: "magic_link",
    subject: "Tu enlace de acceso — Organización Kipper",
    preheader: "Ingresá a Organización Kipper con este enlace.",
    eyebrow: "Acceso",
    headline: "Tu enlace de acceso",
    body: "Usá este botón para ingresar a tu cuenta de Organización Kipper.",
    ctaLabel: "Ingresar",
  }),
  linkEmail({
    key: "email_change",
    subject: "Confirmá tu nuevo email — Organización Kipper",
    preheader: "Confirmá el cambio de email de tu cuenta de Organización Kipper.",
    eyebrow: "Cambio de email",
    headline: "Confirmá tu nuevo email",
    body: "Pediste cambiar el email de tu cuenta de {{ .Email }} a {{ .NewEmail }}. Confirmá el cambio para aplicarlo.",
    ctaLabel: "Confirmar cambio",
    footerNote: "Si no pediste este cambio, ignorá este email y tu cuenta no se va a modificar.",
  }),
  linkEmail({
    key: "recovery",
    subject: "Creá una nueva contraseña — Organización Kipper",
    preheader: "Elegí una nueva contraseña para tu cuenta de Organización Kipper.",
    eyebrow: "Contraseña",
    headline: "Creá una nueva contraseña",
    body: "Recibimos un pedido para restablecer la contraseña de tu cuenta. Usá este botón para elegir una nueva.",
    ctaLabel: "Crear nueva contraseña",
    footerNote: "Si no lo pediste, podés ignorar este email. Tu contraseña no va a cambiar.",
  }),
  {
    key: "reauthentication",
    subject: "Tu código de verificación — Organización Kipper",
    html: renderKipperEmail({
      subject: "Tu código de verificación — Organización Kipper",
      preheader: "Usá este código para confirmar la operación en tu cuenta.",
      eyebrow: "Verificación",
      headline: "Tu código de verificación",
      bodyHtml: `${emailParagraph("Ingresá este código para confirmar la operación en tu cuenta:")}
              ${emailCode("{{ .Token }}")}`,
      footerNote: IGNORE_NOTE,
    }),
  },
];
