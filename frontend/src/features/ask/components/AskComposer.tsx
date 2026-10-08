"use client";

import { ArrowUp } from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";

import { IconButton, Textarea } from "@/components/ui";

export type AskComposerProps = {
  /** Returns whether the question was accepted, so the draft is kept when it wasn't. */
  onSend: (question: string) => boolean;
  pending: boolean;
  /** Nothing can be typed or sent, e.g. while the question's scope is loading. */
  disabled?: boolean;
  placeholder?: string;
  /** A chip naming what questions are scoped to, e.g. "# My Meetings". */
  contextLabel?: ReactNode;
};

/** Enter sends, Shift+Enter breaks the line. */
export function AskComposer({
  onSend,
  pending,
  disabled = false,
  placeholder = "Ask Fred a question",
  contextLabel,
}: AskComposerProps) {
  const [draft, setDraft] = useState("");
  const canSend = draft.trim().length > 0 && !pending && !disabled;

  const submit = () => {
    if (canSend && onSend(draft)) setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // An IME confirming a character also fires Enter; that must not send.
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    submit();
  };

  return (
    <div className="flex flex-col gap-2 rounded-card border border-subtle bg-surface-1 p-3 focus-within:border-accent-border">
      {contextLabel && (
        <span className="inline-flex w-fit max-w-full items-center gap-1 truncate rounded-item bg-surface-3 px-2 py-1 text-meta text-secondary">
          {contextLabel}
        </span>
      )}
      <Textarea
        aria-label="Ask Fred a question"
        placeholder={placeholder}
        rows={2}
        value={draft}
        disabled={disabled}
        maxLength={1000}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        bare
        className="max-h-40 px-1 py-1"
      />
      <div className="flex items-center justify-end">
        <IconButton
          label="Send"
          size="sm"
          variant="primary"
          tooltip={false}
          disabled={!canSend}
          icon={<ArrowUp strokeWidth={1.75} />}
          onClick={submit}
        />
      </div>
    </div>
  );
}
