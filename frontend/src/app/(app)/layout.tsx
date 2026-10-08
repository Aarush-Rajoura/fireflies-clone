import type { ReactNode } from "react";

import { AppProviders } from "@/components/ui";

/** Every signed-in app screen renders inside the themed scope (dark by default). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
