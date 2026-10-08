import { clamp, type MediaEngine } from "../engines/media-engine";
import { ClockStore } from "./clock-store";

export type PlayerControls = {
  play(): void;
  pause(): void;
  toggle(): void;
  seek(ms: number): void;
  setRate(r: number): void;
  skip(deltaMs: number): void;
  setVolume(v: number): void;
  setMuted(m: boolean): void;
  toggleMute(): void;
};

/** ~10 repaints a second: smooth enough for a playhead, cheap enough for a long transcript. */
export const PUBLISH_INTERVAL_MS = 100;

type Settings = {
  positionMs: number;
  rate: number;
  volume: number;
  muted: boolean;
  playing: boolean;
};

/**
 * Bridges an engine to React without living in React state.
 *
 * `controls` is built once and calls the engine directly, so a seek is a plain
 * function call: nothing waits on a render or on an effect noticing a changed
 * value. The clock store is fed from engine events (immediately) plus a
 * requestAnimationFrame loop while playing (throttled to PUBLISH_INTERVAL_MS).
 *
 * Calls made while no engine is attached (child effects run before the
 * provider's, e.g. a `?t=` seek on mount) are kept as settings and applied
 * when one attaches; the same settings carry position/rate/volume and
 * whether it was playing across an engine swap (new media URL).
 */
export class PlayerRuntime {
  readonly clock: ClockStore;
  readonly controls: PlayerControls;
  private engine: MediaEngine | null = null;
  private settings: Settings = {
    positionMs: 0,
    rate: 1,
    volume: 1,
    muted: false,
    playing: false,
  };
  private unsubscribe: (() => void) | null = null;
  private frame: number | null = null;
  private lastPublishAt = 0;

  constructor(durationMs: number) {
    this.clock = new ClockStore({
      currentMs: 0,
      durationMs,
      isPlaying: false,
      rate: 1,
      volume: 1,
      muted: false,
    });
    this.controls = Object.freeze(this.buildControls());
  }

  attach(engine: MediaEngine): void {
    if (this.engine) this.detach(this.engine);
    const { positionMs, rate, volume, muted, playing } = this.settings;
    engine.setRate(rate);
    engine.setVolume(volume);
    engine.setMuted(muted);
    engine.seek(positionMs);
    this.engine = engine;
    this.unsubscribe = engine.subscribe(this.publish);
    this.publish();
    // Autoplay-policy rejections are expected; the engine has already reset isPlaying.
    if (playing) engine.play().catch(() => undefined);
  }

  detach(engine: MediaEngine): void {
    if (this.engine !== engine) return;
    this.settings = {
      positionMs: engine.currentMs,
      rate: engine.rate,
      volume: engine.volume,
      muted: engine.muted,
      playing: engine.isPlaying,
    };
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.stopLoop();
    engine.destroy();
    this.engine = null;
    this.clock.patch({ isPlaying: false });
  }

  /** Applied in place: a refined duration must not tear down (and reload) the media. */
  setDuration(durationMs: number): void {
    if (this.engine) return this.engine.setDurationMs(durationMs);
    const positionMs = Math.min(this.settings.positionMs, Math.max(0, durationMs));
    this.settings = { ...this.settings, positionMs };
    this.clock.patch({ durationMs, currentMs: positionMs });
  }

  private publish = (): void => {
    const e = this.engine;
    if (!e) return;
    this.lastPublishAt = performance.now();
    this.clock.set({
      currentMs: e.currentMs,
      durationMs: e.durationMs,
      isPlaying: e.isPlaying,
      rate: e.rate,
      volume: e.volume,
      muted: e.muted,
    });
    if (e.isPlaying) this.startLoop();
    else this.stopLoop();
  };

  private tick = (): void => {
    this.frame = null;
    if (!this.engine?.isPlaying) return;
    if (performance.now() - this.lastPublishAt >= PUBLISH_INTERVAL_MS) this.publish();
    else this.startLoop();
  };

  private startLoop(): void {
    if (this.frame === null) this.frame = requestAnimationFrame(this.tick);
  }

  private stopLoop(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  private buildControls(): PlayerControls {
    const position = () => this.engine?.currentMs ?? this.settings.positionMs;
    const seek = (ms: number) => {
      if (this.engine) return this.engine.seek(ms);
      const positionMs = clamp(ms, 0, this.clock.get().durationMs);
      this.settings = { ...this.settings, positionMs };
      this.clock.patch({ currentMs: positionMs });
    };
    const play = () => {
      // Autoplay-policy rejections are expected; the engine has already reset isPlaying.
      this.engine?.play().catch(() => undefined);
    };
    const pause = () => this.engine?.pause();
    const setMuted = (muted: boolean) => {
      if (this.engine) return this.engine.setMuted(muted);
      this.settings = { ...this.settings, muted };
      this.clock.patch({ muted });
    };
    return {
      play,
      pause,
      toggle: () => (this.engine?.isPlaying ? pause() : play()),
      seek,
      skip: (deltaMs) => seek(position() + deltaMs),
      setRate: (rate) => {
        if (this.engine) return this.engine.setRate(rate);
        this.settings = { ...this.settings, rate };
        this.clock.patch({ rate });
      },
      setVolume: (volume) => {
        if (this.engine) return this.engine.setVolume(volume);
        this.settings = { ...this.settings, volume };
        this.clock.patch({ volume });
      },
      setMuted,
      toggleMute: () => setMuted(!(this.engine?.muted ?? this.settings.muted)),
    };
  }
}
