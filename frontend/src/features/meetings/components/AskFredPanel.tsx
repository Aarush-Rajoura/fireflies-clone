"use client";

import {
  Bot,
  Hash,
  Mail,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Sparkles,
  SquareCheckBig,
  Target,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button, IconButton, Tooltip } from "@/components/ui";
import { AskPanel, type AskSuggestion } from "@/features/ask";
import { useMe } from "@/features/user";

import type { ScopedMeetingIds } from "../hooks/useScopedMeetingIds";

export type AskFredPanelProps = {
  /** What a question would be scoped to, e.g. "My Meetings" or "#sales". */
  contextLabel: string;
  /** The meetings questions search; questions wait until it is ready. */
  scope: ScopedMeetingIds;
};

const SUGGESTIONS: readonly AskSuggestion[] = [
  {
    label: "My action items",
    question: "What are my action items?",
    icon: <SquareCheckBig strokeWidth={1.75} className="text-success" />,
  },
  {
    label: "Key decisions",
    question: "What were the key decisions?",
    icon: <Target strokeWidth={1.75} className="text-danger" />,
  },
];

/** Disabled controls swallow pointer events, so the tooltip hangs on a focusable wrapper. */
function Soon({ children }: { children: ReactNode }) {
  return (
    <Tooltip content="Coming soon" side="top">
      <span
        tabIndex={0}
        className="inline-flex rounded-control outline-none focus-visible:shadow-focus"
      >
        {children}
      </span>
    </Tooltip>
  );
}

/** Two tilted white tiles standing in for chat and mail apps (drawn, not real logos). */
function ConnectTiles() {
  return (
    <span aria-hidden className="relative flex h-11 w-[60px] shrink-0">
      <span className="absolute left-0 top-1.5 flex size-9 -rotate-6 items-center justify-center rounded-item bg-on-accent shadow-raised">
        <Hash strokeWidth={2.5} className="size-5 text-accent" />
      </span>
      <span className="absolute right-0 top-0 flex size-9 rotate-6 items-center justify-center rounded-item bg-on-accent shadow-raised">
        <Mail strokeWidth={2.25} className="size-5 text-danger" />
      </span>
    </span>
  );
}

/**
 * The right-hand Ask Fred column: a conversation over the meetings in the
 * current view. "New chat" remounts the conversation; history is not kept.
 */
export function AskFredPanel({ contextLabel, scope: scoped }: AskFredPanelProps) {
  const [open, setOpen] = useState(true);
  const [banner, setBanner] = useState(true);
  const [chat, setChat] = useState(0);
  const me = useMe();
  const firstName = me.data?.name.split(" ")[0];
  // Keyed by content, so a refetch of the same page doesn't hand AskPanel a new scope.
  const idsKey = scoped.meetingIds?.join(",");
  const scope = useMemo(
    () => ({
      meetingIds: idsKey === undefined ? undefined : idsKey.split(",").filter(Boolean).map(Number),
    }),
    [idsKey],
  );

  if (!open) {
    return (
      <aside
        aria-label="Ask Fred"
        className="hidden w-12 shrink-0 justify-center border-l border-subtle pt-4 xl:flex"
      >
        <IconButton
          label="Open Ask Fred"
          icon={<PanelRightOpen strokeWidth={1.75} />}
          aria-expanded={false}
          onClick={() => setOpen(true)}
        />
      </aside>
    );
  }

  return (
    <aside
      aria-label="Ask Fred"
      className="hidden w-[400px] shrink-0 flex-col border-l border-subtle bg-surface-0 xl:flex 2xl:w-ask-panel"
    >
      <header className="flex h-[60px] shrink-0 items-center gap-1 border-b border-subtle px-4">
        <Bot aria-hidden strokeWidth={1.75} className="mr-1 size-5 text-accent" />
        <h2 className="flex-1 text-body-strong text-primary">Ask Fred</h2>
        <Soon>
          <IconButton
            label="Chat history"
            size="sm"
            tooltip={false}
            disabled
            icon={<MessageSquare strokeWidth={1.75} />}
          />
        </Soon>
        <IconButton
          label="New chat"
          size="sm"
          icon={<Plus strokeWidth={1.75} />}
          onClick={() => setChat((n) => n + 1)}
        />
        <IconButton
          label="Collapse Ask Fred"
          size="sm"
          icon={<PanelRightClose strokeWidth={1.75} />}
          aria-expanded
          onClick={() => setOpen(false)}
          className="text-muted"
        />
      </header>

      <AskPanel
        key={chat}
        scope={scope}
        disabledReason={
          scoped.status === "loading"
            ? "Loading the meetings in this view…"
            : scoped.status === "error"
              ? "Couldn't load the meetings in this view"
              : undefined
        }
        suggestions={SUGGESTIONS}
        intro={banner && <ConnectBanner onDismiss={() => setBanner(false)} />}
        greeting={
          <>
            <Sparkles aria-hidden strokeWidth={1.75} className="mb-4 size-7 text-success" />
            <p className="text-h2 text-strong">Hi {firstName ?? "there"}!</p>
            <p className="text-h2 text-secondary">Get ready for your meeting</p>
          </>
        }
        contextLabel={
          <>
            <Hash aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0" />
            <span className="truncate">{contextLabel.replace(/^#/, "")}</span>
          </>
        }
        placeholder="Ask Fred about your meetings"
        // Bottom room for the shell's floating help button, which would otherwise cover Send.
        composerClassName="pb-20"
      />
    </aside>
  );
}

function ConnectBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="relative flex flex-col gap-3 rounded-card bg-accent-faint p-4 pr-10">
      <div className="flex items-start gap-4">
        <ConnectTiles />
        <p className="text-body text-secondary">
          <span className="text-body-strong text-primary">Connect Slack and Gmail</span> — get
          answers with full context.
        </p>
      </div>
      <div className="flex justify-end">
        <Soon>
          <Button variant="ghost" size="sm" disabled className="text-accent">
            Connect
          </Button>
        </Soon>
      </div>
      <IconButton
        label="Dismiss"
        size="sm"
        tooltip={false}
        icon={<X strokeWidth={1.75} />}
        onClick={onDismiss}
        className="absolute right-2 top-2 size-7"
      />
    </div>
  );
}
