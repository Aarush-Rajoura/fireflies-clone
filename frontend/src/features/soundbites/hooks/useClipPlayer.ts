"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { usePlayerClockWatch, usePlayerControls } from "@/features/player";

import type { ClipRange } from "../lib/range";

export type PlayableClip = ClipRange & { id: number };

/** A jump bigger than a few clock publishes is the user seeking, not playback advancing. */
const SEEK_JUMP_MS = 1_500;

/**
 * Plays one clip of the meeting: seek to its start, play, and pause at its
 * end. The end is caught by a clock watcher started in `play` (an event
 * handler) and stopped when the clip ends, so nothing seeks from an effect.
 * The watcher also lets go, without pausing, as soon as the user takes over:
 * pausing, seeking elsewhere, or playing another clip.
 */
export function useClipPlayer() {
  const controls = usePlayerControls();
  const watch = usePlayerClockWatch();
  const [playingId, setPlayingId] = useState<number | null>(null);
  const release = useRef<(() => void) | null>(null);

  const play = useCallback(
    (clip: PlayableClip) => {
      release.current?.();
      let done = false;
      let started = false;
      let lastMs = clip.start_ms;
      let unsubscribe = () => {};
      const finish = () => {
        if (done) return;
        done = true;
        unsubscribe();
        if (release.current === finish) release.current = null;
        setPlayingId((id) => (id === clip.id ? null : id));
      };

      controls.seek(clip.start_ms);
      controls.play();
      setPlayingId(clip.id);
      release.current = finish;
      unsubscribe = watch((clock) => {
        const jumped = Math.abs(clock.currentMs - lastMs) > SEEK_JUMP_MS * Math.max(1, clock.rate);
        lastMs = clock.currentMs;
        if (clock.isPlaying) started = true;
        if (!jumped && clock.currentMs >= clip.end_ms) {
          finish();
          controls.pause();
        } else if (jumped || (started && !clock.isPlaying)) {
          finish();
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

  // Only stops watching: the clip's owner is going away, playback is not ours to end.
  useEffect(() => () => release.current?.(), []);

  return { playingId, play, stop };
}
