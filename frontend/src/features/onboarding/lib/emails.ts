// Mirrors the backend's deliberately loose check; the invite email itself is the real test.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const MAX_INVITES = 20;

export function isValidEmail(value: string): boolean {
  return value.length <= 320 && EMAIL.test(value);
}

/** Splits pasted or typed text on commas, semicolons and whitespace into lower-cased entries. */
export function splitEmails(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
