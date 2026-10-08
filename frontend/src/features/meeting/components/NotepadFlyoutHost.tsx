"use client";

import type { ReactNode } from "react";

import { ComingSoon, SidePanel } from "@/components/ui";
import { CommentsPanel } from "@/features/comments";
import { SoundbitesPanel } from "@/features/soundbites";
import type { Segment } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import type { NotepadFlyout, NotepadFlyouts } from "../hooks/useNotepadFlyouts";
import { AskFredFlyout } from "./AskFredFlyout";

export type NotepadFlyoutHostProps = {
  meetingId: number;
  meetingTitle: string;
  segments: readonly Segment[];
  flyouts: NotepadFlyouts;
};

/** The flyout column between the rail and the summary; one panel shows at a time. */
export function NotepadFlyoutHost({
  meetingId,
  meetingTitle,
  segments,
  flyouts,
}: NotepadFlyoutHostProps) {
  const { open, mounted, close } = flyouts;
  const slot = (flyout: NotepadFlyout, panel: ReactNode) =>
    mounted.has(flyout) && (
      <div className={cn("h-full", open !== flyout && "hidden")}>{panel}</div>
    );

  return (
    // Ask Fred gets more room: answers and citations read badly at 320px.
    <div
      className={cn("h-full shrink-0", open === "ai" ? "w-96" : "w-80", open === null && "hidden")}
    >
      {slot(
        "comments",
        <CommentsPanel
          meetingId={meetingId}
          segments={segments}
          focusSegmentId={flyouts.commentFocus}
          focusRequest={flyouts.commentFocusRequest}
          onClearFocus={flyouts.clearCommentFocus}
          onClose={close}
        />,
      )}
      {slot("soundbites", <SoundbitesPanel meetingId={meetingId} onClose={close} />)}
      {slot(
        "ai",
        <AskFredFlyout
          id={flyouts.askPanelId}
          meetingId={meetingId}
          meetingTitle={meetingTitle}
          active={open === "ai"}
          onClose={close}
        />,
      )}
      {slot(
        "bookmarks",
        <SidePanel title="Bookmarks" onClose={close}>
          <div className="p-4">
            <ComingSoon
              title="Bookmarks"
              message="Mark moments to come back to. This is on its way."
            />
          </div>
        </SidePanel>,
      )}
    </div>
  );
}
