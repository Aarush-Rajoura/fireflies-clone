/**
 * The one playback contract. Anything that can play a meeting's timeline
 * (real audio, a virtual clock, a future video element) implements this, and
 * nothing above the provider knows which one it got.
 *
 * Times are integer-ish milliseconds on the MEETING's timeline (0..durationMs),
 * never the media file's: a file shorter or longer than the meeting must not
 * shift where transcript lines sit.
 */
export interface MediaEngine {
  play(): Promise<void>;
  pause(): void;
  seek(ms: number): void;
  setRate(r: number): void;
  readonly currentMs: number;
  readonly durationMs: number;
  readonly isPlaying: boolean;
  /** Fires on discrete changes (play, pause, seek, rate, volume, reaching the end), not per frame. */
  subscribe(listener: () => void): () => void;
  destroy(): void;

  readonly rate: number;
  readonly volume: number;
  readonly muted: boolean;
  setVolume(v: number): void;
  setMuted(m: boolean): void;
  /** The meeting's length can be refined after load; this must not reload media. */
  setDurationMs(ms: number): void;
}

export type CreateEngineArgs = { mediaUrl: string | null; durationMs: number };
export type CreateEngine = (args: CreateEngineArgs) => MediaEngine;

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Rates outside this band are unusable for speech and some browsers throw on them. */
export function clampRate(r: number): number {
  return clamp(r, 0.25, 4);
}

/** Tiny listener set shared by the engines. */
export class Emitter {
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(): void {
    // Copy so a listener that unsubscribes mid-emit doesn't skip its neighbour.
    for (const l of [...this.listeners]) l();
  }

  clear(): void {
    this.listeners.clear();
  }
}
