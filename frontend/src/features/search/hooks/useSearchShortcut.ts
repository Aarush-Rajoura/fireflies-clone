"use client";

import { useEffect, type RefObject } from "react";

// Inputs that take typed text; a focused checkbox or range should not swallow the shortcut.
const TEXT_INPUT_TYPES = new Set(["text", "search", "email", "url", "tel", "password", "number"]);

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(el.type);
  if (el instanceof HTMLTextAreaElement) return true;
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
