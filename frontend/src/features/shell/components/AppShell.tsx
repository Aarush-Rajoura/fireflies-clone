"use client";

import type { ReactNode } from "react";

import { useRailExpanded } from "../hooks/useRailExpanded";

import { HelpButton } from "./HelpButton";
import { IconRail } from "./IconRail";
import { Topbar } from "./Topbar";

/** Rail on the left, top bar over a scrolling content area. Wraps every signed-in page. */
export function AppShell({ children }: { children: ReactNode }) {
  const { expanded, setExpanded, animate } = useRailExpanded();
  return (
    <div className="flex h-screen overflow-hidden">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-toast focus:rounded-control focus:bg-surface-1 focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <IconRail expanded={expanded} animate={animate} onToggle={() => setExpanded(!expanded)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main" className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <HelpButton />
    </div>
  );
}
