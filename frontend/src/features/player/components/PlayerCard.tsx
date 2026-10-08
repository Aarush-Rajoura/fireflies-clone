"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";

import { IconButton } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import { usePlayerClock, usePlayerClockSelector } from "../hooks/usePlayerClock";
import { usePlayerControls } from "../hooks/usePlayerControls";
import { usePlayerShortcuts } from "../hooks/usePlayerShortcuts";
import { formatClock } from "../lib/format-time";
import { Seekbar } from "./Seekbar";
import { SpeedMenu } from "./SpeedMenu";
import { VolumeControl } from "./VolumeControl";

const SKIP_MS = 15_000;

export type PlayerCardProps = {
  className?: string;
  /** Page-wide keyboard shortcuts; turn off if the page mounts `usePlayerShortcuts` itself. */
  shortcuts?: boolean;
};

/** The notepad's transport: seek bar on top, controls below. Must sit inside <PlayerProvider>. */
export function PlayerCard({ className, shortcuts = true }: PlayerCardProps) {
  const controls = usePlayerControls();
  usePlayerShortcuts({ enabled: shortcuts });

  return (
    <section
      aria-label="Media player"
      className={cn(
        "flex flex-col gap-2 rounded-card border border-subtle bg-surface-1 px-4 pb-2 pt-3",
        className,
      )}
    >
      <Seekbar />
      <div className="flex items-center gap-1">
        <IconButton
          size="sm"
          label="Back 15 seconds"
          icon={<RotateCcw strokeWidth={1.75} />}
          onClick={() => controls.skip(-SKIP_MS)}
        />
        <PlayPauseButton />
        <IconButton
          size="sm"
          label="Forward 15 seconds"
          icon={<RotateCw strokeWidth={1.75} />}
          onClick={() => controls.skip(SKIP_MS)}
        />
        <TimeReadout />
        <div className="ml-auto flex items-center gap-1">
          <SpeedMenu />
          <VolumeControl />
        </div>
      </div>
    </section>
  );
}

function PlayPauseButton() {
  const isPlaying = usePlayerClockSelector((c) => c.isPlaying);
  const { toggle } = usePlayerControls();
  return (
    <IconButton
      size="md"
      variant="primary"
      label={isPlaying ? "Pause" : "Play"}
      icon={isPlaying ? <Pause strokeWidth={1.75} /> : <Play strokeWidth={1.75} />}
      onClick={toggle}
      className="rounded-full"
    />
  );
}

function TimeReadout() {
  const { currentMs, durationMs } = usePlayerClock();
  return (
    <span className="tnum ml-2 text-meta text-secondary">
      <span className="text-primary">{formatClock(currentMs)}</span> / {formatClock(durationMs)}
    </span>
  );
}
