"use client";

import { TimestampButton } from "@/components/ui";
import { usePlayerControls } from "@/features/player";

import { formatChapterTime, type Chapter } from "../lib/chapters";
import { SummarySection } from "./SummarySection";

export function OutlineSection({
  label,
  chapters,
}: {
  label: string;
  chapters: readonly Chapter[];
}) {
  const { seek } = usePlayerControls();
  if (chapters.length === 0) return null;
  return (
    <SummarySection label={label}>
      <ol className="flex flex-col gap-1.5">
        {chapters.map((c, i) => (
          <li key={i} className="flex items-baseline gap-3 text-body text-primary">
            {c.startMs !== null ? (
              <TimestampButton
                ms={c.startMs}
                onSeek={seek}
                label={`Jump to ${c.title} at ${formatChapterTime(c.startMs)}`}
                className="text-body-strong"
              >
                {formatChapterTime(c.startMs)}
              </TimestampButton>
            ) : (
              <span className="tnum w-10 shrink-0 text-muted" aria-hidden>
                --:--
              </span>
            )}
            <span>{c.title}</span>
          </li>
        ))}
      </ol>
    </SummarySection>
  );
}
