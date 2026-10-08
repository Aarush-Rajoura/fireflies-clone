"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { findMatches, matchesBySegment, stepMatch, type Match } from "../lib/find-matches";

/**
 * Find-in-transcript state: the query, its matches and which one is current.
 *
 * It never touches the player. `next`/`prev` RETURN the match they land on, and
 * the caller seeks to it inside the same event handler. Seeking from an effect
 * that watches the current match would freeze playback: every re-render that
 * recreated the match would re-seek the player.
 */
export function useTranscriptFind(segments: readonly { text: string }[]) {
  const [query, setQuery] = useState("");
  // The cursor remembers which query it belongs to, so typing resets it without an effect.
  const [cursor, setCursor] = useState({ query: "", index: -1 });
  const deferred = useDeferredValue(query);

  const matches = useMemo(() => findMatches(segments, deferred), [segments, deferred]);
  const bySegment = useMemo(() => matchesBySegment(matches), [matches]);

  const current = cursor.query === deferred && cursor.index < matches.length ? cursor.index : -1;

  const step = (direction: 1 | -1): Match | undefined => {
    const index = stepMatch(current, matches.length, direction);
    setCursor({ query: deferred, index });
    return matches[index];
  };

  return {
    query,
    setQuery,
    matches,
    bySegment,
    /** Index into `matches`, or -1 when none is chosen yet. */
    current,
    currentMatch: matches[current] as Match | undefined,
    next: () => step(1),
    prev: () => step(-1),
    clear: () => {
      setQuery("");
      setCursor({ query: "", index: -1 });
    },
  };
}

export type TranscriptFind = ReturnType<typeof useTranscriptFind>;
