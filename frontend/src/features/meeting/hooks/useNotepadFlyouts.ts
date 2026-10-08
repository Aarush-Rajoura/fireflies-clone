"use client";

import { useCallback, useId, useRef, useState } from "react";

export type NotepadFlyout = "ai" | "soundbites" | "comments" | "bookmarks";

/**
 * Which flyout beside the summary is open. A flyout stays mounted (hidden)
 * after its first opening, so a comment draft or a playing clip's end-watcher
 * survives switching away and back. Closing returns focus to whatever opened
 * it (a rail button, the header's Ask Fred, a comment badge), else to the
 * flyout's rail button.
 */
export function useNotepadFlyouts() {
  const [open, setOpen] = useState<NotepadFlyout | null>(null);
  const [mounted, setMounted] = useState<ReadonlySet<NotepadFlyout>>(() => new Set());
  const [commentFocus, setCommentFocus] = useState<number | null>(null);
  // Bumped on every "comment on this line" request, so the composer takes focus each time.
  const [commentFocusRequest, setCommentFocusRequest] = useState(0);
  const triggers = useRef(new Map<NotepadFlyout, HTMLElement | null>());
  const opener = useRef<HTMLElement | null>(null);
  /** For aria-controls on the toggles of the Ask Fred flyout. */
  const askPanelId = useId();

  const show = useCallback((flyout: NotepadFlyout) => {
    // Called from the opening event, so the focused element is what opened it.
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
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
      setCommentFocusRequest((n) => n + 1);
      show("comments");
    },
    [show],
  );

  const close = useCallback(() => {
    const back = opener.current?.isConnected
      ? opener.current
      : open
        ? triggers.current.get(open)
        : null;
    back?.focus();
    opener.current = null;
    setOpen(null);
  }, [open]);

  /** Ref for the rail button of `flyout`, where focus goes back on close. */
  const triggerRef = useCallback(
    (flyout: NotepadFlyout) => (el: HTMLElement | null) => {
      triggers.current.set(flyout, el);
    },
    [],
  );

  const clearCommentFocus = useCallback(() => setCommentFocus(null), []);

  return {
    open,
    mounted,
    askPanelId,
    show,
    toggle,
    close,
    triggerRef,
    commentFocus,
    commentFocusRequest,
    focusComments,
    clearCommentFocus,
  };
}

export type NotepadFlyouts = ReturnType<typeof useNotepadFlyouts>;
