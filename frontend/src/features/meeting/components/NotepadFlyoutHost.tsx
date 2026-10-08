"use client";

import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState, SidePanel } from "@/components/ui";
import { CommentsPanel } from "@/features/comments";
import { SoundbitesPanel } from "@/features/soundbites";
import type { Segment } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import type { NotepadFlyout, NotepadFlyouts } from "../hooks/useNotepadFlyouts";

export type NotepadFlyoutHostProps = {
  meetingId: number;
  segments: readonly Segment[];
  flyouts: NotepadFlyouts;
};

/** The flyout column between the rail and the summary; one panel shows at a time. */
export function NotepadFlyoutHost({ meetingId, segments, flyouts }: NotepadFlyoutHostProps) {
  const { open, mounted, close } = flyouts;
  const slot = (flyout: NotepadFlyout, panel: ReactNode) =>
    mounted.has(flyout) && (
      <div className={cn("h-full", open !== flyout && "hidden")}>{panel}</div>
    );

  return (
    <div className={cn("h-full w-80 shrink-0", open === null && "hidden")}>
      {slot(
        "comments",
        <CommentsPanel
          meetingId={meetingId}
          segments={segments}
          focusSegmentId={flyouts.commentFocus}
          onClearFocus={flyouts.clearCommentFocus}
          onClose={close}
        />,
      )}
      {slot("soundbites", <SoundbitesPanel meetingId={meetingId} onClose={close} />)}
      {slot(
        "ai",
        <SidePanel title="Ask AI" onClose={close}>
          <EmptyState
            icon={<Sparkles strokeWidth={1.75} />}
            title="Ask about this meeting"
            description="Answers grounded in this transcript are coming soon."
          />
        </SidePanel>,
      )}
    </div>
  );
}
