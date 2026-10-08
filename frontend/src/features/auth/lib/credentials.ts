export type AuthMode = "login" | "signup";

export type Credentials = { email: string; password: string };
export type CredentialErrors = Partial<Record<keyof Credentials, string>>;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const MIN_SIGNUP_PASSWORD = 8;

/**
 * Field checks a real form would make, so the placeholder behaves like one.
 * Nothing is sent: a valid form simply continues as the demo user.
 */
export function validateCredentials(
  mode: AuthMode,
  { email, password }: Credentials,
): CredentialErrors {
  const errors: CredentialErrors = {};
  const trimmed = email.trim();
  if (!trimmed) errors.email = "Enter your work email.";
  else if (!EMAIL.test(trimmed)) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter a password.";
  else if (mode === "signup" && password.length < MIN_SIGNUP_PASSWORD) {
    errors.password = `Use at least ${MIN_SIGNUP_PASSWORD} characters.`;
  }
  return errors;
}
