"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button, Spinner } from "@/components/ui";
import { describeAskError } from "@/features/ask";
import type { ChatMessage, ChatMessageCreate } from "@/lib/api";

import { Composer } from "./Composer";
import { MessageItem } from "./MessageItem";

export type ConversationProps = {
  messages: ChatMessage[];
  pending: boolean;
  /** The last send's failure and what was sent, so it can be retried as-is. */
  failure: { error: unknown; body: ChatMessageCreate } | null;
  onSend: (body: ChatMessageCreate) => boolean;
};

/** The thread, kept scrolled to the newest turn, with the composer docked below. */
export function Conversation({ messages, pending, failure, onSend }: ConversationProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const problem = failure ? describeAskError(failure.error) : null;

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length, pending, failure]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          role="log"
          aria-label="Conversation"
          aria-live="polite"
          className="mx-auto flex w-full max-w-[770px] flex-col gap-6 px-6 py-8"
        >
          {messages.map((m) => (
            <MessageItem key={m.id} message={m} />
          ))}
          {pending && (
            <p className="flex items-center gap-2 text-meta text-muted">
              <Spinner />
              Fred is thinking…
            </p>
          )}
          {failure && problem && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-card border border-subtle bg-danger-subtle p-3 text-body text-danger-strong"
            >
              <AlertCircle aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
              <p className="min-w-0 flex-1">
                Couldn&apos;t send “{failure.body.question}”. {problem.message}
              </p>
              {problem.retryable && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSend(failure.body)}
                  className="-my-1 shrink-0"
                >
                  Retry
                </Button>
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[770px] shrink-0 px-6 pb-4">
        <Composer onSubmit={onSend} pending={pending} menuPlacement="above" autoFocus />
        <p className="pt-2 text-center text-caption text-muted">Consumes AI credits</p>
      </div>
    </div>
  );
}
