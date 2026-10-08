"use client";

import { createContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import { AppProviders, type Theme } from "@/components/ui";

import {
  DEFAULT_PREFERENCE,
  PRE_PAINT_SCRIPT,
  readPreference,
  resolveTheme,
  subscribePreference,
  subscribeSystem,
  systemPrefersLight,
  writePreference,
  type ThemePreference,
} from "./lib/theme-store";

export type ThemeValue = {
  /** What the user chose. */
  preference: ThemePreference;
  /** What is on screen: `system` resolved against the OS setting. */
  theme: Theme;
  setPreference: (preference: ThemePreference) => void;
};

export const ThemeContext = createContext<ThemeValue | null>(null);

const noopSubscribe = () => () => undefined;

/**
 * Owns the theme preference and renders the app's themed scope with it.
 * useSyncExternalStore gives the server snapshot (dark) during hydration, so
 * markup matches, then the stored value right after; the inline script has
 * already painted the stored theme, so the user never sees the swap.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(
    subscribePreference,
    readPreference,
    () => DEFAULT_PREFERENCE,
  );
  const prefersLight = useSyncExternalStore(subscribeSystem, systemPrefersLight, () => false);
  // True only on the server and while hydrating: a script React creates on the client never runs.
  const hydrating = useSyncExternalStore(
    noopSubscribe,
    () => false,
    () => true,
  );
  const theme = resolveTheme(preference, prefersLight);
  const value = useMemo(
    () => ({ preference, theme, setPreference: writePreference }),
    [preference, theme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <AppProviders theme={theme}>
        {hydrating && <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_SCRIPT }} />}
        {children}
      </AppProviders>
    </ThemeContext.Provider>
  );
}
