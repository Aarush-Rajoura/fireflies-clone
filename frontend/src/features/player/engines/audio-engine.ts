import { clamp, clampRate, Emitter, type MediaEngine } from "./media-engine";
import { VirtualClockEngine } from "./virtual-clock-engine";

type AudioEngineOptions = {
  src: string;
  durationMs: number;
  /** Injection point for tests; defaults to a detached `new Audio()` (never rendered, so no native controls). */
  element?: HTMLMediaElement;
};

/**
 * Plays a meeting through an `<audio>` element, on the MEETING's timeline.
 *
 * The file and the meeting rarely agree on length, so:
 * - File SHORTER than the meeting: when the audio runs out, the timeline keeps
 *   advancing on an internal virtual clock (silence) up to `durationMs`, so
 *   transcript sync keeps working for the untranscoded tail. Seeking past the
 *   file's end lands on the virtual clock too; seeking back hands control to
 *   the audio again.
 * - File LONGER than the meeting: playback stops at `durationMs`.
 * - File fails to load: the engine degrades to the virtual clock for good.
 */
export class AudioEngine implements MediaEngine {
  private _durationMs: number;
  /** A seek target applied before metadata, re-checked once the file's length is known. */
  private pendingTargetMs: number | null = null;
  private readonly el: HTMLMediaElement;
  private readonly tail: VirtualClockEngine;
  private readonly emitter = new Emitter();
  private mode: "media" | "virtual" = "media";
  private failed = false;
  private playing = false;
  private _rate = 1;
  private boundaryTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private readonly unsubscribeTail: () => void;

  constructor({ src, durationMs, element }: AudioEngineOptions) {
    this._durationMs = Math.max(0, durationMs);
    this.el = element ?? new Audio();
    this.el.preload = "metadata";
    this.el.src = src;
    this.tail = new VirtualClockEngine({ durationMs: this.durationMs });
    this.unsubscribeTail = this.tail.subscribe(this.onTailChange);
    this.el.addEventListener("ended", this.onBoundary);
    this.el.addEventListener("error", this.onError);
    this.el.addEventListener("loadedmetadata", this.onMetadata);
    this.el.addEventListener("pause", this.onElementPause);
  }

  get durationMs(): number {
    return this._durationMs;
  }

  get currentMs(): number {
    if (this.mode === "virtual") return this.tail.currentMs;
    return clamp(this.el.currentTime * 1000, 0, this.durationMs);
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get rate(): number {
    return this._rate;
  }

  get volume(): number {
    return this.el.volume;
  }

  get muted(): boolean {
    return this.el.muted;
  }

  async play(): Promise<void> {
    if (this.destroyed || this.playing) return;
    if (this.currentMs >= this.durationMs) this.seek(0);
    this.playing = true;
    this.emitter.emit();
    if (this.mode === "virtual") {
      await this.tail.play();
      return;
    }
    this.scheduleBoundary();
    try {
      await this.el.play();
    } catch (error) {
      if (this.isBenignPlayRejection(error)) return;
      this.playing = false;
      this.clearBoundary();
      this.emitter.emit();
      throw error;
    }
  }

  pause(): void {
    if (this.destroyed || !this.playing) return;
    this.playing = false;
    this.clearBoundary();
    this.el.pause();
    this.tail.pause();
    this.emitter.emit();
  }

  seek(ms: number): void {
    if (this.destroyed) return;
    const target = clamp(ms, 0, this.durationMs);
    this.pendingTargetMs = null;
    if (this.failed || target >= this.mediaEndMs()) {
      this.enterTail(target);
    } else {
      this.tail.pause();
      this.mode = "media";
      this.el.currentTime = target / 1000;
      // Before metadata the file's end is unknown and the element would clamp a
      // past-the-end target to its own duration; remember it for onMetadata.
      if (!Number.isFinite(this.el.duration)) this.pendingTargetMs = target;
      if (this.playing) {
        this.scheduleBoundary();
        // Returning to the audio from the silent tail: the element was paused.
        if (this.el.paused) {
          this.el.play().catch((error: unknown) => {
            if (!this.isBenignPlayRejection(error)) this.pause();
          });
        }
      }
    }
    this.emitter.emit();
  }

  setDurationMs(ms: number): void {
    if (this.destroyed) return;
    const position = this.currentMs;
    this._durationMs = Math.max(0, ms);
    this.tail.setDurationMs(this.durationMs);
    if (position > this.durationMs) {
      this.seek(this.durationMs);
      return;
    }
    if (this.playing && this.mode === "media") this.scheduleBoundary();
    this.emitter.emit();
  }

  setRate(r: number): void {
    if (this.destroyed) return;
    this._rate = clampRate(r);
    this.el.playbackRate = this._rate;
    this.tail.setRate(this._rate);
    if (this.playing && this.mode === "media") this.scheduleBoundary();
    this.emitter.emit();
  }

  setVolume(v: number): void {
    if (this.destroyed) return;
    this.el.volume = clamp(v, 0, 1);
    this.emitter.emit();
  }

  setMuted(m: boolean): void {
    if (this.destroyed) return;
    this.el.muted = m;
    this.emitter.emit();
  }

  subscribe(listener: () => void): () => void {
    return this.emitter.subscribe(listener);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.playing = false;
    this.destroyed = true;
    this.clearBoundary();
    this.el.removeEventListener("ended", this.onBoundary);
    this.el.removeEventListener("error", this.onError);
    this.el.removeEventListener("loadedmetadata", this.onMetadata);
    this.el.removeEventListener("pause", this.onElementPause);
    this.el.pause();
    // Dropping the source and reloading aborts the fetch and frees the decoder.
    this.el.removeAttribute("src");
    this.el.load();
    this.unsubscribeTail();
    this.tail.destroy();
    this.emitter.clear();
  }

  /** Where the file runs out, on the meeting timeline; Infinity until metadata says otherwise. */
  private mediaEndMs(): number {
    const d = this.el.duration;
    return Number.isFinite(d) ? d * 1000 : Number.POSITIVE_INFINITY;
  }

  /**
   * A pending el.play() is rejected (AbortError) when we pause the element
   * ourselves, e.g. pause() or a seek into the silent tail while buffering.
   * Those must not flip the engine to paused while the tail keeps running.
   */
  private isBenignPlayRejection(error: unknown): boolean {
    if (!this.playing || this.mode !== "media") return true;
    return error instanceof Error && error.name === "AbortError";
  }

  private enterTail(atMs: number): void {
    this.clearBoundary();
    this.mode = "virtual";
    this.el.pause();
    this.tail.seek(atMs);
    if (this.playing) void this.tail.play();
  }

  /**
   * One timeout for the next boundary (file end or meeting end) instead of
   * polling. `ended` is a backstop, but it never fires for a file longer than
   * the meeting, and the element's clock can lag while buffering, so the
   * timer re-checks the real position before acting.
   */
  private scheduleBoundary(): void {
    this.clearBoundary();
    const boundary = Math.min(this.durationMs, this.mediaEndMs());
    const wait = Math.max(0, (boundary - this.currentMs) / this._rate);
    if (!Number.isFinite(wait)) return;
    this.boundaryTimer = setTimeout(this.onBoundary, wait);
  }

  private clearBoundary(): void {
    if (this.boundaryTimer !== null) clearTimeout(this.boundaryTimer);
    this.boundaryTimer = null;
  }

  private onBoundary = (): void => {
    this.boundaryTimer = null;
    if (!this.playing || this.mode !== "media") return;
    const pos = this.el.currentTime * 1000;
    if (pos >= this.durationMs) {
      this.el.pause();
      this.el.currentTime = this.durationMs / 1000;
      this.playing = false;
      this.emitter.emit();
    } else if (pos >= this.mediaEndMs() || this.el.ended) {
      this.enterTail(Math.min(this.mediaEndMs(), this.durationMs));
      this.emitter.emit();
    } else {
      this.scheduleBoundary();
    }
  };

  private onError = (): void => {
    if (this.destroyed) return;
    this.failed = true;
    this.enterTail(this.currentMs);
    this.emitter.emit();
  };

  /**
   * Pauses we did not ask for (OS media keys, unplugged headphones) must stop
   * the clock too, or the UI would claim to play while the audio sits still.
   * Our own pauses already cleared `playing` or left media mode before this
   * (asynchronous) event arrives.
   */
  private onElementPause = (): void => {
    // `paused` is re-checked because the event is queued: a pause()+play() in
    // one task delivers it after the element is already playing again.
    if (this.mode !== "media" || !this.playing || this.el.ended || !this.el.paused) return;
    this.playing = false;
    this.clearBoundary();
    this.emitter.emit();
  };

  private onMetadata = (): void => {
    const pending = this.pendingTargetMs;
    this.pendingTargetMs = null;
    if (pending !== null && this.mode === "media" && pending >= this.mediaEndMs()) {
      // A deep link past the file's end: resume the timeline there on the silent tail.
      this.enterTail(pending);
    } else if (this.playing && this.mode === "media") {
      // Duration just became known, so the file-end boundary can now be timed.
      this.scheduleBoundary();
    }
    this.emitter.emit();
  };

  /** The tail only stops on its own when it reaches the meeting's end. */
  private onTailChange = (): void => {
    if (this.mode !== "virtual" || !this.playing) return;
    if (!this.tail.isPlaying && this.tail.currentMs >= this.durationMs) {
      this.playing = false;
      this.emitter.emit();
    }
  };
}
