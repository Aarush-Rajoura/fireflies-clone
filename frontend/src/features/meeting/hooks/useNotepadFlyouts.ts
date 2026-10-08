"use client";

import { useCallback, useState } from "react";

export type NotepadFlyout = "ai" | "soundbites" | "comments";

/**
 * Which flyout beside the summary is open. A flyout stays mounted (hidden)
 * after its first opening, so a comment draft or a playing clip's end-watcher
 * survives switching away and back.
 */
export function useNotepadFlyouts() {
  const [open, setOpen] = useState<NotepadFlyout | null>(null);
  const [mounted, setMounted] = useState<ReadonlySet<NotepadFlyout>>(() => new Set());
  const [commentFocus, setCommentFocus] = useState<number | null>(null);

  const show = useCallback((flyout: NotepadFlyout) => {
    setOpen(flyout);
    setMounted((m) => (m.has(flyout) ? m : new Set(m).add(flyout)));
  }, []);

  const toggle = useCallback(
    (flyout: NotepadFlyout) => {
      if (open === flyout) setOpen(null);
      else show(flyout);
    },
    [open, show],
  );

  /** Open the comments on one transcript line, ready to add to its thread. */
  const focusComments = useCallback(
    (segmentId: number) => {
      setCommentFocus(segmentId);
      show("comments");
    },
    [show],
  );

  const close = useCallback(() => setOpen(null), []);
  const clearCommentFocus = useCallback(() => setCommentFocus(null), []);

  return { open, mounted, show, toggle, close, commentFocus, focusComments, clearCommentFocus };
}

export type NotepadFlyouts = ReturnType<typeof useNotepadFlyouts>;
