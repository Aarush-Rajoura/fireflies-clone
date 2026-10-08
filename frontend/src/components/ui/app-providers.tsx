"use client";

import type { ReactNode } from "react";

import { ThemeRoot, type Theme } from "./theme-root";
import { Toaster } from "./toaster";
import { TooltipProvider } from "./tooltip";

/** Everything the primitives expect above them: theme scope, one tooltip provider, the toaster. */
export function AppProviders({ children, defaultTheme = "dark" }: { children: ReactNode; defaultTheme?: Theme }) {
  return (
    <ThemeRoot defaultTheme={defaultTheme} className="min-h-screen">
      <TooltipProvider delayDuration={300} skipDelayDuration={100}>
        {children}
        <Toaster />
      </TooltipProvider>
    </ThemeRoot>
  );
}
