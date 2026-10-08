"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { usePlayerClockSelector, usePlayerClockWatch, usePlayerControls } from "@/features/player";

import type { ClipRange } from "../lib/range";

export type PlayableClip = ClipRange & { id: number };

/** A jump bigger than a few clock publishes is the user seeking, not playback advancing. */
const SEEK_JUMP_MS = 1_500;

/** The backstop timer fires a little after the expected end, so the watcher normally wins. */
const BACKSTOP_GRACE_MS = 250;

export type ClipPlayerOptions = {
  /** Pause a clip still playing when the owner unmounts (a preview whose modal closes). */
  pauseOnUnmount?: boolean;
};

/**
 * Plays one clip of the meeting: seek to its start, play, and pause at its
 * end. The end is caught by a clock watcher started in `play` (an event
 * handler) and stopped when the clip ends, so nothing seeks from an effect.
 * The watcher also lets go, without pausing, as soon as the user takes over:
 * pausing, seeking elsewhere, or playing another clip.
 *
 * The clock only publishes from animation frames, which a background tab
 * stops; a wall-clock timer armed for the clip's remaining length (at the
 * current rate) is the backstop there, and is cleared with the watcher.
 */
export function useClipPlayer({ pauseOnUnmount = false }: ClipPlayerOptions = {}) {
  const controls = usePlayerControls();
  const watch = usePlayerClockWatch();
  const rate = usePlayerClockSelector((c) => c.rate);
  const rateRef = useRef(rate);
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const release = useRef<(() => void) | null>(null);

  const play = useCallback(
    (clip: PlayableClip) => {
      release.current?.();
      let done = false;
      let started = false;
      let lastMs = clip.start_ms;
      let unsubscribe = () => {};
      let timer: ReturnType<typeof setTimeout> | undefined;
      let armedRate = rateRef.current;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        unsubscribe();
        if (release.current === finish) release.current = null;
        setPlayingId((id) => (id === clip.id ? null : id));
      };
      const end = () => {
        finish();
        controls.pause();
      };
      const arm = (fromMs: number, r: number) => {
        clearTimeout(timer);
        armedRate = r;
        timer = setTimeout(end, Math.max(0, clip.end_ms - fromMs) / r + BACKSTOP_GRACE_MS);
      };

      controls.seek(clip.start_ms);
      controls.play();
      setPlayingId(clip.id);
      release.current = finish;
      arm(clip.start_ms, armedRate);
      unsubscribe = watch((clock) => {
        const jumped = Math.abs(clock.currentMs - lastMs) > SEEK_JUMP_MS * Math.max(1, clock.rate);
        lastMs = clock.currentMs;
        if (clock.isPlaying) started = true;
        if (!jumped && clock.currentMs >= clip.end_ms) {
          end();
        } else if (jumped || (started && !clock.isPlaying)) {
          finish();
        } else if (clock.rate !== armedRate) {
          arm(clock.currentMs, clock.rate);
        }
      });
    },
    [controls, watch],
  );

  const stop = useCallback(() => {
    if (!release.current) return;
    release.current();
    controls.pause();
  }, [controls]);

  // By default only stops watching: the clip's owner is going away, playback is not ours to end.
  useEffect(
    () => () => {
      const active = release.current;
      active?.();
      if (active && pauseOnUnmount) controls.pause();
    },
    [controls, pauseOnUnmount],
  );

  return { playingId, play, stop };
}
