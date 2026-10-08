import type { AnalyticsOverview, TalkTimeShare } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { assignSpeakerColors, formatDuration, formatPercent } from "../lib/format";
import { ChartEmpty } from "./ChartCard";

// Literal class names so Tailwind can see them; index = speaker colour slot.
const SPEAKER_BG = [
  "bg-speaker-0",
  "bg-speaker-1",
  "bg-speaker-2",
  "bg-speaker-3",
  "bg-speaker-4",
  "bg-speaker-5",
  "bg-speaker-6",
  "bg-speaker-7",
] as const;
const OTHERS_BG = "bg-skeleton";

type Row = TalkTimeShare & { swatch: string };

function withSwatches(participants: TalkTimeShare[]): Row[] {
  const named = participants.filter((p) => !p.is_other);
  const slots = assignSpeakerColors(named.map((p) => p.name));
  let next = 0;
  return participants.map((p) => ({
    ...p,
    swatch: p.is_other ? OTHERS_BG : (SPEAKER_BG[slots[next++] ?? 0] ?? OTHERS_BG),
  }));
}

/** Who did the talking: one 100% bar split by person, with a legend that carries the numbers. */
export function TalkTimeChart({ talk }: { talk: AnalyticsOverview["talk_time"] }) {
  if (talk.total_ms === 0 || talk.participants.length === 0) {
    return <ChartEmpty>No transcribed talk time in this range.</ChartEmpty>;
  }
  const rows = withSwatches(talk.participants);
  const summary = rows.map((r) => `${r.name} ${formatPercent(r.share)}`).join(", ");

  return (
    <div className="flex flex-col gap-5">
      <div
        role="img"
        aria-label={`Share of talk time: ${summary}.`}
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
      >
        {rows.map((r) => (
          <div
            key={r.name}
            title={`${r.name}: ${formatPercent(r.share)} (${formatDuration(r.talk_ms)})`}
            className={cn("h-full min-w-0.5 first:rounded-l-full last:rounded-r-full", r.swatch)}
            style={{ flexGrow: r.talk_ms, flexBasis: 0 }}
          />
        ))}
      </div>
      <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.name} className="flex min-w-0 items-center gap-2.5 text-body">
            <span aria-hidden className={cn("size-2.5 shrink-0 rounded-tag", r.swatch)} />
            <span
              className={cn("min-w-0 flex-1 truncate", r.is_other ? "text-muted" : "text-primary")}
            >
              {r.name}
            </span>
            <span className="tnum shrink-0 text-meta text-muted">{formatDuration(r.talk_ms)}</span>
            <span className="tnum w-10 shrink-0 text-right text-body-strong text-primary">
              {formatPercent(r.share)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
