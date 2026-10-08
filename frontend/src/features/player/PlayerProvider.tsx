"use client";

import { useEffect, useEffectEvent, useState, type ReactNode } from "react";

import { PlayerClockContext, PlayerControlsContext } from "./context";
import { AudioEngine } from "./engines/audio-engine";
import type { CreateEngine } from "./engines/media-engine";
import { VirtualClockEngine } from "./engines/virtual-clock-engine";
import { PlayerRuntime } from "./lib/player-runtime";

export const defaultCreateEngine: CreateEngine = ({ mediaUrl, durationMs }) =>
  mediaUrl
    ? new AudioEngine({ src: mediaUrl, durationMs })
    : new VirtualClockEngine({ durationMs });

export type PlayerProviderProps = {
  mediaUrl?: string | null;
  durationMs: number;
  /** Swap the engine (tests, a future video engine). Changing it does not rebuild the engine. */
  createEngine?: CreateEngine;
  children: ReactNode;
};

export function PlayerProvider({
  mediaUrl = null,
  durationMs,
  createEngine = defaultCreateEngine,
  children,
}: PlayerProviderProps) {
  const [runtime] = useState(() => new PlayerRuntime(durationMs));
  const makeEngine = useEffectEvent(() => createEngine({ mediaUrl, durationMs }));

  // The engine lives in an effect, not render: `new Audio()` cannot run on the
  // server, and StrictMode's double mount must destroy what it creates. Only a
  // new media URL rebuilds it; duration changes are applied in place below.
  useEffect(() => {
    const engine = makeEngine();
    runtime.attach(engine);
    return () => runtime.detach(engine);
  }, [runtime, mediaUrl]);

  useEffect(() => {
    runtime.setDuration(durationMs);
  }, [runtime, durationMs]);

  return (
    <PlayerControlsContext.Provider value={runtime.controls}>
      <PlayerClockContext.Provider value={runtime.clock}>{children}</PlayerClockContext.Provider>
    </PlayerControlsContext.Provider>
  );
}
