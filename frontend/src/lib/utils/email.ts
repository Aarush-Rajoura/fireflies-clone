// Mirrors the backend's deliberately loose check; no email is sent, so this only catches typos.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The backend's per-request invite ceiling. */
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

export type EmailDraftResult = {
  emails: string[];
  /** Invalid entries stay in the box so they can be fixed rather than retyped. */
  draft: string;
  error: string | null;
};

/** Moves the valid addresses typed in `draft` into `emails`: deduplicated, capped at `max`. */
export function commitEmailDraft(
  emails: readonly string[],
  draft: string,
  max: number = MAX_INVITES,
  overflowMessage = `You can invite up to ${max} people at a time.`,
): EmailDraftResult {
  const entries = splitEmails(draft);
  if (entries.length === 0) return { emails: [...emails], draft: "", error: null };
  const bad = entries.filter((e) => !isValidEmail(e));
  const merged = [...new Set([...emails, ...entries.filter(isValidEmail)])];
  const badMessage = bad.length === 1 ? `"${bad[0]}" is not` : `${bad.length} entries are not`;
  return {
    emails: merged.slice(0, max),
    draft: bad.join(", "),
    error:
      bad.length > 0
        ? `${badMessage} a valid email address.`
        : merged.length > max
          ? overflowMessage
          : null,
  };
}
