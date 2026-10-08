import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installFakePlayerTimers } from "../testing/fake-timers";
import { createStubAudio } from "../testing/stub-audio";
import { AudioEngine } from "./audio-engine";

describe("AudioEngine timeline vs. file length", () => {
  beforeEach(() => installFakePlayerTimers());
  afterEach(() => vi.useRealTimers());

  it("keeps advancing on a silent clock when the file is shorter than the meeting", async () => {
    const el = createStubAudio(10); // 10s file, 30s meeting
    const engine = new AudioEngine({ src: "/a.mp3", durationMs: 30_000, element: el });
    await engine.play();
    vi.advanceTimersByTime(15_000);
    expect(engine.isPlaying).toBe(true);
    expect(engine.currentMs).toBeCloseTo(15_000, -1);
    expect(el.pause).toHaveBeenCalled();

    vi.advanceTimersByTime(20_000);
    expect(engine.currentMs).toBe(30_000);
    expect(engine.isPlaying).toBe(false);
    engine.destroy();
  });

  it("hands back to the audio when seeking from the tail into the file", async () => {
    const el = createStubAudio(10);
    const engine = new AudioEngine({ src: "/a.mp3", durationMs: 30_000, element: el });
    engine.seek(20_000);
    await engine.play();
    vi.advanceTimersByTime(1_000);
    engine.seek(2_000);
    expect(el.currentTime).toBe(2);
    expect(el.paused).toBe(false);
    vi.advanceTimersByTime(1_000);
    expect(engine.currentMs).toBeCloseTo(3_000, -1);
    engine.destroy();
  });

  it("stops at the meeting's end when the file is longer", async () => {
    const el = createStubAudio(120);
    const engine = new AudioEngine({ src: "/a.mp3", durationMs: 30_000, element: el });
    await engine.play();
    vi.advanceTimersByTime(40_000);
    expect(engine.currentMs).toBe(30_000);
    expect(engine.isPlaying).toBe(false);
    expect(el.paused).toBe(true);
    engine.destroy();
  });

  it("resets isPlaying and rejects when the browser blocks play()", async () => {
    const el = createStubAudio(10);
    el.play = vi.fn(() => Promise.reject(new DOMException("blocked", "NotAllowedError")));
    const engine = new AudioEngine({ src: "/a.mp3", durationMs: 10_000, element: el });
    await expect(engine.play()).rejects.toThrow("blocked");
    expect(engine.isPlaying).toBe(false);
    engine.destroy();
  });

  it("falls back to the virtual clock when the media errors", async () => {
    const el = createStubAudio(10);
    const engine = new AudioEngine({ src: "/a.mp3", durationMs: 10_000, element: el });
    el.dispatchEvent(new Event("error"));
    await engine.play();
    vi.advanceTimersByTime(2_000);
    expect(engine.currentMs).toBeCloseTo(2_000, -1);
    engine.destroy();
  });
});
