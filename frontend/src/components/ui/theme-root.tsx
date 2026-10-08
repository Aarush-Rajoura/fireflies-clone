"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type Theme = "dark" | "light";

const PortalContext = createContext<HTMLElement | null>(null);

export type ThemeRootProps = {
  children: ReactNode;
  theme?: Theme;
  className?: string;
};

/**
 * The themed subtree: sets `data-theme` (which switches every token) and the
 * `.ff-app` scope for base styles. Overlays portal into this element rather
 * than <body>, so menus and dialogs inherit the theme while the marketing site,
 * which renders outside any ThemeRoot, never sees app tokens.
 *
 * Which theme to show is the caller's decision (the theme feature owns the
 * user's preference); this primitive only applies it.
 */
export function ThemeRoot({ children, theme = "dark", className }: ThemeRootProps) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  return (
    <div
      ref={setNode}
      data-theme={theme}
      // A pre-paint script may already have applied the stored theme before hydration.
      suppressHydrationWarning
      className={cn("ff-app bg-surface-0 font-app text-body text-primary", className)}
    >
      <PortalContext.Provider value={node}>{children}</PortalContext.Provider>
    </div>
  );
}

/** Where overlays should portal to; undefined falls back to <body>. */
export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContext) ?? undefined;
}
