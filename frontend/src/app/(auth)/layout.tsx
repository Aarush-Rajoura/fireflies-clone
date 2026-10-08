import type { ReactNode } from "react";

import { AppProviders } from "@/components/ui";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
