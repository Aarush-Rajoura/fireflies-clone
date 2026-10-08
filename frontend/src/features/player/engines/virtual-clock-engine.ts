import { clamp, clampRate, Emitter, type MediaEngine } from "./media-engine";

/**
 * A silent clock for meetings without media.
 *
 * Position is DERIVED from an anchor (`anchorMs` at `anchorAt`) rather than
 * accumulated per frame, so a throttled or backgrounded tab never loses time:
 * whenever anyone reads `currentMs` it is exact. The only timer is a single
 * timeout for the moment playback reaches the end; the UI's ~10Hz repaint is
 * the provider's job, not the engine's.
 */
export class VirtualClockEngine implements MediaEngine {
  private _durationMs: number;
  private anchorMs = 0;
  private anchorAt = 0;
  private playing = false;
  private _rate = 1;
  private _volume = 1;
  private _muted = false;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private readonly emitter = new Emitter();

  constructor({ durationMs }: { durationMs: number }) {
    this._durationMs = Math.max(0, durationMs);
  }

  get durationMs(): number {
    return this._durationMs;
  }

  setDurationMs(ms: number): void {
    if (this.destroyed) return;
    this.rebase();
    this._durationMs = Math.max(0, ms);
    this.anchorMs = Math.min(this.anchorMs, this._durationMs);
    if (this.playing) this.scheduleEnd();
    this.emitter.emit();
  }

  get currentMs(): number {
    if (!this.playing) return this.anchorMs;
    return clamp(this.anchorMs + (now() - this.anchorAt) * this._rate, 0, this.durationMs);
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get rate(): number {
    return this._rate;
  }

  get volume(): number {
    return this._volume;
  }

  get muted(): boolean {
    return this._muted;
  }

  play(): Promise<void> {
    if (this.destroyed || this.playing) return Promise.resolve();
    // Pressing play at the end restarts, as every media player does.
    if (this.anchorMs >= this.durationMs) this.anchorMs = 0;
    this.anchorAt = now();
    this.playing = true;
    this.scheduleEnd();
    this.emitter.emit();
    return Promise.resolve();
  }

  pause(): void {
    if (this.destroyed || !this.playing) return;
    this.rebase();
    this.playing = false;
    this.clearEnd();
    this.emitter.emit();
  }

  seek(ms: number): void {
    if (this.destroyed) return;
    this.anchorMs = clamp(ms, 0, this.durationMs);
    this.anchorAt = now();
    if (this.playing) this.scheduleEnd();
    this.emitter.emit();
  }

  setRate(r: number): void {
    if (this.destroyed) return;
    this.rebase();
    this._rate = clampRate(r);
    if (this.playing) this.scheduleEnd();
    this.emitter.emit();
  }

  setVolume(v: number): void {
    if (this.destroyed) return;
    this._volume = clamp(v, 0, 1);
    this.emitter.emit();
  }

  setMuted(m: boolean): void {
    if (this.destroyed) return;
    this._muted = m;
    this.emitter.emit();
  }

  subscribe(listener: () => void): () => void {
    return this.emitter.subscribe(listener);
  }

  destroy(): void {
    this.rebase();
    this.playing = false;
    this.destroyed = true;
    this.clearEnd();
    this.emitter.clear();
  }

  /** Folds elapsed play time into the anchor so rate/pause changes apply from "now". */
  private rebase(): void {
    this.anchorMs = this.currentMs;
    this.anchorAt = now();
  }

  private scheduleEnd(): void {
    this.clearEnd();
    const remaining = (this.durationMs - this.anchorMs) / this._rate;
    this.endTimer = setTimeout(() => this.finish(), Math.max(0, remaining));
  }

  private finish(): void {
    this.endTimer = null;
    // Timers can fire early relative to the clock; only stop once truly at the end.
    if (this.currentMs < this.durationMs) {
      this.rebase();
      this.scheduleEnd();
      return;
    }
    this.anchorMs = this.durationMs;
    this.playing = false;
    this.emitter.emit();
  }

  private clearEnd(): void {
    if (this.endTimer !== null) clearTimeout(this.endTimer);
    this.endTimer = null;
  }
}

function now(): number {
  return performance.now();
}
