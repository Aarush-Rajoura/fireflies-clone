"use client";

import { useContext, useSyncExternalStore } from "react";

import { PlayerClockContext } from "../context";
import type { ClockStore, PlayerClock } from "../lib/clock-store";

function useClockStore(): ClockStore {
  const store = useContext(PlayerClockContext);
  if (!store) throw new Error("Player clock hooks must be used inside <PlayerProvider>.");
  return store;
}

/** The whole clock; re-renders ~10×/s while playing. Prefer a selector in hot lists. */
export function usePlayerClock(): PlayerClock {
  const store = useClockStore();
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/**
 * Re-renders only when the selected value changes, e.g.
 * `usePlayerClockSelector((c) => activeLineIndex(lines, c.currentMs))`.
 * The selector must return a primitive or a stable reference.
 */
export function usePlayerClockSelector<T>(selector: (clock: PlayerClock) => T): T {
  const store = useClockStore();
  const read = () => selector(store.get());
  return useSyncExternalStore(store.subscribe, read, read);
}

export function usePlayerTime(): number {
  return usePlayerClockSelector((c) => c.currentMs);
}
