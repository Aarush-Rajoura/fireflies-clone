"use client";

import type { ReactNode } from "react";

import { Chip } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import type { AskScope } from "../api";
import { useAsk } from "../hooks/useAsk";
import { AskComposer } from "./AskComposer";
import { AskMessages } from "./AskMessages";

export type AskSuggestion = { label: string; question: string; icon?: ReactNode };

export type AskPanelProps = {
  /** One meeting (citations seek this page's player) or a set of meetings (citations link out). */
  scope: AskScope;
  /** Shown until the first question. */
  greeting: ReactNode;
  /** One-tap questions under the greeting. */
  suggestions?: readonly AskSuggestion[];
  /** Above the greeting in the empty state, e.g. a banner. */
  intro?: ReactNode;
  contextLabel?: ReactNode;
  placeholder?: string;
  /** Set while questions can't be asked yet; shown in the composer, which is disabled. */
  disabledReason?: string;
  className?: string;
  composerClassName?: string;
};

/**
 * A self-contained Ask Fred conversation: greeting and suggestions, then the
 * messages, with the composer pinned below. Remount it (change its `key`) to
 * start a new chat.
 */
export function AskPanel({
  scope,
  greeting,
  suggestions = [],
  intro,
  contextLabel,
  placeholder,
  disabledReason,
  className,
  composerClassName,
}: AskPanelProps) {
  const chat = useAsk(scope);
  const started = chat.messages.length > 0 || chat.pending || chat.error !== null;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        {started ? (
          <AskMessages
            messages={chat.messages}
            pending={chat.pending}
            error={chat.error}
            onRetry={chat.retry}
            citationMode={"meetingId" in scope ? "seek" : "link"}
          />
        ) : (
          <>
            {intro}
            <div className="flex flex-col gap-1 pt-12">{greeting}</div>
            {suggestions.length > 0 && (
              <div
                role="group"
                aria-label="Suggested questions"
                className="mt-auto flex flex-col items-start gap-3 pt-10"
              >
                {suggestions.map((s) => (
                  <Chip
                    key={s.label}
                    icon={s.icon}
                    disabled={disabledReason !== undefined}
                    onClick={() => chat.send(s.question)}
                  >
                    {s.label}
                  </Chip>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className={cn("shrink-0 px-4 pb-4", composerClassName)}>
        <AskComposer
          onSend={chat.send}
          pending={chat.pending}
          placeholder={disabledReason ?? placeholder}
          disabled={disabledReason !== undefined}
          contextLabel={contextLabel}
        />
      </div>
    </div>
  );
}
