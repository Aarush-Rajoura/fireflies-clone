"use client";

import {
  ArrowUp,
  Bot,
  Hash,
  Layers,
  Mail,
  MessageSquare,
  Mic,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Sparkles,
  SquareCheckBig,
  Target,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button, Chip, IconButton, Textarea, Tooltip } from "@/components/ui";
import { useMe } from "@/features/user";

export type AskFredPanelProps = {
  /** What a question would be scoped to, e.g. "My Meetings" or "#sales". */
  contextLabel: string;
};

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
 * The right-hand Ask Fred column. A static shell for now: the layout and
 * entry points are real, the conversation arrives with the Ask API.
 */
export function AskFredPanel({ contextLabel }: AskFredPanelProps) {
  const [open, setOpen] = useState(true);
  const [banner, setBanner] = useState(true);
  const me = useMe();
  const firstName = me.data?.name.split(" ")[0];

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
        <Soon>
          <IconButton
            label="New chat"
            size="sm"
            tooltip={false}
            disabled
            icon={<Plus strokeWidth={1.75} />}
          />
        </Soon>
        <IconButton
          label="Collapse Ask Fred"
          size="sm"
          icon={<PanelRightClose strokeWidth={1.75} />}
          aria-expanded
          onClick={() => setOpen(false)}
          className="text-muted"
        />
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        {banner && (
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
              onClick={() => setBanner(false)}
              className="absolute right-2 top-2 size-7"
            />
          </div>
        )}

        <div className="flex flex-col gap-1 pt-16">
          <Sparkles aria-hidden strokeWidth={1.75} className="mb-4 size-7 text-success" />
          <p className="text-h2 text-strong">Hi {firstName ?? "there"}!</p>
          <p className="text-h2 text-secondary">Get ready for your meeting</p>
        </div>

        <div className="mt-auto flex flex-col items-start gap-3 pt-10">
          <Soon>
            <Chip disabled icon={<SquareCheckBig strokeWidth={1.75} className="text-success" />}>
              My action items
            </Chip>
          </Soon>
          <Soon>
            <Chip disabled icon={<Target strokeWidth={1.75} className="text-danger" />}>
              Key decisions
            </Chip>
          </Soon>
        </div>
      </div>

      {/* Bottom room for the shell's floating help button, which would otherwise cover Send. */}
      <div className="shrink-0 px-4 pb-20">
        <div className="flex flex-col gap-2 rounded-card border border-subtle bg-surface-1 p-3">
          <span className="inline-flex w-fit items-center gap-1 rounded-item bg-surface-3 px-2 py-1 text-meta text-secondary">
            <Hash aria-hidden strokeWidth={1.75} className="size-3.5" />
            {contextLabel.replace(/^#/, "")}
          </span>
          <Textarea
            aria-label="Ask Fred a question"
            placeholder="Ask Fred about your meetings — coming soon"
            rows={2}
            disabled
            className="resize-none border-0 bg-transparent px-1"
          />
          <div className="flex items-center gap-1 text-muted">
            <Soon>
              <IconButton
                label="Attach"
                size="sm"
                tooltip={false}
                disabled
                icon={<Plus strokeWidth={1.75} />}
              />
            </Soon>
            <Soon>
              <IconButton
                label="Sources"
                size="sm"
                tooltip={false}
                disabled
                icon={<Layers strokeWidth={1.75} />}
              />
            </Soon>
            <span className="flex-1" />
            <Soon>
              <IconButton
                label="Dictate"
                size="sm"
                tooltip={false}
                disabled
                icon={<Mic strokeWidth={1.75} />}
              />
            </Soon>
            <Soon>
              <IconButton
                label="Send"
                size="sm"
                variant="primary"
                tooltip={false}
                disabled
                icon={<ArrowUp strokeWidth={1.75} />}
              />
            </Soon>
          </div>
        </div>
      </div>
    </aside>
  );
}
