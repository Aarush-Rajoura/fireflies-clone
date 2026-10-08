import type { ReactNode } from "react";

import { Providers } from "../providers";

/**
 * Sign-in and onboarding: the app's providers (query client for the wizard's
 * /me reads and writes, plus the theme scope) without the shell.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
