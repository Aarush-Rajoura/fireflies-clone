"use client";

import { memo, type MouseEvent } from "react";

import { Highlighter, TimestampButton, type HighlightRange } from "@/components/ui";
import type { Segment, Speaker } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { formatTimestamp } from "../lib/format-timestamp";
import { SpeakerHeader } from "./SpeakerHeader";

export type SegmentRowProps = {
  segment: Segment;
  index: number;
  speaker: Speaker;
  /** First line of a speaker turn: shows the "Name ▾ · 00:53" header. */
  showHeader: boolean;
  isActive: boolean;
  ranges: readonly HighlightRange[];
  /** Which of `ranges` is the current find match, if it is in this row. */
  activeMatchIndex: number | undefined;
  onSeek: (ms: number) => void;
  onRename: (speakerId: number) => void;
};

/**
 * One transcript line. Memoised and driven only by props, all primitives or
 * stable references, so a playhead tick re-renders just the two rows whose
 * `isActive` flips.
 */
export const SegmentRow = memo(function SegmentRow({
  segment,
  index,
  speaker,
  showHeader,
  isActive,
  ranges,
  activeMatchIndex,
  onSeek,
  onRename,
}: SegmentRowProps) {
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    // Menu items are portalled: their clicks bubble here through React, not the DOM.
    if (!e.currentTarget.contains(e.target as Node)) return;
    if ((e.target as HTMLElement).closest("button")) return;
    // Selecting text to copy it is not a request to jump.
    if (window.getSelection()?.toString()) return;
    onSeek(segment.start_ms);
  };
  const stamp = formatTimestamp(segment.start_ms);

  return (
    <div
      data-segment-index={index}
      data-active={isActive || undefined}
      aria-current={isActive ? "true" : undefined}
      onClick={onClick}
      className={cn(
        // Off-screen rows skip layout/paint; the intrinsic size keeps the scrollbar honest.
        "group relative cursor-pointer border-l-[3px] py-1 pl-3 pr-4 transition-colors duration-fast [contain-intrinsic-size:auto_64px] [content-visibility:auto]",
        showHeader && "mt-3 pt-2",
        isActive ? "border-accent bg-accent-subtle" : "border-transparent hover:bg-surface-hover",
      )}
    >
      {showHeader ? (
        <SpeakerHeader
          speaker={speaker}
          startMs={segment.start_ms}
          onSeek={onSeek}
          onRename={onRename}
        />
      ) : (
        // Continuation lines have no header; their time shows on hover and stays keyboard-reachable.
        <TimestampButton
          ms={segment.start_ms}
          onSeek={onSeek}
          label={`Play from ${stamp}`}
          className="absolute right-3 top-1.5 text-caption text-muted opacity-0 hover:text-accent hover:no-underline focus-visible:opacity-100 group-hover:opacity-100"
        >
          {stamp}
        </TimestampButton>
      )}
      <p className={cn("pl-8 text-transcript text-primary", showHeader ? "mt-1" : "pr-10")}>
        <Highlighter text={segment.text} ranges={ranges} activeIndex={activeMatchIndex} />
      </p>
    </div>
  );
});
