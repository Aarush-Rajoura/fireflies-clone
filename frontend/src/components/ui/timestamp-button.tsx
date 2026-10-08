import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { TextButton } from "./text-button";

/** "0:05", "12:04", "1:02:03". Kept here so the design system never imports a feature. */
export function formatTimestamp(ms: number): string {
  const total = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const ss = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export type TimestampButtonProps = {
  ms: number;
  onSeek: (ms: number) => void;
  /** Accessible name; defaults to "Jump to 12:04". */
  label?: string;
  /** Visible text when it differs from the plain clock, e.g. "00:00 – 10:12". */
  children?: ReactNode;
  className?: string;
};

/** A tabular-figure, link-style timestamp that seeks the player. */
export function TimestampButton({ ms, onSeek, label, children, className }: TimestampButtonProps) {
  const clock = formatTimestamp(ms);
  return (
    <TextButton
      onClick={() => onSeek(ms)}
      aria-label={label ?? `Jump to ${clock}`}
      className={cn("tnum shrink-0 whitespace-nowrap", className)}
    >
      {children ?? clock}
    </TextButton>
  );
}
