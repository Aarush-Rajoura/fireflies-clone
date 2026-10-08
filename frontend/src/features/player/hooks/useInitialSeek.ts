"use client";

import { useEffect, useRef } from "react";

import { parseTimeParam } from "../lib/format-time";
import { usePlayerControls } from "./usePlayerControls";

/**
 * Applies a `?t=` deep link once per distinct value. The page passes the raw
 * param (server components already have `searchParams`), which keeps this hook
 * free of `useSearchParams` and its Suspense requirement.
 *
 * This is the one effect-driven seek, and deliberately so: it reacts to the
 * URL, never to player state, so it cannot fight the clock.
 */
export function useInitialSeek(t: string | null | undefined): void {
  const controls = usePlayerControls();
  const applied = useRef<string | null>(null);

  useEffect(() => {
    if (!t || applied.current === t) return;
    applied.current = t;
    const ms = parseTimeParam(t);
    if (ms !== null) controls.seek(ms);
  }, [t, controls]);
}
