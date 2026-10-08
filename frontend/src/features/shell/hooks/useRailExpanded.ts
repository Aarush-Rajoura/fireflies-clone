"use client";

import { useSyncExternalStore } from "react";

const KEY = "ff.rail.expanded";

const listeners = new Set<() => void>();
// Fallback when storage is blocked (private mode), so the toggle still works for the session.
let memory: boolean | null = null;
// Only a user toggle animates the width; restoring the stored state after
// hydration must snap, or every page load would show the rail sliding open.
let toggled = false;

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
  toggled = true;
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

const readToggled = () => toggled;
const never = () => false;

export type RailState = {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  /** True once the user has toggled the rail in this session: only then animate. */
  animate: boolean;
};

/** Collapsed on the server and first paint; the stored preference applies after hydration. */
export function useRailExpanded(): RailState {
  const expanded = useSyncExternalStore(subscribe, read, never);
  const animate = useSyncExternalStore(subscribe, readToggled, never);
  return { expanded, setExpanded: write, animate };
}
