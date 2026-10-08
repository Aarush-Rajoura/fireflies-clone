"use client";

import { useEffect, type RefObject } from "react";

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  // The attribute check covers environments where isContentEditable is not computed.
  return (
    el.isContentEditable || el.closest("[contenteditable]:not([contenteditable='false'])") !== null
  );
}

/**
 * Ctrl/Cmd+K, except while typing in some other field: there the keystroke
 * belongs to that field (e.g. a link shortcut in an editor), not to us.
 */
export function isSearchShortcut(e: KeyboardEvent, search: HTMLElement | null): boolean {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "k")
    return false;
  return e.target === search || !isEditable(e.target);
}

/** Focuses (and selects) the search field on Ctrl/Cmd+K from anywhere in the app. */
export function useSearchShortcut(ref: RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isSearchShortcut(e, ref.current)) return;
      e.preventDefault();
      ref.current?.focus();
      ref.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ref]);
}
