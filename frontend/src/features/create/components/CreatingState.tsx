"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

import { Spinner } from "@/components/ui";

/** Shown while POST /meetings runs; with a transcript the AI notes take several seconds. */
export function CreatingState({ withNotes }: { withNotes: boolean }) {
  // The form that held focus is hidden while this shows; without this, focus drops to <body>.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-3 px-6 py-12 text-center outline-none"
    >
      <span className="relative flex size-12 items-center justify-center rounded-full bg-accent-subtle text-accent">
        <Sparkles className="size-5" strokeWidth={1.75} />
        <Spinner className="absolute inset-0 size-12 text-accent" label="Working" />
      </span>
      <p className="text-h3 text-strong">
        {withNotes ? "Fred is writing your notes…" : "Creating your meeting…"}
      </p>
      {withNotes && (
        <p className="max-w-sm text-body text-secondary">
          Reading the transcript, drafting a summary and pulling out action items. This can take a
          few seconds.
        </p>
      )}
    </div>
  );
}
