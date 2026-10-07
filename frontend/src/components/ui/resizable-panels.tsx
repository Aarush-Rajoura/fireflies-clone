"use client";

import { useCallback, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export function clampSize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Storage can throw (Safari private mode, quota, disabled) — sizing must never break the page. */
export function readStoredSize(key: string): number | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  } catch {
    return undefined;
  }
}

const noopSubscribe = () => () => {};

function writeStoredSize(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(Math.round(value * 10) / 10));
  } catch {
    // Persistence is a nicety; ignore failures.
  }
}

export type ResizablePanelsProps = {
  start: ReactNode;
  end: ReactNode;
  /** Size of the start panel, in percent of the container. */
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  /** When set, the size survives reloads under this localStorage key. */
  storageKey?: string;
  /** Accessible name for the drag handle. */
  label?: string;
  step?: number;
  className?: string;
};

export function ResizablePanels({
  start,
  end,
  defaultSize = 50,
  minSize = 20,
  maxSize = 80,
  storageKey,
  label = "Resize panels",
  step = 2,
  className,
}: ResizablePanelsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [chosen, setChosen] = useState<number | undefined>(undefined);
  // Server snapshot is "nothing stored", so hydration matches; the client then
  // re-renders with the persisted size.
  const stored = useSyncExternalStore(
    noopSubscribe,
    () => (storageKey ? readStoredSize(storageKey) : undefined),
    () => undefined,
  );
  const size = clampSize(chosen ?? stored ?? defaultSize, minSize, maxSize);

  const commit = useCallback(
    (next: number) => {
      const clamped = clampSize(next, minSize, maxSize);
      setChosen(clamped);
      if (storageKey) writeStoredSize(storageKey, clamped);
    },
    [minSize, maxSize, storageKey],
  );

  const fromPointer = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    commit(((clientX - rect.left) / rect.width) * 100);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: size - step,
      ArrowRight: size + step,
      Home: minSize,
      End: maxSize,
    };
    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    commit(next);
  };

  return (
    <div ref={containerRef} className={cn("flex h-full min-h-0 w-full", dragging && "select-none", className)}>
      <div className="min-w-0 overflow-auto" style={{ flexBasis: `${size}%`, flexShrink: 0 }}>
        {start}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuenow={Math.round(size)}
        aria-valuemin={minSize}
        aria-valuemax={maxSize}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (dragging) fromPointer(e.clientX);
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          setDragging(false);
        }}
        onDoubleClick={() => commit(defaultSize)}
        className={cn(
          "relative w-px shrink-0 cursor-col-resize touch-none bg-divider transition-colors duration-fast hover:bg-accent focus-visible:bg-accent",
          dragging && "bg-accent",
        )}
      >
        {/* Wider invisible hit area; the visible line stays 1px. */}
        <span aria-hidden className="absolute inset-y-0 -left-1.5 -right-1.5" />
      </div>
      <div className="min-w-0 flex-1 overflow-auto">{end}</div>
    </div>
  );
}
