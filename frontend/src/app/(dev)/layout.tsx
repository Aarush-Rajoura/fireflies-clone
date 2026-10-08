import type { ReactNode } from "react";

import { ThemeProvider } from "@/features/theme";

/** Dev pages get the same themed scope as the app, without the app shell. */
export default function DevLayout({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
