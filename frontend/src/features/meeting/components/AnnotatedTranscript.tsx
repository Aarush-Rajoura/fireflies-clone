"use client";

import { useCallback, useRef, useState, type Ref } from "react";

import {
  HighlightEditor,
  SelectionToolbar,
  useHighlightEditor,
  useHighlightRanges,
  type SegmentSelection,
} from "@/features/annotations";
import { CommentCountBadge, useCommentCounts } from "@/features/comments";
import {
  CreateSoundbiteModal,
  clipRangeForSegment,
  type SoundbiteDraft,
} from "@/features/soundbites";
import { TranscriptPanel, type TranscriptPanelHandle } from "@/features/transcript";
import type { MeetingDetail, Segment } from "@/lib/api";

/** Long selections make poor titles; the modal lets the user edit this. */
const TITLE_FROM_SELECTION = 120;

export type AnnotatedTranscriptProps = {
  meeting: MeetingDetail;
  segments: readonly Segment[];
  handleRef?: Ref<TranscriptPanelHandle>;
  /** Open the comments thread of one line (a badge, or Comment on a selection). */
  onCommentLine: (segmentId: number) => void;
  onSoundbiteCreated: () => void;
};

/**
 * The transcript with highlights, comment badges and the selection toolbar
 * composed in through its slots, so the transcript feature itself knows
 * nothing about annotations.
 */
export function AnnotatedTranscript({
  meeting,
  segments,
  handleRef,
  onCommentLine,
  onSoundbiteCreated,
}: AnnotatedTranscriptProps) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const highlights = useHighlightRanges(meeting.id);
  const editor = useHighlightEditor();
  const counts = useCommentCounts(meeting.id);
  const [draft, setDraft] = useState<SoundbiteDraft | null>(null);

  // New identity only when the counts change, so playhead ticks keep re-rendering just two rows.
  const renderDecorations = useCallback(
    (segment: Segment) => {
      const count = counts.get(segment.id);
      return count ? (
        <CommentCountBadge count={count} onClick={() => onCommentLine(segment.id)} />
      ) : null;
    },
    [counts, onCommentLine],
  );

  const clip = (selection: SegmentSelection) => {
    const range = clipRangeForSegment(segments, selection.segmentId, meeting.duration_ms);
    if (!range) return;
    const title =
      selection.text.length > TITLE_FROM_SELECTION
        ? `${selection.text.slice(0, TITLE_FROM_SELECTION - 1).trimEnd()}…`
        : selection.text;
    setDraft({ ...range, title });
  };

  return (
    <div ref={scopeRef} className="h-full min-h-0">
      <TranscriptPanel
        meetingId={meeting.id}
        handleRef={handleRef}
        highlights={highlights}
        onHighlightClick={editor.open}
        renderSegmentDecorations={renderDecorations}
      />
      <SelectionToolbar
        meetingId={meeting.id}
        scopeRef={scopeRef}
        onComment={(s) => onCommentLine(s.segmentId)}
        onCreateSoundbite={clip}
      />
      <HighlightEditor
        meetingId={meeting.id}
        target={editor.target}
        onClose={editor.close}
        onReposition={editor.reposition}
      />
      <CreateSoundbiteModal
        meetingId={meeting.id}
        durationMs={meeting.duration_ms}
        draft={draft}
        onClose={() => setDraft(null)}
        onCreated={onSoundbiteCreated}
      />
    </div>
  );
}
