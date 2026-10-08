"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Avatar, Button, IconButton, Menu, Textarea, TimestampButton } from "@/components/ui";
import type { MeetingComment } from "@/lib/api";
import { formatRelative } from "@/lib/utils/relative-time";

import { commentBodyError } from "../lib/body";
import { isPending } from "../hooks/useCommentMutations";

export type CommentItemProps = {
  comment: MeetingComment;
  /** Start of the line it is attached to; null for a meeting-level comment. */
  segmentStartMs: number | null;
  isOwn: boolean;
  onSeek: (ms: number) => void;
  onSave: (body: string) => void;
  onDelete: () => void;
};

export function CommentItem({
  comment,
  segmentStartMs,
  isOwn,
  onSeek,
  onSave,
  onDelete,
}: CommentItemProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const pending = isPending(comment);
  const author = comment.author?.name ?? "Former member";
  const error = draft === null ? null : commentBodyError(draft);
  // The two stamps are set separately on create, so only a real gap means an edit.
  const edited = Date.parse(comment.updated_at) - Date.parse(comment.created_at) > 1_000;

  const save = () => {
    if (draft === null || error) return;
    if (draft.trim() !== comment.body) onSave(draft);
    setDraft(null);
  };

  return (
    <li
      data-comment-id={comment.id}
      aria-busy={pending || undefined}
      className="group flex gap-3 px-4 py-3 transition-colors duration-fast hover:bg-surface-hover"
    >
      <Avatar name={author} src={comment.author?.avatar_url ?? undefined} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 truncate text-body-strong text-primary">{author}</span>
          <span className="shrink-0 text-caption text-muted">
            {pending ? "Sending…" : formatRelative(comment.created_at)}
            {edited && !pending && " · edited"}
          </span>
          {segmentStartMs !== null && (
            <TimestampButton
              ms={segmentStartMs}
              onSeek={onSeek}
              className="rounded-tag bg-accent-faint px-1.5 text-caption"
            />
          )}
          {isOwn && !pending && draft === null && (
            <Menu
              trigger={
                <IconButton
                  label="Comment actions"
                  size="sm"
                  tooltip={false}
                  icon={<MoreHorizontal strokeWidth={1.75} />}
                  className="ml-auto opacity-0 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                />
              }
              items={[
                {
                  label: "Edit",
                  icon: <Pencil strokeWidth={1.75} />,
                  onSelect: () => setDraft(comment.body),
                },
                {
                  label: "Delete",
                  icon: <Trash2 strokeWidth={1.75} />,
                  danger: true,
                  onSelect: onDelete,
                },
              ]}
            />
          )}
        </div>
        {draft === null ? (
          <p className="whitespace-pre-wrap break-words text-body text-secondary">{comment.body}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <Textarea
              aria-label="Edit comment"
              value={draft}
              invalid={Boolean(error)}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setDraft(null);
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
              }}
            />
            {error && <p className="text-caption text-danger-strong">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" disabled={Boolean(error)} onClick={save}>
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
