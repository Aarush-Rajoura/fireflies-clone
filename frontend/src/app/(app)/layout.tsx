import type { ReactNode } from "react";

import { AppShell } from "@/features/shell";

import { Providers } from "../providers";

/** Every signed-in screen: app-wide providers, then the rail + top bar shell. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <AppShell>{children}</AppShell>
    </Providers>
  );
}
