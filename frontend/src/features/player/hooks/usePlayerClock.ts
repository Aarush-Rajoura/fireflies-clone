"use client";

import { useCallback, useContext, useSyncExternalStore } from "react";

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

export type ClockListener = (clock: PlayerClock) => void;

/**
 * Subscribe imperatively, for event-driven watchers that act on time without
 * rendering, e.g. pausing when a clip reaches its end. Start one from the
 * event handler that needs it and call the returned function to stop it.
 * The listener gets each published clock (~10/s while playing, plus every
 * play/pause/seek). Identity is stable.
 */
export function usePlayerClockWatch(): (listener: ClockListener) => () => void {
  const store = useClockStore();
  return useCallback(
    (listener: ClockListener) => store.subscribe(() => listener(store.get())),
    [store],
  );
}
