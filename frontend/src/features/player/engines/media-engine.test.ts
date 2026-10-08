import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installFakePlayerTimers } from "../testing/fake-timers";
import { createStubAudio } from "../testing/stub-audio";
import { AudioEngine } from "./audio-engine";
import type { MediaEngine } from "./media-engine";
import { VirtualClockEngine } from "./virtual-clock-engine";

const DURATION = 60_000;

/** Both engines must be indistinguishable through the interface (Liskov). */
const engines: Array<[string, () => MediaEngine]> = [
  ["VirtualClockEngine", () => new VirtualClockEngine({ durationMs: DURATION })],
  [
    "AudioEngine",
    () =>
      new AudioEngine({
        src: "/a.mp3",
        durationMs: DURATION,
        element: createStubAudio(DURATION / 1000),
      }),
  ],
];

describe.each(engines)("%s (MediaEngine contract)", (_name, make) => {
  let engine: MediaEngine;

  beforeEach(() => {
    installFakePlayerTimers();
    engine = make();
  });

  afterEach(() => {
    engine.destroy();
    vi.useRealTimers();
  });

  it("starts paused at 0 with the meeting's duration", () => {
    expect(engine.currentMs).toBe(0);
    expect(engine.durationMs).toBe(DURATION);
    expect(engine.isPlaying).toBe(false);
  });

  it("seek sets currentMs", () => {
    engine.seek(12_345);
    expect(engine.currentMs).toBe(12_345);
  });

  it("play advances time", async () => {
    await engine.play();
    expect(engine.isPlaying).toBe(true);
    vi.advanceTimersByTime(1_000);
    expect(engine.currentMs).toBeCloseTo(1_000, -1);
  });

  it("pause stops time", async () => {
    await engine.play();
    vi.advanceTimersByTime(1_000);
    engine.pause();
    const at = engine.currentMs;
    vi.advanceTimersByTime(5_000);
    expect(engine.isPlaying).toBe(false);
    expect(engine.currentMs).toBe(at);
  });

  it("rate 2x doubles speed", async () => {
    engine.setRate(2);
    expect(engine.rate).toBe(2);
    await engine.play();
    vi.advanceTimersByTime(1_000);
    expect(engine.currentMs).toBeCloseTo(2_000, -1);
  });

  it("clamps seeks to [0, duration]", () => {
    engine.seek(-500);
    expect(engine.currentMs).toBe(0);
    engine.seek(DURATION + 10_000);
    expect(engine.currentMs).toBe(DURATION);
  });

  it("stops at the end and restarts from 0 on the next play", async () => {
    engine.seek(DURATION - 1_000);
    await engine.play();
    vi.advanceTimersByTime(3_000);
    expect(engine.currentMs).toBe(DURATION);
    expect(engine.isPlaying).toBe(false);
    await engine.play();
    expect(engine.currentMs).toBe(0);
    expect(engine.isPlaying).toBe(true);
  });

  it("notifies subscribers until they unsubscribe", async () => {
    const listener = vi.fn();
    const unsubscribe = engine.subscribe(listener);
    engine.seek(1_000);
    await engine.play();
    engine.pause();
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    engine.seek(2_000);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("keeps volume and mute settings", () => {
    engine.setVolume(0.4);
    engine.setMuted(true);
    expect(engine.volume).toBeCloseTo(0.4);
    expect(engine.muted).toBe(true);
  });

  it("destroy stops playback and leaves no timers behind", async () => {
    const listener = vi.fn();
    engine.subscribe(listener);
    await engine.play();
    engine.destroy();
    expect(vi.getTimerCount()).toBe(0);
    expect(engine.isPlaying).toBe(false);
    listener.mockClear();
    engine.seek(5_000);
    expect(listener).not.toHaveBeenCalled();
  });
});
