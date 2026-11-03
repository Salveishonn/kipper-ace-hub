/**
 * Admin-entered links are opened, linked and embedded for every producer. Only http(s) URLs
 * pass; javascript:, data: and relative values come back as null. The database enforces the
 * same rule (CHECK constraints in 20261103120000_security_review_hardening.sql).
 */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
