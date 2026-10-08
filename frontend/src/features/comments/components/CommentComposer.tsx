"use client";

import { Clock } from "lucide-react";
import { useState } from "react";

import { Button, Chip, Textarea, formatTimestamp } from "@/components/ui";

import { MAX_COMMENT_LENGTH, commentBodyError } from "../lib/body";

export type ComposerAnchor = { segmentId: number; startMs: number };

export type CommentComposerProps = {
  /** The line a comment would be attached to (the focused line, else the playhead's). */
  anchor: ComposerAnchor | null;
  /** Resolves when stored; rejects to keep the draft for another try. */
  onSubmit: (body: string, segmentId: number | null) => Promise<unknown>;
};

export function CommentComposer({ anchor, onSubmit }: CommentComposerProps) {
  const [body, setBody] = useState("");
  const [attach, setAttach] = useState(true);
  const [touched, setTouched] = useState(false);
  const error = commentBodyError(body);
  // An empty box is not an error until the user tries to send it.
  const shownError = touched || body.length > 0 ? error : null;
  const remaining = MAX_COMMENT_LENGTH - body.trim().length;

  const submit = async () => {
    setTouched(true);
    if (error) return;
    // The comment shows optimistically, so the box clears at once; a failure hands the text back.
    const text = body;
    setBody("");
    setTouched(false);
    try {
      await onSubmit(text, attach && anchor ? anchor.segmentId : null);
    } catch {
      setBody((current) => current || text);
    }
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Textarea
        aria-label="Add a comment"
        placeholder="Add a comment…"
        rows={2}
        value={body}
        invalid={Boolean(shownError) && body.length > 0}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
      />
      {shownError && (
        <p role="alert" className="text-caption text-danger-strong">
          {shownError}
        </p>
      )}
      <div className="flex items-center gap-2">
        {anchor && (
          <Chip
            selected={attach}
            onClick={() => setAttach((a) => !a)}
            icon={<Clock strokeWidth={1.75} />}
            aria-label={
              attach
                ? `Attached to ${formatTimestamp(anchor.startMs)}; click to comment on the whole meeting`
                : `Attach to ${formatTimestamp(anchor.startMs)}`
            }
            className="h-btn-sm px-2 text-caption"
          >
            <span className="tnum">{formatTimestamp(anchor.startMs)}</span>
          </Chip>
        )}
        {remaining < 200 && (
          <span className="tnum text-caption text-muted" aria-live="polite">
            {remaining}
          </span>
        )}
        <Button type="submit" size="sm" variant="primary" className="ml-auto">
          Comment
        </Button>
      </div>
    </form>
  );
}
