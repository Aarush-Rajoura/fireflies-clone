"use client";

import { useContext } from "react";

import { PlayerControlsContext } from "../context";
import type { PlayerControls } from "../lib/player-runtime";

/** Play/pause/seek functions. Identity is stable, so it is safe in deps and memoised children. */
export function usePlayerControls(): PlayerControls {
  const controls = useContext(PlayerControlsContext);
  if (!controls) throw new Error("usePlayerControls must be used inside <PlayerProvider>.");
  return controls;
}
