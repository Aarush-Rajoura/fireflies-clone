"use client";

import { usePlayerControls } from "@/features/player";

import { formatChapterTime, type Chapter } from "../lib/chapters";
import { SummarySection, TimestampButton } from "./SummarySection";

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
                label={formatChapterTime(c.startMs)}
                title={c.title}
                onClick={() => seek(c.startMs ?? 0)}
              />
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
