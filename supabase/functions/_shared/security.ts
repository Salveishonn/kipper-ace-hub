// Small security primitives shared by the Edge Functions. Pure, so vitest can cover them.

/** Constant-time comparison for secrets and hashes of equal, non-secret length. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

/** Uniform decimal digits: bytes >= 250 are discarded so `% 10` has no bias toward 0-5. */
export function randomDigits(
  count: number,
  getRandomValues: (buf: Uint8Array) => Uint8Array = (buf) => crypto.getRandomValues(buf),
): string {
  let out = "";
  while (out.length < count) {
    for (const b of getRandomValues(new Uint8Array(count * 2))) {
      if (b < 250 && out.length < count) out += String(b % 10);
    }
  }
  return out;
}

export type FieldLimits = Record<string, number>;

/** Returns the first field longer than its limit, or null. Missing/null fields are fine. */
export function firstOversizedField(
  values: Record<string, string | null | undefined>,
  limits: FieldLimits,
): string | null {
  for (const [field, max] of Object.entries(limits)) {
    const value = values[field];
    if (typeof value === "string" && value.length > max) return field;
  }
  return null;
}

/**
 * Whether a password sign-in attempt proved the caller knows the account's password.
 * GoTrue verifies the password before it checks email confirmation, so
 * `email_not_confirmed` also means the password was right.
 */
export function signInProvesPassword(result: {
  hasSession: boolean;
  errorCode?: string | null;
}): boolean {
  return result.hasSession || result.errorCode === "email_not_confirmed";
}
