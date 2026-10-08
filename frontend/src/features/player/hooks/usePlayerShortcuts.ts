"use client";

import { useEffect } from "react";

import { usePlayerControls } from "./usePlayerControls";

const SKIP_SHORT_MS = 5_000;
const SKIP_LONG_MS = 10_000;

/** Typing surfaces own every key; interactive widgets own Space (it activates them). */
function isTypingTarget(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  return (
    el.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']") !== null
  );
}

function ownsSpace(el: Element | null): boolean {
  return (
    el instanceof HTMLElement &&
    el.closest(
      "button, a[href], summary, [role='button'], [role='menuitem'], [role='checkbox'], [role='switch'], [role='tab']",
    ) !== null
  );
}

/**
 * Page-wide player keys: Space/K play-pause, J/L ±10s, ←/→ ±5s.
 * Mount once per player (the notepad page), not per component.
 */
export function usePlayerShortcuts({ enabled = true }: { enabled?: boolean } = {}): void {
  const controls = usePlayerControls();

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // A focused widget (the seek slider, a menu) already handled the key.
      if (e.defaultPrevented) return;
      // Held Space would flicker play/pause on every auto-repeat.
      if (e.repeat && e.key === " ") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (isTypingTarget(target)) return;

      switch (e.key) {
        case " ":
          if (ownsSpace(target)) return;
          controls.toggle();
          break;
        case "k":
        case "K":
          controls.pause();
          break;
        case "j":
        case "J":
          controls.skip(-SKIP_LONG_MS);
          break;
        case "l":
        case "L":
          controls.skip(SKIP_LONG_MS);
          break;
        case "ArrowLeft":
          controls.skip(-SKIP_SHORT_MS);
          break;
        case "ArrowRight":
          controls.skip(SKIP_SHORT_MS);
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [controls, enabled]);
}
