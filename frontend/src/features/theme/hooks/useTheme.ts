"use client";

import { useContext } from "react";

import { ThemeContext, type ThemeValue } from "../ThemeProvider";

/** Current theme preference, the resolved theme, and the setter. */
export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside <ThemeProvider>");
  return value;
}
