"use client";

import { Bot, ListChecks, Plus, Target, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { IconButton } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import { AskPanel, type AskSuggestion } from "./AskPanel";

export type MeetingAskFlyoutProps = {
  /** For the toggle's aria-controls. */
  id?: string;
  meetingId: number;
  meetingTitle: string;
  open: boolean;
  onClose: () => void;
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
 * Ask Fred about this meeting, as a drawer over the transcript column. It must
 * sit inside the page's PlayerProvider: citations seek the player. Hidden, not
 * unmounted, when closed, so the conversation survives closing and reopening.
 */
export function MeetingAskFlyout({
  id,
  meetingId,
  meetingTitle,
  open,
  onClose,
}: MeetingAskFlyoutProps) {
  const [chat, setChat] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const scope = useMemo(() => ({ meetingId }), [meetingId]);

  useEffect(() => {
    if (open) ref.current?.querySelector("textarea")?.focus();
  }, [open]);

  return (
    <aside
      ref={ref}
      id={id}
      aria-label="Ask Fred about this meeting"
      hidden={!open}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className={cn(
        "absolute inset-y-0 right-0 z-[2] w-full max-w-[440px] flex-col border-l border-subtle bg-surface-0 shadow-overlay",
        open ? "flex animate-fade-in" : "hidden",
      )}
    >
      <header className="flex h-[52px] shrink-0 items-center gap-1 border-b border-subtle px-4">
        <Bot aria-hidden strokeWidth={1.75} className="mr-1 size-5 text-accent" />
        <h2 className="flex-1 text-body-strong text-primary">Ask Fred</h2>
        <IconButton
          label="New chat"
          size="sm"
          icon={<Plus strokeWidth={1.75} />}
          onClick={() => setChat((n) => n + 1)}
        />
        <IconButton
          label="Close Ask Fred"
          size="sm"
          icon={<X strokeWidth={1.75} />}
          onClick={onClose}
        />
      </header>
      <AskPanel
        key={chat}
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
        // Room for the shell's floating help button, which would otherwise cover Send.
        composerClassName="pb-20"
      />
    </aside>
  );
}
