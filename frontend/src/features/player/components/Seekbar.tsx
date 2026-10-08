"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { cn } from "@/lib/utils/cn";

import { usePlayerClock } from "../hooks/usePlayerClock";
import { usePlayerControls } from "../hooks/usePlayerControls";
import { formatClock } from "../lib/format-time";

const KEY_STEP_MS = 5_000;
const PAGE_STEP_MS = 15_000;

/**
 * Click or drag anywhere on the track; keyboard as a WAI-ARIA slider.
 * While dragging, the thumb follows a local preview and the seek is committed
 * on release, so the audio element isn't asked to seek on every pointermove.
 */
export function Seekbar({ className }: { className?: string }) {
  const { currentMs, durationMs } = usePlayerClock();
  const controls = usePlayerControls();
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragMs, setDragMs] = useState<number | null>(null);
  const dragging = useRef(false);

  const shownMs = dragMs ?? currentMs;
  const pct = durationMs > 0 ? Math.min(100, (shownMs / durationMs) * 100) : 0;

  const msAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * durationMs);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.currentTarget.focus();
    dragging.current = true;
    setDragMs(msAt(e.clientX));
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) setDragMs(msAt(e.clientX));
  };

  // A ref, not `dragMs`, guards this: releasing capture on pointerup fires
  // lostpointercapture before React re-renders, and it must be a no-op then.
  const endDrag = (e: PointerEvent<HTMLDivElement>, commit: boolean) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (commit) controls.seek(msAt(e.clientX));
    setDragMs(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = {
      ArrowLeft: currentMs - KEY_STEP_MS,
      ArrowDown: currentMs - KEY_STEP_MS,
      ArrowRight: currentMs + KEY_STEP_MS,
      ArrowUp: currentMs + KEY_STEP_MS,
      PageDown: currentMs - PAGE_STEP_MS,
      PageUp: currentMs + PAGE_STEP_MS,
      Home: 0,
      End: durationMs,
    };
    const target = steps[e.key];
    if (target === undefined) return;
    // Marks the event handled so the page-wide shortcuts don't skip a second time.
    e.preventDefault();
    controls.seek(target);
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={durationMs}
      aria-valuenow={Math.round(shownMs)}
      aria-valuetext={`${formatClock(shownMs)} of ${formatClock(durationMs)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e, true)}
      onPointerCancel={(e) => endDrag(e, false)}
      onLostPointerCapture={(e) => endDrag(e, false)}
      onKeyDown={onKeyDown}
      className={cn(
        "group relative flex h-4 cursor-pointer touch-none select-none items-center rounded-full outline-none focus-visible:shadow-focus",
        className,
      )}
    >
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-surface-3 transition-[height] duration-fast group-hover:h-1.5">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-accent",
            // Interpolates between the ~10Hz clock updates; off while dragging so the fill tracks the pointer.
            dragMs === null && "transition-[width] duration-100 ease-linear",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute size-3 -translate-x-1/2 rounded-full bg-accent opacity-0 shadow-raised transition-opacity duration-fast group-hover:opacity-100 group-focus-visible:opacity-100",
          dragMs !== null && "opacity-100",
        )}
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}
