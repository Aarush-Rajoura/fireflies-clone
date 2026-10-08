"use client";

import { useSyncExternalStore } from "react";

const KEY = "ff.rail.expanded";

const listeners = new Set<() => void>();
// Fallback when storage is blocked (private mode), so the toggle still works for the session.
let memory: boolean | null = null;

function read(): boolean {
  if (memory !== null) return memory;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function write(expanded: boolean) {
  memory = expanded;
  try {
    window.localStorage.setItem(KEY, expanded ? "1" : "0");
  } catch {
    // Storage unavailable: the in-memory value still applies.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Collapsed on the server and first paint; the stored preference applies after hydration. */
export function useRailExpanded(): [boolean, (expanded: boolean) => void] {
  const expanded = useSyncExternalStore(subscribe, read, () => false);
  return [expanded, write];
}
