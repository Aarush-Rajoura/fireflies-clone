"use client";

import { Sparkles } from "lucide-react";
import type { FormEvent } from "react";

import { Button, Field, Textarea } from "@/components/ui";
import type { TranscriptPreview } from "@/lib/api";

import { usePreviewText } from "../hooks/usePreviewText";
import { createErrorMessage } from "../lib/error-messages";
import { SAMPLE_TRANSCRIPT } from "../lib/sample-transcript";

import { InlineError } from "./InlineError";

export type PastePanelProps = {
  /** Lifted to the modal so going back from the preview keeps what was pasted. */
  text: string;
  onTextChange: (text: string) => void;
  onPreview: (preview: TranscriptPreview) => void;
};

export function PastePanel({ text, onTextChange, onPreview }: PastePanelProps) {
  const preview = usePreviewText();
  const empty = text.trim() === "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (empty || preview.isPending) return;
    preview.mutate(text, { onSuccess: onPreview });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field
        label="Transcript"
        htmlFor="paste-transcript"
        hint="WebVTT, SRT, JSON, or one line per turn like “[00:12] Priya: Morning all”."
      >
        <Textarea
          id="paste-transcript"
          rows={10}
          value={text}
          placeholder={"[00:00] Priya: Morning all.\n[00:05] Daniel: Morning!"}
          className="font-mono text-meta"
          onChange={(e) => {
            onTextChange(e.target.value);
            if (preview.isError) preview.reset();
          }}
        />
      </Field>
      {preview.isError && <InlineError message={createErrorMessage(preview.error)} />}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<Sparkles strokeWidth={1.75} />}
          onClick={() => {
            onTextChange(SAMPLE_TRANSCRIPT);
            preview.reset();
          }}
        >
          Load sample
        </Button>
        <Button type="submit" variant="primary" disabled={empty} loading={preview.isPending}>
          Preview transcript
        </Button>
      </div>
    </form>
  );
}
