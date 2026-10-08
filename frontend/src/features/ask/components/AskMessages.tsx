"use client";

import { AlertCircle, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button, Spinner } from "@/components/ui";

import type { AskError, AskMessage } from "../hooks/useAsk";
import { CitationChip, type CitationMode } from "./CitationChip";

export type AskMessagesProps = {
  messages: AskMessage[];
  pending: boolean;
  error: AskError | null;
  onRetry: () => void;
  citationMode: CitationMode;
};

/** The conversation, kept scrolled to the newest turn. */
export function AskMessages({ messages, pending, error, onRetry, citationMode }: AskMessagesProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length, pending, error]);

  return (
    <div role="log" aria-label="Conversation" aria-live="polite" className="flex flex-col gap-4">
      {messages.map((m) =>
        m.role === "user" ? (
          <p
            key={m.id}
            className="max-w-[85%] self-end whitespace-pre-wrap break-words rounded-card bg-surface-3 px-3 py-2 text-body text-primary"
          >
            {m.text}
          </p>
        ) : (
          <AssistantMessage key={m.id} message={m} citationMode={citationMode} />
        ),
      )}
      {pending && (
        <p role="status" className="flex items-center gap-2 text-meta text-muted">
          <Spinner />
          Fred is thinking…
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-card border border-subtle bg-danger-subtle p-3 text-body text-danger-strong"
        >
          <AlertCircle aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
          <p className="min-w-0 flex-1">{error.message}</p>
          {error.retryable && (
            <Button size="sm" variant="ghost" onClick={onRetry} className="-my-1 shrink-0">
              Retry
            </Button>
          )}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

function AssistantMessage({
  message,
  citationMode,
}: {
  message: AskMessage;
  citationMode: CitationMode;
}) {
  return (
    <div className="flex gap-2.5">
      <Sparkles aria-hidden strokeWidth={1.75} className="mt-1 size-4 shrink-0 text-accent" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="whitespace-pre-wrap break-words text-body text-primary">{message.text}</p>
        {message.citations.length > 0 && (
          <ul aria-label="Sources" className="flex flex-col items-start gap-1.5">
            {message.citations.map((c) => (
              <li key={`${c.meeting_id}-${c.segment_id}`} className="max-w-full">
                <CitationChip citation={c} mode={citationMode} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
