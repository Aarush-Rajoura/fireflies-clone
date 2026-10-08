"use client";

import { createContext } from "react";

import type { ClockStore } from "./lib/clock-store";
import type { PlayerControls } from "./lib/player-runtime";

/** Stable for the provider's lifetime: consumers that only act never re-render on ticks. */
export const PlayerControlsContext = createContext<PlayerControls | null>(null);

/** Carries the clock STORE (also stable); hooks subscribe to it for the changing values. */
export const PlayerClockContext = createContext<ClockStore | null>(null);
