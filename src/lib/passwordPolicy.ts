/** Shared password rules for Sumate registration and recovery. */

export type PasswordRequirement = {
  id: "length" | "upper" | "lower" | "number";
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: "length",
    label: "Mínimo 8 caracteres",
    test: (p) => p.length >= 8,
  },
  {
    id: "upper",
    label: "Al menos una mayúscula",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "lower",
    label: "Al menos una minúscula",
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: "number",
    label: "Al menos un número",
    test: (p) => /[0-9]/.test(p),
  },
];

export function validatePassword(password: string): string | null {
  for (const req of PASSWORD_REQUIREMENTS) {
    if (!req.test(password)) return req.label;
  }
  return null;
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}

export function isPasswordValid(password: string): boolean {
  return validatePassword(password) === null;
}
