"use client";

import { Volume1, Volume2, VolumeX } from "lucide-react";

import { IconButton } from "@/components/ui";

import { usePlayerClockSelector } from "../hooks/usePlayerClock";
import { usePlayerControls } from "../hooks/usePlayerControls";

export function VolumeControl() {
  const volume = usePlayerClockSelector((c) => c.volume);
  const muted = usePlayerClockSelector((c) => c.muted);
  const { setVolume, setMuted, toggleMute } = usePlayerControls();

  const silent = muted || volume === 0;
  const Icon = silent ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="flex items-center gap-1">
      <IconButton
        size="sm"
        label={silent ? "Unmute" : "Mute"}
        icon={<Icon strokeWidth={1.75} />}
        onClick={toggleMute}
      />
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={silent ? 0 : volume}
        aria-label="Volume"
        aria-valuetext={`${Math.round((silent ? 0 : volume) * 100)}%`}
        onChange={(e) => {
          const v = Number(e.target.value);
          setVolume(v);
          // Dragging the slider up is an obvious "I want sound" gesture.
          if (muted && v > 0) setMuted(false);
        }}
        className="h-1 w-20 cursor-pointer accent-accent"
      />
    </div>
  );
}
