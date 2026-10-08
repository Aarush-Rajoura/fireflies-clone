import { Emitter } from "../engines/media-engine";

export type PlayerClock = {
  currentMs: number;
  durationMs: number;
  isPlaying: boolean;
  rate: number;
  volume: number;
  muted: boolean;
};

/**
 * The fast-changing half of the player, as an external store so components can
 * subscribe through `useSyncExternalStore` with a selector and re-render only
 * when the slice they read changes (e.g. the active transcript line index).
 */
export class ClockStore {
  private snapshot: PlayerClock;
  private readonly emitter = new Emitter();

  constructor(initial: PlayerClock) {
    this.snapshot = initial;
  }

  get = (): PlayerClock => this.snapshot;

  subscribe = (listener: () => void): (() => void) => this.emitter.subscribe(listener);

  set(next: PlayerClock): void {
    if (sameClock(this.snapshot, next)) return;
    this.snapshot = next;
    this.emitter.emit();
  }

  patch(partial: Partial<PlayerClock>): void {
    this.set({ ...this.snapshot, ...partial });
  }
}

function sameClock(a: PlayerClock, b: PlayerClock): boolean {
  return (
    a.currentMs === b.currentMs &&
    a.durationMs === b.durationMs &&
    a.isPlaying === b.isPlaying &&
    a.rate === b.rate &&
    a.volume === b.volume &&
    a.muted === b.muted
  );
}
