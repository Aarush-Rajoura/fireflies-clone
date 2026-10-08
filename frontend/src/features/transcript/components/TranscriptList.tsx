"use client";

import {
  useCallback,
  useImperativeHandle,
  useMemo,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";

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
const NO_HIGHLIGHTS: ReadonlyMap<number, readonly HighlightRange[]> = new Map();

const UNKNOWN_SPEAKER: Speaker = {
  id: -1,
  label: "Unknown speaker",
  name: "Unknown speaker",
  color_index: 7,
  participant_id: null,
};

export type TranscriptListHandle = {
  /** The user chose line `index` (e.g. a search match): follow from it without re-centring it. */
  followFrom(index: number): void;
};

export type TranscriptListProps = {
  handleRef?: Ref<TranscriptListHandle>;
  segments: readonly Segment[];
  speakers: readonly Speaker[];
  /** The scroll container; the panel also uses it to bring a search match into view. */
  scrollRef: RefObject<HTMLDivElement | null>;
  onRename: (speakerId: number) => void;
  matches?: ReadonlyMap<number, SegmentMatches>;
  currentMatch?: Match;
  /** Global index of `currentMatch`. */
  currentMatchIndex?: number;
  /** Saved highlights by segment id; ranges carry a `tone`. */
  highlights?: ReadonlyMap<number, readonly HighlightRange[]>;
  onHighlightClick?: (rangeId: string, mark: HTMLElement) => void;
  renderSegmentDecorations?: (segment: Segment) => ReactNode;
};

/**
 * The scrolling list of lines. Deliberately not virtualised: meetings here run
 * to a couple of hundred lines at most, memoised rows make a tick cost two row
 * renders, and rows use `content-visibility: auto` so off-screen lines skip
 * layout and paint. Plain DOM keeps native find, selection and scrollIntoView.
 *
 * This is the only transcript component that reads the clock, and it reads
 * just the active index and isPlaying through selectors.
 */
export function TranscriptList({
  handleRef,
  segments,
  speakers,
  scrollRef,
  onRename,
  matches = NO_MATCHES,
  currentMatch,
  currentMatchIndex = -1,
  highlights = NO_HIGHLIGHTS,
  onHighlightClick,
  renderSegmentDecorations,
}: TranscriptListProps) {
  const { seek } = usePlayerControls();
  const activeIndex = usePlayerClockSelector((c) => findActiveSegmentIndex(segments, c.currentMs));
  const isPlaying = usePlayerClockSelector((c) => c.isPlaying);
  const follow = useFollowPlayhead({ containerRef: scrollRef, activeIndex, isPlaying });
  const { followFrom } = follow;
  useImperativeHandle(handleRef, () => ({ followFrom }), [followFrom]);

  const turnStarts = useMemo(() => speakerTurnStarts(segments), [segments]);
  const speakerById = useMemo(() => new Map(speakers.map((s) => [s.id, s])), [speakers]);
  // Search ranges first, so a row's match indices are unchanged by its highlights.
  // Built once per change of either, so playhead ticks still re-render only two rows.
  const rowRanges = useMemo(
    () =>
      segments.map((segment, i) => {
        const found = matches.get(i)?.ranges ?? NO_RANGES;
        const saved = highlights.get(segment.id) ?? NO_RANGES;
        if (saved.length === 0) return found;
        return found.length === 0 ? saved : [...found, ...saved];
      }),
    [segments, matches, highlights],
  );

  // Seeking keeps the current play state, as Fireflies does; a click also means "follow from here".
  const onSeek = useCallback(
    (ms: number) => {
      followFrom(findActiveSegmentIndex(segments, ms));
      seek(ms);
    },
    [seek, followFrom, segments],
  );

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        tabIndex={0}
        aria-label="Transcript lines"
        className="h-full overflow-y-auto pb-24 outline-none focus-visible:shadow-focus"
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
              ranges={rowRanges[i] ?? NO_RANGES}
              activeMatchIndex={
                hit && currentMatch?.segmentIndex === i ? currentMatchIndex - hit.offset : undefined
              }
              onSeek={onSeek}
              onRename={onRename}
              onHighlightClick={onHighlightClick}
              renderDecorations={renderSegmentDecorations}
            />
          );
        })}
      </div>
      {!follow.following && activeIndex >= 0 && <JumpToCurrent onClick={follow.jumpToCurrent} />}
    </div>
  );
}
