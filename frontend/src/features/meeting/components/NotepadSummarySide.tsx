"use client";

import type { ReactNode } from "react";

import { useComments } from "@/features/comments";
import { useSoundbites } from "@/features/soundbites";
import type { Segment } from "@/lib/api";

import type { NotepadFlyouts } from "../hooks/useNotepadFlyouts";
import { NotepadFlyoutHost } from "./NotepadFlyoutHost";
import { NotepadRail } from "./NotepadRail";

export type NotepadSummarySideProps = {
  meetingId: number;
  segments: readonly Segment[];
  flyouts: NotepadFlyouts;
  onSearch: () => void;
  /** The summary column; it scrolls on its own, beside the fixed rail and flyout. */
  children: ReactNode;
};

/** Left half of the meeting page: tool rail · optional flyout · summary. */
export function NotepadSummarySide({
  meetingId,
  segments,
  flyouts,
  onSearch,
  children,
}: NotepadSummarySideProps) {
  const commentCount = useComments(meetingId).data?.length ?? 0;
  const soundbiteCount = useSoundbites(meetingId).data?.length ?? 0;
  return (
    <div className="flex h-full min-h-0">
      <NotepadRail
        open={flyouts.open}
        onToggle={flyouts.toggle}
        onSearch={onSearch}
        commentCount={commentCount}
        soundbiteCount={soundbiteCount}
      />
      <NotepadFlyoutHost meetingId={meetingId} segments={segments} flyouts={flyouts} />
      {/* `relative`: absolutely positioned descendants (Radix's hidden <select>) scroll with it. */}
      <div className="relative min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
