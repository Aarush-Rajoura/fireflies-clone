"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { IconButton, SidePanel } from "@/components/ui";
import { MeetingAskPanel } from "@/features/ask";

export type AskFredFlyoutProps = {
  id: string;
  meetingId: number;
  meetingTitle: string;
  active: boolean;
  onClose: () => void;
};

/** The "ai" flyout: the ask feature's meeting conversation, framed like the other flyouts. */
export function AskFredFlyout({
  id,
  meetingId,
  meetingTitle,
  active,
  onClose,
}: AskFredFlyoutProps) {
  const [chat, setChat] = useState(0);
  return (
    <SidePanel
      id={id}
      title="Ask Fred"
      onClose={onClose}
      actions={
        <IconButton
          label="New chat"
          size="sm"
          icon={<Plus strokeWidth={1.75} />}
          onClick={() => setChat((n) => n + 1)}
        />
      }
    >
      <MeetingAskPanel
        key={chat}
        meetingId={meetingId}
        meetingTitle={meetingTitle}
        active={active}
      />
    </SidePanel>
  );
}
