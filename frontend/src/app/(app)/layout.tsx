import type { ReactNode } from "react";

import { OnboardingGate } from "@/features/onboarding";
import { AppShell } from "@/features/shell";

import { Providers } from "../providers";

/** Every signed-in screen: app-wide providers, the onboarding gate, then the rail + top bar shell. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <OnboardingGate>
        <AppShell>{children}</AppShell>
      </OnboardingGate>
    </Providers>
  );
}
