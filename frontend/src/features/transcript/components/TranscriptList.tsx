"use client";

import { useCallback, useMemo, type RefObject } from "react";

import type { HighlightRange } from "@/components/ui";
import { usePlayerClockSelector, usePlayerControls } from "@/features/player";
import type { Segment, Speaker } from "@/lib/api";

import { useFollowPlayhead } from "../hooks/useFollowPlayhead";
import { findActiveSegmentIndex } from "../lib/active-segment";
import type { Match, SegmentMatches } from "../lib/find-matches";
import { speakerTurnStarts } from "../lib/grouping";
import { JumpToCurrent } from "./JumpToCurrent";
import { SegmentRow } from "./SegmentRow";

const NO_RANGES: readonly HighlightRange[] = [];
const NO_MATCHES: ReadonlyMap<number, SegmentMatches> = new Map();

const UNKNOWN_SPEAKER: Speaker = {
  id: -1,
  label: "Unknown speaker",
  name: "Unknown speaker",
  color_index: 7,
  participant_id: null,
};

export type TranscriptListProps = {
  segments: readonly Segment[];
  speakers: readonly Speaker[];
  /** The scroll container; the panel also uses it to bring a search match into view. */
  scrollRef: RefObject<HTMLDivElement | null>;
  onRename: (speakerId: number) => void;
  matches?: ReadonlyMap<number, SegmentMatches>;
  currentMatch?: Match;
  /** Global index of `currentMatch`. */
  currentMatchIndex?: number;
};

/**
 * The scrolling list of lines. Not virtualised: a meeting here has at most a
 * few hundred lines, and memoised rows make a tick cost two row renders, so
 * plain DOM keeps native find, selection and scroll behaviour for free.
 *
 * This is the only transcript component that reads the clock, and it reads
 * just the active index and isPlaying through selectors.
 */
export function TranscriptList({
  segments,
  speakers,
  scrollRef,
  onRename,
  matches = NO_MATCHES,
  currentMatch,
  currentMatchIndex = -1,
}: TranscriptListProps) {
  const { seek } = usePlayerControls();
  const activeIndex = usePlayerClockSelector((c) => findActiveSegmentIndex(segments, c.currentMs));
  const isPlaying = usePlayerClockSelector((c) => c.isPlaying);
  const follow = useFollowPlayhead({ containerRef: scrollRef, activeIndex, isPlaying });
  const { resume } = follow;

  const turnStarts = useMemo(() => speakerTurnStarts(segments), [segments]);
  const speakerById = useMemo(() => new Map(speakers.map((s) => [s.id, s])), [speakers]);

  // Seeking keeps the current play state, as Fireflies does; a click also means "follow from here".
  const onSeek = useCallback(
    (ms: number) => {
      seek(ms);
      resume();
    },
    [seek, resume],
  );

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        tabIndex={0}
        aria-label="Transcript lines"
        className="h-full overflow-y-auto pb-16 outline-none focus-visible:shadow-focus"
      >
        {segments.map((segment, i) => {
          const hit = matches.get(i);
          return (
            <SegmentRow
              key={segment.id}
              segment={segment}
              index={i}
              speaker={speakerById.get(segment.speaker_id) ?? UNKNOWN_SPEAKER}
              showHeader={turnStarts[i] ?? true}
              isActive={i === activeIndex}
              ranges={hit?.ranges ?? NO_RANGES}
              activeMatchIndex={
                hit && currentMatch?.segmentIndex === i ? currentMatchIndex - hit.offset : undefined
              }
              onSeek={onSeek}
              onRename={onRename}
            />
          );
        })}
      </div>
      {!follow.following && activeIndex >= 0 && <JumpToCurrent onClick={follow.jumpToCurrent} />}
    </div>
  );
}
