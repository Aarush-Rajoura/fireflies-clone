"use client";

import { MessageSquare } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import {
  Chip,
  ConfirmDialog,
  EmptyState,
  SidePanel,
  SkeletonRow,
  formatTimestamp,
} from "@/components/ui";
import { usePlayerClockSelector, usePlayerControls } from "@/features/player";
import { findActiveSegmentIndex } from "@/features/transcript";
import { useMe } from "@/features/user";
import type { Segment } from "@/lib/api";

import { useComments } from "../hooks/useComments";
import { useCreateComment, useDeleteComment, useUpdateComment } from "../hooks/useCommentMutations";
import { CommentComposer, type ComposerAnchor } from "./CommentComposer";
import { CommentItem } from "./CommentItem";

export type CommentsPanelProps = {
  meetingId: number;
  segments: readonly Segment[];
  /** Show only this line's thread, and attach new comments to it. */
  focusSegmentId?: number | null;
  /** Changes on each "comment on this line" request; the composer takes focus each time. */
  focusRequest?: number;
  onClearFocus?: () => void;
  onClose: () => void;
};

/** The comments flyout: the meeting's thread, oldest first, with a composer pinned underneath. */
export function CommentsPanel({
  meetingId,
  segments,
  focusSegmentId = null,
  focusRequest = 0,
  onClearFocus,
  onClose,
}: CommentsPanelProps) {
  const query = useComments(meetingId);
  const me = useMe().data;
  const create = useCreateComment(meetingId);
  const update = useUpdateComment(meetingId);
  const remove = useDeleteComment(meetingId);
  const { seek } = usePlayerControls();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const startById = useMemo(() => new Map(segments.map((s) => [s.id, s.start_ms])), [segments]);
  // An index, so the panel re-renders only when the playhead crosses into another line.
  const activeIndex = usePlayerClockSelector((c) => findActiveSegmentIndex(segments, c.currentMs));
  const anchor = useMemo<ComposerAnchor | null>(() => {
    const id = focusSegmentId ?? segments[activeIndex]?.id;
    const startMs = id === undefined ? undefined : startById.get(id);
    return id === undefined || startMs === undefined ? null : { segmentId: id, startMs };
  }, [focusSegmentId, segments, activeIndex, startById]);

  const all = query.data ?? [];
  const shown = focusSegmentId === null ? all : all.filter((c) => c.segment_id === focusSegmentId);
  const focusStart = focusSegmentId === null ? undefined : startById.get(focusSegmentId);

  const submit = async (body: string, segmentId: number | null) => {
    await create.mutateAsync({ body, segment_id: segmentId });
    listRef.current?.lastElementChild?.scrollIntoView?.({ block: "nearest" });
  };

  let body;
  if (query.isPending) {
    body = (
      <div role="status" aria-label="Loading comments" className="flex flex-col gap-3 p-4">
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  } else if (query.isError) {
    body = <EmptyState title="Couldn't load comments" description={query.error.message} />;
  } else if (shown.length === 0) {
    body = (
      <EmptyState
        icon={<MessageSquare strokeWidth={1.75} />}
        title={focusSegmentId === null ? "No comments yet" : "No comments on this line"}
        description="Select transcript text and choose Comment, or write one below."
      />
    );
  } else {
    body = (
      <ul ref={listRef} aria-label="Comments" className="flex flex-col py-1">
        {shown.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            segmentStartMs={c.segment_id === null ? null : (startById.get(c.segment_id) ?? null)}
            isOwn={me !== undefined && c.author?.id === me.id}
            onSeek={seek}
            onSave={(text) => update.mutate({ id: c.id, body: text })}
            onDelete={() => setDeletingId(c.id)}
          />
        ))}
      </ul>
    );
  }

  return (
    <SidePanel
      title="Comments"
      meta={all.length}
      onClose={onClose}
      footer={<CommentComposer anchor={anchor} focusRequest={focusRequest} onSubmit={submit} />}
    >
      {focusStart !== undefined && (
        <div className="px-4 pt-3">
          <Chip selected onRemove={onClearFocus} className="h-btn-sm text-caption">
            Line at {formatTimestamp(focusStart)}
          </Chip>
        </div>
      )}
      {body}
      <ConfirmDialog
        open={deletingId !== null}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete comment?"
        description="It will be removed for everyone in this meeting."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deletingId !== null) remove.mutate(deletingId);
          setDeletingId(null);
        }}
      />
    </SidePanel>
  );
}
