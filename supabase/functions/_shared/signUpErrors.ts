export type SignUpFailure = { error: string; status: number };

const NOT_SAVED = "Tu solicitud no se registró.";

/** Explains failures where no account was created, so the applicant knows what to do next. */
export function describeSignUpFailure(error: {
  code?: string;
  message: string;
}): SignUpFailure | null {
  const message = error.message.toLowerCase();

  if (error.code === "email_address_invalid") {
    return {
      error: `Ese email no parece existir. Revisá que esté bien escrito. ${NOT_SAVED}`,
      status: 400,
    };
  }
  if (error.code === "weak_password") {
    return {
      error: `Esa contraseña no es lo bastante segura. Elegí otra. ${NOT_SAVED}`,
      status: 400,
    };
  }
  if (
    error.code === "over_email_send_rate_limit" ||
    message.includes("sending confirmation email")
  ) {
    return {
      error: `No pudimos enviarte el email de verificación. ${NOT_SAVED} Intentá nuevamente en un rato.`,
      status: 503,
    };
  }
  if (message.includes("rate limit")) {
    return {
      error: `Recibimos demasiados intentos. ${NOT_SAVED} Intentá nuevamente en unos minutos.`,
      status: 429,
    };
  }
  return null;
}
