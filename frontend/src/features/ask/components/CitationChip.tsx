"use client";

import { ArrowUpRight, Quote } from "lucide-react";
import Link from "next/link";

import { TimestampButton, formatTimestamp } from "@/components/ui";
import { usePlayerControls } from "@/features/player";
import type { AskCitation } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

export type CitationMode = "seek" | "link";

export type CitationChipProps = {
  citation: AskCitation;
  /** `seek` moves this page's player (needs a PlayerProvider); `link` opens the meeting there. */
  mode: CitationMode;
};

const chip =
  "inline-flex max-w-full items-center gap-1.5 rounded-item border border-subtle bg-surface-2 px-2 py-1 text-meta";

export function CitationChip({ citation, mode }: CitationChipProps) {
  return mode === "seek" ? (
    <SeekCitation citation={citation} />
  ) : (
    <LinkCitation citation={citation} />
  );
}

function SeekCitation({ citation }: { citation: AskCitation }) {
  const { seek } = usePlayerControls();
  const clock = formatTimestamp(citation.start_ms);
  return (
    <span className={chip}>
      <TimestampButton
        ms={citation.start_ms}
        onSeek={seek}
        label={`Jump to ${clock}: ${citation.quote}`}
      />
      <span className="min-w-0 truncate text-secondary" title={citation.quote}>
        {citation.quote}
      </span>
    </span>
  );
}

/** The meeting page's `?t=` is in seconds (decimals allowed, see parseTimeParam), not ms. */
export function citationHref(citation: Pick<AskCitation, "meeting_id" | "start_ms">): string {
  return `/meetings/${citation.meeting_id}?t=${citation.start_ms / 1000}`;
}

function LinkCitation({ citation }: { citation: AskCitation }) {
  const clock = formatTimestamp(citation.start_ms);
  return (
    <Link
      href={citationHref(citation)}
      title={citation.quote}
      aria-label={`${citation.meeting_title} at ${clock}: ${citation.quote}`}
      className={cn(
        chip,
        "group text-secondary outline-none transition-colors duration-fast hover:border-strong hover:text-primary focus-visible:shadow-focus",
      )}
    >
      <Quote aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0 text-muted" />
      <span className="min-w-0 truncate">{citation.meeting_title}</span>
      <span className="tnum shrink-0 text-accent">{clock}</span>
      <ArrowUpRight
        aria-hidden
        strokeWidth={1.75}
        className="size-3.5 shrink-0 text-muted group-hover:text-primary"
      />
    </Link>
  );
}
