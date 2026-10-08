import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PlayerProvider,
  VirtualClockEngine,
  usePlayerClock,
  usePlayerControls,
  type PlayerClock,
  type PlayerControls,
} from "@/features/player";

import { useClipPlayer } from "./useClipPlayer";

function fakePlayerTimers() {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
      "Date",
    ],
  });
}

type Api = ReturnType<typeof useClipPlayer> & { controls: PlayerControls; clock: PlayerClock };

function setup() {
  const api = {} as Api;
  function Probe() {
    Object.assign(api, useClipPlayer(), { controls: usePlayerControls(), clock: usePlayerClock() });
    return null;
  }
  render(
    <PlayerProvider
      durationMs={60_000}
      createEngine={({ durationMs }) => new VirtualClockEngine({ durationMs })}
    >
      <Probe />
    </PlayerProvider>,
  );
  return api;
}

/** Advance in clock-publish-sized steps so each frame's update is flushed. */
function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) act(() => vi.advanceTimersByTime(100));
}

const clip = { id: 1, start_ms: 10_000, end_ms: 14_000 };

describe("useClipPlayer", () => {
  beforeEach(() => fakePlayerTimers());
  afterEach(() => vi.useRealTimers());

  it("seeks to the start, plays, and pauses at the clip's end", () => {
    const api = setup();
    act(() => api.play(clip));
    expect(api.clock.isPlaying).toBe(true);
    expect(api.clock.currentMs).toBe(10_000);
    expect(api.playingId).toBe(1);

    advance(3_000);
    expect(api.clock.isPlaying).toBe(true);

    advance(2_000);
    expect(api.clock.isPlaying).toBe(false);
    // Stopped within one clock publish of the end, not at the end of the meeting.
    expect(api.clock.currentMs).toBeGreaterThanOrEqual(14_000);
    expect(api.clock.currentMs).toBeLessThan(14_250);
    expect(api.playingId).toBeNull();

    // The watcher is gone: playing on from here is not stopped again.
    act(() => api.controls.play());
    advance(2_000);
    expect(api.clock.isPlaying).toBe(true);
  });

  it("lets go without pausing when the user seeks elsewhere mid-clip", () => {
    const api = setup();
    act(() => api.play(clip));
    advance(1_000);
    act(() => api.controls.seek(30_000));
    expect(api.playingId).toBeNull();
    advance(6_000);
    expect(api.clock.isPlaying).toBe(true);
    expect(api.clock.currentMs).toBeGreaterThan(35_000);
  });

  it("lets go when the user pauses, and stop() pauses an active clip", () => {
    const api = setup();
    act(() => api.play(clip));
    advance(500);
    act(() => api.controls.pause());
    expect(api.playingId).toBeNull();

    act(() => api.play(clip));
    advance(500);
    act(() => api.stop());
    expect(api.clock.isPlaying).toBe(false);
    expect(api.playingId).toBeNull();
  });

  it("a wall-clock backstop ends the clip when no clock publishes arrive (background tab)", () => {
    vi.useRealTimers();
    // Animation frames left real (they never run inside advanceTimersByTime), like a hidden tab.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance", "Date"] });
    const api = setup();
    act(() => api.play(clip));
    act(() => vi.advanceTimersByTime(3_900));
    expect(api.playingId).toBe(1);
    act(() => vi.advanceTimersByTime(400));
    expect(api.playingId).toBeNull();
    expect(api.clock.isPlaying).toBe(false);
    // Paused within the grace period of the end, not left running.
    expect(api.clock.currentMs).toBeGreaterThanOrEqual(14_000);
    expect(api.clock.currentMs).toBeLessThanOrEqual(14_300);
  });

  it("the backstop follows the playback rate", () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance", "Date"] });
    const api = setup();
    act(() => api.controls.setRate(2));
    act(() => api.play(clip));
    act(() => vi.advanceTimersByTime(2_300));
    expect(api.playingId).toBeNull();
    expect(api.clock.isPlaying).toBe(false);
  });

  it("the backstop is cleared when the user takes over", () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance", "Date"] });
    const api = setup();
    act(() => api.play(clip));
    act(() => api.controls.seek(30_000));
    act(() => vi.advanceTimersByTime(5_000));
    expect(api.clock.isPlaying).toBe(true);
  });

  it("pauses an active clip on unmount only when asked to", () => {
    let api = {} as ReturnType<typeof useClipPlayer> & { clock: PlayerClock };
    function Probe({ pause }: { pause: boolean }) {
      Object.assign(api, useClipPlayer({ pauseOnUnmount: pause }));
      return null;
    }
    function Clock() {
      api.clock = usePlayerClock();
      return null;
    }
    const engineFactory = ({ durationMs }: { durationMs: number }) =>
      new VirtualClockEngine({ durationMs });
    for (const pause of [true, false]) {
      api = {} as typeof api;
      const view = render(
        <PlayerProvider durationMs={60_000} createEngine={engineFactory}>
          <Clock />
          <Probe pause={pause} />
        </PlayerProvider>,
      );
      act(() => api.play(clip));
      view.rerender(
        <PlayerProvider durationMs={60_000} createEngine={engineFactory}>
          <Clock />
        </PlayerProvider>,
      );
      expect(api.clock.isPlaying).toBe(!pause);
      view.unmount();
    }
  });

  it("playing another clip replaces the first watcher", () => {
    const api = setup();
    act(() => api.play(clip));
    advance(500);
    act(() => api.play({ id: 2, start_ms: 40_000, end_ms: 43_000 }));
    expect(api.playingId).toBe(2);
    advance(4_000);
    expect(api.clock.isPlaying).toBe(false);
    expect(api.clock.currentMs).toBeGreaterThanOrEqual(43_000);
    expect(api.clock.currentMs).toBeLessThan(43_250);
  });
});
