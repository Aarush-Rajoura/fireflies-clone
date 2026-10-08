"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type Theme = "dark" | "light";

type ThemeValue = { theme: Theme; setTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeValue | null>(null);
const PortalContext = createContext<HTMLElement | null>(null);

export type ThemeRootProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  className?: string;
};

/**
 * The themed subtree: sets `data-theme` (which switches every token) and the
 * `.ff-app` scope for base styles. Overlays portal into this element rather
 * than <body>, so menus and dialogs inherit the theme while the marketing site,
 * which renders outside any ThemeRoot, never sees app tokens.
 */
export function ThemeRoot({ children, defaultTheme = "dark", className }: ThemeRootProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return (
    <ThemeContext.Provider value={value}>
      <div
        ref={setNode}
        data-theme={theme}
        className={cn("ff-app bg-surface-0 font-app text-body text-primary", className)}
      >
        <PortalContext.Provider value={node}>{children}</PortalContext.Provider>
      </div>
    </ThemeContext.Provider>
  );
}

/** Current theme and setter, for the profile-menu theme toggle. */
export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside <ThemeRoot>");
  return value;
}

/** Where overlays should portal to; undefined falls back to <body>. */
export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContext) ?? undefined;
}
