import type { ReactNode } from "react";

import { ThemeProvider } from "@/features/theme";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
