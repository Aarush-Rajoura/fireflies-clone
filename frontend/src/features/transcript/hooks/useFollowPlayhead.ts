"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { isNearEdge, isRowVisible, rowElement, scrollRowIntoView } from "../lib/scroll";

const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]);

type Options = {
  containerRef: RefObject<HTMLElement | null>;
  activeIndex: number;
  isPlaying: boolean;
};

/**
 * Keeps the active line in view, like a karaoke follow.
 *
 * Manual scrolling is detected from its INPUTS (wheel, touch, scroll keys, a
 * scrollbar drag), not from `scroll` events, because our own smooth scrolling
 * fires those too and would switch following off. Once the user scrolls away,
 * following pauses until they press "Jump to current" or click a line.
 *
 * It only scrolls when it has to: while playing, when the active line is
 * off-screen or close to an edge; while paused, only when it is off-screen.
 * A line the user just chose (click, search match) is never re-centred, so it
 * doesn't jump away under the cursor.
 *
 * This scrolls, it never seeks: the player stays the single source of time.
 */
export function useFollowPlayhead({ containerRef, activeIndex, isPlaying }: Options) {
  const [following, setFollowingState] = useState(true);
  // Mirrored in a ref so turning following back on doesn't itself trigger the
  // scroll effect: "Jump to current" scrolls on its own, and a clicked line is already in view.
  const followingRef = useRef(true);
  const setFollowing = useCallback((value: boolean) => {
    followingRef.current = value;
    setFollowingState(value);
  }, []);
  // The line the user just chose; the follow-scroll its activation triggers is skipped.
  const chosenRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const stop = () => setFollowing(false);
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [role='menuitem']")) return;
      if (SCROLL_KEYS.has(e.key)) stop();
    };
    // A press on the container itself (not a row) is a scrollbar drag.
    const onPointerDown = (e: PointerEvent) => {
      if (e.target === el) stop();
    };
    el.addEventListener("wheel", stop, { passive: true });
    el.addEventListener("touchmove", stop, { passive: true });
    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("pointerdown", onPointerDown);
    return () => {
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchmove", stop);
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("pointerdown", onPointerDown);
    };
  }, [containerRef, setFollowing]);

  // Reacts to the active line to SCROLL only (deep links and chapter seeks while
  // paused land here too, which is why off-screen rows are always brought in).
  useEffect(() => {
    const chosen = chosenRef.current;
    chosenRef.current = null;
    const el = containerRef.current;
    if (chosen === activeIndex || !followingRef.current || activeIndex < 0 || !el) return;
    const row = rowElement(el, activeIndex);
    if (!row) return;
    if (isPlaying ? isNearEdge(el, row) : !isRowVisible(el, row)) {
      row.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }
  }, [containerRef, activeIndex, isPlaying]);

  const jumpToCurrent = useCallback(() => {
    setFollowing(true);
    scrollRowIntoView(containerRef.current, activeIndex);
  }, [containerRef, activeIndex, setFollowing]);

  /**
   * Re-enables following after the user chose line `index` (a click, a search
   * match), without re-centring that line: the caller already put it where the user is looking.
   */
  const followFrom = useCallback(
    (index: number) => {
      chosenRef.current = index;
      setFollowing(true);
    },
    [setFollowing],
  );

  return { following, jumpToCurrent, followFrom };
}
