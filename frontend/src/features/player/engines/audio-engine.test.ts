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

  it("keeps playing on the tail when a seek past the file aborts a pending play()", async () => {
    const el = createStubAudio(10);
    let rejectPlay!: (e: unknown) => void;
    el.play = vi.fn(() => new Promise<void>((_, reject) => (rejectPlay = reject)));
    el.pause = vi.fn(() => rejectPlay(new DOMException("interrupted by pause", "AbortError")));
    const engine = new AudioEngine({ src: "/a.mp3", durationMs: 30_000, element: el });

    const pending = engine.play(); // still buffering
    engine.seek(20_000); // past the 10s file: enterTail() pauses the element
    await expect(pending).resolves.toBeUndefined();
    expect(engine.isPlaying).toBe(true);
    vi.advanceTimersByTime(1_000);
    expect(engine.currentMs).toBeCloseTo(21_000, -1);
    engine.destroy();
  });

  it("re-applies a past-the-end seek made before metadata on the tail clock", async () => {
    const el = createStubAudio(10, { metadata: false });
    const engine = new AudioEngine({ src: "/a.mp3", durationMs: 30_000, element: el });
    engine.seek(25_000); // e.g. ?t=25 on mount
    el.loadMetadata(); // the element clamped itself to 10s
    expect(engine.currentMs).toBe(25_000);
    await engine.play();
    vi.advanceTimersByTime(1_000);
    expect(engine.currentMs).toBeCloseTo(26_000, -1);
    engine.destroy();
  });

  it("ignores a queued pause event once the element is playing again", async () => {
    const el = createStubAudio(10);
    const engine = new AudioEngine({ src: "/a.mp3", durationMs: 10_000, element: el });
    await engine.play();
    engine.pause();
    await engine.play();
    el.dispatchEvent(new Event("pause")); // delivered late, element not paused
    expect(engine.isPlaying).toBe(true);
    engine.destroy();
  });

  it("stops the clock on an external pause (OS media keys)", async () => {
    const el = createStubAudio(10);
    const engine = new AudioEngine({ src: "/a.mp3", durationMs: 10_000, element: el });
    await engine.play();
    el.pause();
    el.dispatchEvent(new Event("pause"));
    expect(engine.isPlaying).toBe(false);
    engine.destroy();
  });

  it("changes duration in place without reloading the media", () => {
    const el = createStubAudio(60);
    const engine = new AudioEngine({ src: "/a.mp3", durationMs: 60_000, element: el });
    engine.seek(50_000);
    engine.setDurationMs(40_000);
    expect(engine.durationMs).toBe(40_000);
    expect(engine.currentMs).toBe(40_000);
    expect(el.load).not.toHaveBeenCalled();
    engine.destroy();
  });

  it("destroy drops the source and aborts the fetch", () => {
    const el = createStubAudio(10);
    const engine = new AudioEngine({ src: "/a.mp3", durationMs: 10_000, element: el });
    engine.destroy();
    expect(el.hasAttribute("src")).toBe(false);
    expect(el.load).toHaveBeenCalledTimes(1);
  });
});
