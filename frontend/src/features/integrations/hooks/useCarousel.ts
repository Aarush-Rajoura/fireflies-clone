"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type FocusEvent } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia?.(REDUCED_MOTION);
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.(REDUCED_MOTION).matches ?? false;
}

export type CarouselState = {
  index: number;
  goTo: (index: number) => void;
  /** True while hovered or focused, or when the user prefers reduced motion. */
  paused: boolean;
  /** Spread on the carousel root: hover or focus inside stops the rotation. */
  pauseHandlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: () => void;
    onBlur: (e: FocusEvent<HTMLElement>) => void;
  };
};

/**
 * Index + auto-advance for a fixed set of slides. Rotation stops while the
 * user is reading or interacting (hover/focus) and never starts for people
 * who asked the OS for reduced motion.
 */
export function useCarousel(count: number, intervalMs = 7000): CarouselState {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Server render assumes reduced motion: nothing rotates before hydration.
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => true);
  const paused = hovered || focused || reduced;

  useEffect(() => {
    if (paused || count < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(timer);
  }, [paused, count, intervalMs]);

  const goTo = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  return {
    index,
    goTo,
    paused,
    pauseHandlers: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      },
    },
  };
}
