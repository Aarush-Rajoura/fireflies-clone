"use client";

import { Bot, ListChecks, Target } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { AskPanel, type AskSuggestion } from "./AskPanel";

export type MeetingAskPanelProps = {
  meetingId: number;
  meetingTitle: string;
  /** While true (the panel is showing), the question box takes focus. */
  active?: boolean;
};

const SUGGESTIONS: readonly AskSuggestion[] = [
  {
    label: "Summarize this meeting",
    question: "Summarize this meeting in a few sentences.",
    icon: <Bot strokeWidth={1.75} className="text-accent" />,
  },
  {
    label: "Action items",
    question: "What are the action items, and who owns each?",
    icon: <ListChecks strokeWidth={1.75} className="text-success" />,
  },
  {
    label: "Key decisions",
    question: "What were the key decisions?",
    icon: <Target strokeWidth={1.75} className="text-danger" />,
  },
];

/**
 * Ask Fred about this meeting, as plain panel content for the page to frame
 * (the meeting page puts it in a flyout). It must sit inside the page's
 * PlayerProvider: citations seek the player. Remount it (change its `key`) to
 * start a new chat; keep it mounted while hidden to keep the conversation.
 */
export function MeetingAskPanel({ meetingId, meetingTitle, active = false }: MeetingAskPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scope = useMemo(() => ({ meetingId }), [meetingId]);

  useEffect(() => {
    if (active) ref.current?.querySelector("textarea")?.focus();
  }, [active]);

  return (
    <div ref={ref} className="flex h-full min-h-0 flex-col">
      <AskPanel
        scope={scope}
        greeting={
          <>
            <p className="text-h3 text-strong">Ask anything about this meeting</p>
            <p className="text-body text-secondary">
              Answers come from the transcript, with links to the moments they cite.
            </p>
          </>
        }
        suggestions={SUGGESTIONS}
        contextLabel={<span className="truncate">{meetingTitle}</span>}
        placeholder="Ask about this meeting"
      />
    </div>
  );
}
